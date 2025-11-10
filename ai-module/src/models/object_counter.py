"""
Real-time Object Counter using OpenCV and HOG
Supports live camera streams, video files, and image capture
"""
import cv2
import numpy as np
import json
import sys
import os
from datetime import datetime
from collections import defaultdict
import time
import base64
import io

class ObjectCounter:
    def __init__(self, model_type='hog', confidence_threshold=0.5, capture_images=True):
        """
        Initialize object counter
        model_type: 'hog' (built-in) or 'yolo' (requires weights)
        capture_images: Whether to capture detection images
        """
        self.model_type = model_type
        self.confidence_threshold = confidence_threshold
        self.capture_images = capture_images
        self.tracking_objects = {}
        self.next_object_id = 0
        self.counted_objects = []
        self.captured_images = []
        self.line_position = None
        self.crossed_ids = set()
        self.image_output_dir = None
        
        # Initialize HOG detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        self.class_name = 'person'
        
        # Tracking parameters
        self.max_disappeared = 30
        self.max_distance = 50
    
    def detect_objects_hog(self, frame):
        """Detect people using HOG descriptor"""
        boxes, weights = self.hog.detectMultiScale(
            frame,
            winStride=(8, 8),
            padding=(8, 8),
            scale=1.05,
            hitThreshold=0.5
        )
        
        detections = []
        for i, (x, y, w, h) in enumerate(boxes):
            if weights[i] > self.confidence_threshold:
                detections.append({
                    'bbox': [int(x), int(y), int(w), int(h)],
                    'confidence': float(weights[i]),
                    'class': 'person',
                    'centroid': (int(x + w/2), int(y + h/2))
                })
        
        return detections
    
    def capture_detection_image(self, frame, object_id, bbox, timestamp):
        """Capture and save detection image"""
        try:
            x, y, w, h = bbox
            
            # Add padding
            padding = 20
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(frame.shape[1], x + w + padding)
            y2 = min(frame.shape[0], y + h + padding)
            
            # Crop detection
            detection_img = frame[y1:y2, x1:x2]
            
            if detection_img.size == 0:
                return None
            
            # Save image if directory specified
            image_path = None
            if self.image_output_dir:
                os.makedirs(self.image_output_dir, exist_ok=True)
                filename = f"detection_{object_id}_{timestamp.replace(':', '-').replace('.', '_')}.jpg"
                image_path = os.path.join(self.image_output_dir, filename)
                cv2.imwrite(image_path, detection_img)
            
            return {
                'path': image_path,
                'filename': filename if image_path else None,
                'width': detection_img.shape[1],
                'height': detection_img.shape[0]
            }
        except Exception as e:
            print(f"Error capturing image: {e}")
            return None
    
    def update_tracking(self, detections, frame=None):
        """Update object tracking and count crossings"""
        if len(detections) == 0:
            for obj_id in list(self.tracking_objects.keys()):
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]
            return []
        
        input_centroids = np.array([d['centroid'] for d in detections])
        
        if len(self.tracking_objects) == 0:
            for detection in detections:
                self.register_object(detection)
        else:
            object_ids = list(self.tracking_objects.keys())
            object_centroids = np.array([self.tracking_objects[oid]['centroid'] for oid in object_ids])
            
            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]
            
            used_rows = set()
            used_cols = set()
            
            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                
                if distances[row, col] > self.max_distance:
                    continue
                
                object_id = object_ids[row]
                old_centroid = self.tracking_objects[object_id]['centroid']
                new_centroid = detections[col]['centroid']
                
                self.tracking_objects[object_id]['centroid'] = new_centroid
                self.tracking_objects[object_id]['bbox'] = detections[col]['bbox']
                self.tracking_objects[object_id]['disappeared'] = 0
                self.tracking_objects[object_id]['last_seen'] = datetime.now()
                
                if self.line_position is not None:
                    self.check_line_crossing(object_id, old_centroid, new_centroid, frame)
                
                used_rows.add(row)
                used_cols.add(col)
            
            unused_cols = set(range(len(input_centroids))) - used_cols
            for col in unused_cols:
                self.register_object(detections[col])
            
            unused_rows = set(range(len(object_centroids))) - used_rows
            for row in unused_rows:
                object_id = object_ids[row]
                self.tracking_objects[object_id]['disappeared'] += 1
                if self.tracking_objects[object_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[object_id]
        
        return list(self.tracking_objects.keys())
    
    def register_object(self, detection):
        """Register a new tracked object"""
        self.tracking_objects[self.next_object_id] = {
            'centroid': detection['centroid'],
            'bbox': detection['bbox'],
            'class': detection['class'],
            'confidence': detection['confidence'],
            'disappeared': 0,
            'first_seen': datetime.now(),
            'last_seen': datetime.now()
        }
        self.next_object_id += 1
    
    def check_line_crossing(self, object_id, old_centroid, new_centroid, frame=None):
        """Check if object crossed the counting line"""
        if object_id in self.crossed_ids:
            return
        
        old_y = old_centroid[1]
        new_y = new_centroid[1]
        
        if (old_y < self.line_position <= new_y) or (old_y > self.line_position >= new_y):
            direction = 'DOWN' if new_y > old_y else 'UP'
            self.crossed_ids.add(object_id)
            
            timestamp = datetime.now().isoformat()
            
            # Capture image if enabled
            captured_image = None
            if self.capture_images and frame is not None:
                captured_image = self.capture_detection_image(
                    frame, 
                    object_id, 
                    self.tracking_objects[object_id]['bbox'],
                    timestamp
                )
            
            count_event = {
                'object_id': object_id,
                'class': self.tracking_objects[object_id]['class'],
                'direction': direction,
                'timestamp': timestamp,
                'confidence': self.tracking_objects[object_id]['confidence'],
                'position': new_centroid,
                'captured_image': captured_image
            }
            self.counted_objects.append(count_event)
            
            if captured_image:
                self.captured_images.append(captured_image)
            
            print(f"✓ Object {object_id} crossed line going {direction} - Image captured: {captured_image is not None}")
    
    def process_frame(self, frame, draw=True):
        """Process a single frame"""
        detections = self.detect_objects_hog(frame)
        tracked_ids = self.update_tracking(detections, frame)
        
        if draw:
            frame = self.draw_results(frame)
        
        return frame, len(tracked_ids), len(self.counted_objects)
    
    def draw_results(self, frame):
        """Draw bounding boxes and counting line on frame"""
        height, width = frame.shape[:2]
        
        if self.line_position is None:
            self.line_position = height // 2
        
        # Draw counting line
        cv2.line(frame, (0, self.line_position), (width, self.line_position), (0, 255, 255), 2)
        cv2.putText(frame, 'COUNTING LINE', (10, self.line_position - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Draw tracked objects
        for obj_id, obj in self.tracking_objects.items():
            x, y, w, h = obj['bbox']
            centroid = obj['centroid']
            
            color = (0, 255, 0) if obj_id in self.crossed_ids else (255, 0, 0)
            
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.circle(frame, centroid, 4, color, -1)
            
            label = f"ID: {obj_id}"
            cv2.putText(frame, label, (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Draw counts
        count_text = f"Total: {len(self.counted_objects)} | Active: {len(self.tracking_objects)} | Images: {len(self.captured_images)}"
        cv2.putText(frame, count_text, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        return frame
    
    def process_video(self, video_source, output_path=None, image_output_dir=None):
        """Process video from file or camera stream"""
        self.image_output_dir = image_output_dir
        
        cap = cv2.VideoCapture(video_source)
        
        if not cap.isOpened():
            return {'error': f'Cannot open video source: {video_source}'}
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        start_time = time.time()
        
        print(f"Processing video: {width}x{height} @ {fps}fps, {total_frames} frames")
        if self.capture_images:
            print(f"Image capture enabled - saving to: {self.image_output_dir or 'memory only'}")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            processed_frame, active_count, total_count = self.process_frame(frame, draw=True)
            
            if writer:
                writer.write(processed_frame)
            
            frame_count += 1
            
            if frame_count % (fps * 5) == 0:
                elapsed = time.time() - start_time
                progress = (frame_count / total_frames * 100) if total_frames > 0 else 0
                print(f"Progress: {frame_count}/{total_frames} ({progress:.1f}%) - "
                      f"Count: {total_count} - Images: {len(self.captured_images)} - Time: {elapsed:.1f}s")
        
        cap.release()
        if writer:
            writer.release()
        
        results = {
            'total_counted': len(self.counted_objects),
            'frames_processed': frame_count,
            'images_captured': len(self.captured_images),
            'detections': self.counted_objects,
            'processing_time': time.time() - start_time,
            'video_info': {
                'width': width,
                'height': height,
                'fps': fps,
                'total_frames': total_frames
            },
            'image_output_directory': self.image_output_dir
        }
        
        return results

def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: python object_counter.py <video_path> [output_path] [--images <image_dir>] [--model <hog>]'}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    
    # Parse arguments
    image_dir = None
    model_type = 'hog'
    capture_images = True
    
    i = 2 if output_path else 1
    while i < len(sys.argv):
        if sys.argv[i] == '--images' and i + 1 < len(sys.argv):
            image_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--model' and i + 1 < len(sys.argv):
            model_type = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--no-images':
            capture_images = False
            i += 1
        else:
            i += 1
    
    if not os.path.exists(video_path):
        print(json.dumps({'error': f'Video file not found: {video_path}'}))
        sys.exit(1)
    
    try:
        counter = ObjectCounter(
            model_type=model_type, 
            confidence_threshold=0.5,
            capture_images=capture_images
        )
        results = counter.process_video(video_path, output_path, image_dir)
        print(json.dumps(results, default=str))
    except Exception as e:
        print(json.dumps({'error': f'Processing failed: {str(e)}'}))
        sys.exit(1)


# Fix Windows console encoding issues
if sys.platform == 'win32':
    # Force UTF-8 encoding for stdout/stderr
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Alternative: Replace special characters with ASCII equivalents
def safe_print(text):
    """Print text safely by replacing non-ASCII characters"""
    # Replace common Unicode characters with ASCII equivalents
    replacements = {
        '✓': '[OK]',
        '✗': '[X]',
        '→': '->',
        '←': '<-',
        '↑': '^',
        '↓': 'v',
        '•': '*',
        '…': '...',
    }
    
    for unicode_char, ascii_char in replacements.items():
        text = text.replace(unicode_char, ascii_char)
    
    try:
        print(text)
    except UnicodeEncodeError:
        # If still fails, remove all non-ASCII characters
        print(text.encode('ascii', 'ignore').decode('ascii'))

# Example usage - replace your print statements with safe_print:
# Before: print("✓ Processing complete")
# After:  safe_print("[OK] Processing complete")
# Or:     print("[OK] Processing complete")  # Just use ASCII characters

"""
RECOMMENDED: Simply replace all Unicode characters in your print statements with ASCII:
- Replace ✓ with [OK] or [SUCCESS]
- Replace ✗ with [X] or [FAILED]
- Replace → with ->
etc.

This is the simplest and most reliable solution.
"""

if __name__ == '__main__':
    main()