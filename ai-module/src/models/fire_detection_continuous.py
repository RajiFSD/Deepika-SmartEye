"""
Integrated Fire Detection System for 24/7 Surveillance
Runs continuously and sends real-time alerts via HTTP API
"""

import cv2
import numpy as np
import argparse
import json
import sys
import os
import time
import requests
from datetime import datetime
from threading import Thread, Event
import base64

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class FireDetector:
    def __init__(self, sensitivity=60, min_confidence=70):
        self.prev_frames = []
        self.max_frames = 10
        
        # Adjustable parameters based on sensitivity
        self.min_area = max(500, 3000 - (sensitivity * 25))
        self.flicker_threshold = max(10, 40 - (sensitivity // 3))
        self.confidence_threshold = min_confidence / 100.0
        
    def detect_fire(self, frame):
        """Detect fire using color, motion, and flickering patterns"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        blur = cv2.GaussianBlur(frame, (21, 21), 0)
        hsv_blur = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
        
        # Fire color detection
        lower_fire1 = np.array([0, 50, 100])
        upper_fire1 = np.array([35, 255, 255])
        lower_fire2 = np.array([35, 50, 100])
        upper_fire2 = np.array([65, 255, 255])
        
        mask1 = cv2.inRange(hsv_blur, lower_fire1, upper_fire1)
        mask2 = cv2.inRange(hsv_blur, lower_fire2, upper_fire2)
        fire_mask = cv2.bitwise_or(mask1, mask2)
        
        # Brightness check
        _, bright_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
        fire_mask = cv2.bitwise_and(fire_mask, bright_mask)
        
        # Motion/flicker detection
        motion_mask = np.zeros_like(gray)
        
        if len(self.prev_frames) >= 3:
            frame_diff1 = cv2.absdiff(self.prev_frames[-1], gray)
            frame_diff2 = cv2.absdiff(self.prev_frames[-2], gray)
            combined_diff = cv2.bitwise_or(frame_diff1, frame_diff2)
            _, motion_mask = cv2.threshold(combined_diff, self.flicker_threshold, 255, cv2.THRESH_BINARY)
            motion_mask = cv2.dilate(motion_mask, np.ones((5, 5), np.uint8), iterations=2)
        
        # Combine color and motion
        combined_mask = cv2.bitwise_and(fire_mask, motion_mask)
        
        kernel = np.ones((5, 5), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        
        self.prev_frames.append(gray)
        if len(self.prev_frames) > self.max_frames:
            self.prev_frames.pop(0)
        
        # Find contours
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        fire_detected = False
        confidence = 0.0
        detection_boxes = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > self.min_area:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h > 0 else 0
                roi = frame[y:y+h, x:x+w]
                mean_color = cv2.mean(roi)[:3]
                
                feature_score = 0
                if mean_color[2] > mean_color[0]:
                    feature_score += 0.3
                if 1500 < area < 100000:
                    feature_score += 0.2
                if aspect_ratio < 1.5:
                    feature_score += 0.2
                feature_score += 0.3
                
                if feature_score > self.confidence_threshold:
                    fire_detected = True
                    confidence = max(confidence, feature_score)
                    detection_boxes.append((x, y, w, h, feature_score))
        
        return fire_detected, confidence, detection_boxes

class ContinuousFireDetection:
    def __init__(self, stream_url, camera_id, user_id,tenant_id,branch_id, api_url, sensitivity=60, min_confidence=70, output_dir='./alerts'):
        self.stream_url = stream_url
        self.camera_id = camera_id
        self.user_id = user_id
        self.tenant_id = tenant_id
        self.branch_id = branch_id
        self.api_url = api_url
        self.output_dir = output_dir
        self.detector = FireDetector(sensitivity, min_confidence)
        self.stop_event = Event()
        self.alert_cooldown = 0
        self.alert_cooldown_frames = 100  # ~10 seconds at 10fps
        
        os.makedirs(output_dir, exist_ok=True)
        
    def send_alert(self, confidence, snapshot_path, boxes):
        """Send fire alert to backend API"""
        try:
            # Read and encode image
            with open(snapshot_path, 'rb') as img_file:
                img_base64 = base64.b64encode(img_file.read()).decode('utf-8')
            
            alert_data = {
                'camera_id': self.camera_id,
                'user_id': self.user_id,
                'tenant_id': self.tenant_id,
                'branch_id': self.branch_id,
                'timestamp': datetime.now().isoformat(),
                'confidence': float(confidence),
                'snapshot_path': snapshot_path,
                'snapshot_base64': img_base64,
                'bounding_boxes': [[int(x), int(y), int(w), int(h)] for x, y, w, h, _ in boxes],
                'status': 'active'
            }
            
            response = requests.post(
                f'{self.api_url}/fire-detection/alert',
                json=alert_data,
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"[OK] Alert sent successfully for camera {self.camera_id}")
            else:
                print(f"[ERROR] Failed to send alert: {response.status_code}")
                
        except Exception as e:
            print(f"[ERROR] Error sending alert: {e}")
    
    def send_heartbeat(self, frames_processed):
        """Send heartbeat to backend to keep detection status active"""
        try:
            requests.post(
                f'{self.api_url}/fire-detection/heartbeat',
                json={
                    'camera_id': self.camera_id,
                    'user_id': self.user_id,
                    'tenant_id': self.tenant_id,
                    'branch_id': self.branch_id,
                    'timestamp': datetime.now().isoformat(),
                    'frames_processed': frames_processed,
                    'status': 'running'
                },
                timeout=3
            )
        except:
            pass  # Silently fail heartbeats
    
    def annotate_frame(self, frame, detected, confidence, boxes):
        """Add fire detection overlay to frame"""
        annotated = frame.copy()
        
        if detected:
            # Draw red border
            h, w = annotated.shape[:2]
            cv2.rectangle(annotated, (0, 0), (w-1, h-1), (0, 0, 255), 10)
            
            # Draw detection boxes
            for (x, y, box_w, box_h, score) in boxes:
                cv2.rectangle(annotated, (x, y), (x+box_w, y+box_h), (0, 0, 255), 3)
                cv2.putText(annotated, f'FIRE: {score:.0%}', (x, y-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)
            
            # Draw status banner
            banner_h = 60
            overlay = annotated.copy()
            cv2.rectangle(overlay, (0, 0), (w, banner_h), (0, 0, 255), -1)
            cv2.addWeighted(overlay, 0.7, annotated, 0.3, 0, annotated)
            
            cv2.putText(annotated, f'FIRE DETECTED - {confidence:.0%}', 
                       (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
        
        return annotated
    
    def run(self):
        """Main detection loop"""
        print(f"[FIRE] Starting fire detection for camera {self.camera_id}")
        print(f"[STREAM] Attempting to connect to: {self.stream_url}")
        
        # Configure OpenCV with timeout settings
        os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;udp|timeout;5000000'
        
        # Try to connect with retries
        max_retries = 3
        retry_count = 0
        cap = None
        
        while retry_count < max_retries and not self.stop_event.is_set():
            print(f"[CONNECT] Attempt {retry_count + 1}/{max_retries}...")
            
            cap = cv2.VideoCapture(self.stream_url)
            
            # Set shorter timeout for connection
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)  # 10 seconds
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)  # 10 seconds
            
            if cap.isOpened():
                # Try to read one frame to verify stream works
                ret, test_frame = cap.read()
                if ret and test_frame is not None:
                    print(f"[OK] Connected successfully! Frame size: {test_frame.shape}")
                    break
                else:
                    print(f"[ERROR] Stream opened but cannot read frames")
                    cap.release()
                    cap = None
            else:
                print(f"[ERROR] Failed to open stream")
                cap = None
            
            retry_count += 1
            if retry_count < max_retries:
                print(f"[RETRY] Waiting 5 seconds before retry...")
                time.sleep(5)
        
        if cap is None or not cap.isOpened():
            print(f"[ERROR] Failed to connect after {max_retries} attempts")
            print(f"[ERROR] Stream URL: {self.stream_url}")
            print(f"[ERROR] Please verify:")
            print(f"  1. Camera is powered on and connected to network")
            print(f"  2. Stream URL is correct")
            print(f"  3. Camera is accessible from this server")
            print(f"  4. No firewall blocking the connection")
            return 1
        
        print(f"[OK] Monitoring started. Watching for fire 24/7...")
        
        frame_count = 0
        last_heartbeat = time.time()
        consecutive_failures = 0
        max_consecutive_failures = 10
        
        while not self.stop_event.is_set():
            ret, frame = cap.read()
            
            if not ret or frame is None:
                consecutive_failures += 1
                print(f"[WARNING] Failed to read frame ({consecutive_failures}/{max_consecutive_failures})")
                
                if consecutive_failures >= max_consecutive_failures:
                    print(f"[ERROR] Too many consecutive failures. Attempting reconnection...")
                    cap.release()
                    time.sleep(5)
                    
                    # Try to reconnect
                    cap = cv2.VideoCapture(self.stream_url)
                    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
                    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)
                    
                    if cap.isOpened():
                        consecutive_failures = 0
                        print(f"[OK] Reconnected successfully")
                    else:
                        print(f"[ERROR] Reconnection failed. Retrying in 10 seconds...")
                        time.sleep(10)
                
                time.sleep(0.5)
                continue
            
            # Reset failure counter on successful read
            consecutive_failures = 0
            frame_count += 1
            
            # Detect fire
            detected, confidence, boxes = self.detector.detect_fire(frame)
            
            # Handle detection
            if detected and self.alert_cooldown == 0:
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                snapshot_path = os.path.join(
                    self.output_dir, 
                    f'fire_{self.camera_id}_{timestamp}.jpg'
                )
                
                # Annotate and save
                annotated_frame = self.annotate_frame(frame, detected, confidence, boxes)
                cv2.imwrite(snapshot_path, annotated_frame)
                
                # Send alert to backend
                self.send_alert(confidence, snapshot_path, boxes)
                
                print(f"[FIRE] FIRE DETECTED! Confidence: {confidence:.0%} | Camera: {self.camera_id}")
                
                # Set cooldown
                self.alert_cooldown = self.alert_cooldown_frames
            
            if self.alert_cooldown > 0:
                self.alert_cooldown -= 1
            
            # Send heartbeat every 10 seconds
            if time.time() - last_heartbeat > 10:
                self.send_heartbeat(frame_count)
                last_heartbeat = time.time()
            
            # Small delay to reduce CPU
            time.sleep(0.05)  # ~20 FPS
        
        cap.release()
        print(f"[STOP] Fire detection stopped for camera {self.camera_id}")
        return 0
    
    def stop(self):
        """Stop detection gracefully"""
        self.stop_event.set()

def main():
    parser = argparse.ArgumentParser(description='Continuous Fire Detection System')
    parser.add_argument('--stream-url', required=True, help='Camera stream URL')
    parser.add_argument('--camera-id', required=True, help='Camera ID')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--tenant-id', required=True, help='Tenant ID')
    parser.add_argument('--branch-id', required=True, help='Branch ID')
    parser.add_argument('--api-url', default='http://localhost:3000/api', help='Backend API URL')
    parser.add_argument('--sensitivity', type=int, default=60, help='Detection sensitivity (0-100)')
    parser.add_argument('--min-confidence', type=int, default=70, help='Minimum confidence threshold (50-100)')
    parser.add_argument('--output-dir', default='./alerts', help='Output directory for snapshots')
    
    args = parser.parse_args()
    
    detection = ContinuousFireDetection(
        stream_url=args.stream_url,
        camera_id=args.camera_id,
        user_id=args.user_id,        # ✅ Add these
        tenant_id=args.tenant_id,    # ✅ Add these
        branch_id=args.branch_id,    # ✅ Add these
        api_url=args.api_url,
        sensitivity=args.sensitivity,
        min_confidence=args.min_confidence,
        output_dir=args.output_dir
    )
    
    try:
        sys.exit(detection.run())
    except KeyboardInterrupt:
        print("\n[STOP] Stopping detection...")
        detection.stop()
        sys.exit(0)
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()