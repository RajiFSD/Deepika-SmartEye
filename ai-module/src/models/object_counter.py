"""
Debug-enabled Object Counter
Shows real-time detection boxes and tracking info
"""
import cv2
import numpy as np
import json
import sys
import os
from datetime import datetime
import time

class DebugObjectCounter:
    def __init__(self, confidence_threshold=0.4, capture_images=True):
        """Lower confidence threshold for testing"""
        self.confidence_threshold = confidence_threshold
        self.capture_images = capture_images
        
        # Tracking
        self.tracking_objects = {}
        self.next_object_id = 0
        self.counted_objects = []
        self.captured_images = []
        self.crossed_ids = set()
        
        # Relaxed tracking parameters
        self.max_disappeared = 40
        self.max_distance = 100
        self.min_hits = 2  # Lower threshold
        self.counting_zone = None
        self.image_output_dir = None
        
        # HOG detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Debug info
        self.frame_count = 0
        self.detection_count = 0
        self.raw_detections = []
        
    def detect_objects_hog(self, frame):
        """Detect with lower threshold and show all detections"""
        # Detect at multiple scales
        boxes, weights = self.hog.detectMultiScale(
            frame,
            winStride=(4, 4),
            padding=(16, 16),
            scale=1.05,
            hitThreshold=0.0  # Very low threshold
        )
        
        self.raw_detections = []
        detections = []
        
        for i, (x, y, w, h) in enumerate(boxes):
            confidence = float(weights[i])
            
            # Store all raw detections for debugging
            self.raw_detections.append({
                'bbox': [int(x), int(y), int(w), int(h)],
                'confidence': confidence,
                'accepted': confidence > self.confidence_threshold
            })
            
            if confidence > self.confidence_threshold:
                cx, cy = int(x + w/2), int(y + h/2)
                detections.append({
                    'bbox': [int(x), int(y), int(w), int(h)],
                    'confidence': confidence,
                    'class': 'person',
                    'centroid': (cx, cy)
                })
                self.detection_count += 1
        
        return detections
    
    def update_tracking(self, detections, frame=None):
        """Track with relaxed parameters"""
        if len(detections) == 0:
            for obj_id in list(self.tracking_objects.keys()):
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]
            return []
        
        if len(self.tracking_objects) == 0:
            for detection in detections:
                self.register_object(detection)
        else:
            object_ids = list(self.tracking_objects.keys())
            input_centroids = np.array([d['centroid'] for d in detections])
            object_centroids = np.array([self.tracking_objects[oid]['centroid'] for oid in object_ids])
            
            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]
            
            used_rows = set()
            used_cols = set()
            
            for row, col in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                
                if distances[row, col] > self.max_distance:
                    continue
                
                object_id = object_ids[row]
                old_centroid = self.tracking_objects[object_id]['centroid']
                new_centroid = detections[col]['centroid']
                
                self.tracking_objects[object_id]['centroid'] = new_centroid
                self.tracking_objects[object_id]['bbox'] = detections[col]['bbox']
                self.tracking_objects[object_id]['confidence'] = detections[col]['confidence']
                self.tracking_objects[object_id]['disappeared'] = 0
                self.tracking_objects[object_id]['hits'] += 1
                self.tracking_objects[object_id]['last_seen'] = datetime.now()
                
                # Track trajectory
                if 'trajectory' not in self.tracking_objects[object_id]:
                    self.tracking_objects[object_id]['trajectory'] = []
                self.tracking_objects[object_id]['trajectory'].append(new_centroid)
                
                # Check crossing
                if (self.tracking_objects[object_id]['hits'] >= self.min_hits and 
                    self.counting_zone is not None and frame is not None):
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
        """Register new object"""
        self.tracking_objects[self.next_object_id] = {
            'centroid': detection['centroid'],
            'bbox': detection['bbox'],
            'class': detection['class'],
            'confidence': detection['confidence'],
            'disappeared': 0,
            'hits': 1,
            'first_seen': datetime.now(),
            'last_seen': datetime.now(),
            'crossed': False,
            'trajectory': [detection['centroid']]
        }
        self.next_object_id += 1
    
    def check_line_crossing(self, object_id, old_centroid, new_centroid, frame):
        """Check with minimal hysteresis"""
        if self.tracking_objects[object_id]['crossed']:
            return
        
        old_y = old_centroid[1]
        new_y = new_centroid[1]
        
        # Smaller hysteresis for easier counting
        hysteresis = 5
        
        if old_y < self.counting_zone - hysteresis and new_y > self.counting_zone + hysteresis:
            self.record_crossing(object_id, 'DOWN', new_centroid, frame)
        elif old_y > self.counting_zone + hysteresis and new_y < self.counting_zone - hysteresis:
            self.record_crossing(object_id, 'UP', new_centroid, frame)
    
    def record_crossing(self, object_id, direction, centroid, frame):
        """Record counting event"""
        self.tracking_objects[object_id]['crossed'] = True
        self.crossed_ids.add(object_id)
        timestamp = datetime.now().isoformat()
        
        captured_image = None
        if self.capture_images and frame is not None:
            captured_image = self.capture_detection_image(
                frame, object_id, self.tracking_objects[object_id]['bbox'], timestamp
            )
        
        count_event = {
            'object_id': object_id,
            'class': 'person',
            'direction': direction,
            'timestamp': timestamp,
            'confidence': self.tracking_objects[object_id]['confidence'],
            'position': centroid,
            'captured_image': captured_image
        }
        self.counted_objects.append(count_event)
        
        if captured_image:
            self.captured_images.append(captured_image)
        
        print(f"*** COUNTED *** Person {object_id} crossed {direction} | Total: {len(self.counted_objects)}")
    
    def capture_detection_image(self, frame, object_id, bbox, timestamp):
        """Capture image"""
        try:
            x, y, w, h = bbox
            padding = 20
            
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(frame.shape[1], x + w + padding)
            y2 = min(frame.shape[0], y + h + padding)
            
            detection_img = frame[y1:y2, x1:x2]
            
            if detection_img.size == 0:
                return None
            
            image_path = None
            filename = None
            if self.image_output_dir:
                os.makedirs(self.image_output_dir, exist_ok=True)
                filename = f"person_{object_id}_{timestamp.replace(':', '-').replace('.', '_')}.jpg"
                image_path = os.path.join(self.image_output_dir, filename)
                cv2.imwrite(image_path, detection_img)
            
            return {
                'path': image_path,
                'filename': filename,
                'width': detection_img.shape[1],
                'height': detection_img.shape[0]
            }
        except Exception as e:
            return None
    
    def draw_results(self, frame):
        """Draw with extensive debug info"""
        height, width = frame.shape[:2]
        
        # Set counting line lower for entrance scenarios
        if self.counting_zone is None:
            self.counting_zone = int(height * 0.65)  # 65% from top
        
        # Draw counting zone
        cv2.line(frame, (0, self.counting_zone), (width, self.counting_zone), (0, 255, 255), 3)
        cv2.line(frame, (0, self.counting_zone - 5), (width, self.counting_zone - 5), (0, 200, 200), 1)
        cv2.line(frame, (0, self.counting_zone + 5), (width, self.counting_zone + 5), (0, 200, 200), 1)
        
        # Draw ALL raw detections in red (including rejected ones)
        for det in self.raw_detections:
            x, y, w, h = det['bbox']
            color = (0, 255, 0) if det['accepted'] else (0, 0, 255)  # Green if accepted, Red if rejected
            thickness = 2 if det['accepted'] else 1
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)
            
            conf_text = f"{det['confidence']:.2f}"
            cv2.putText(frame, conf_text, (x, y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)
        
        # Draw tracked objects with trajectory
        for obj_id, obj in self.tracking_objects.items():
            x, y, w, h = obj['bbox']
            cx, cy = obj['centroid']
            
            # Color based on status
            if obj_id in self.crossed_ids:
                color = (0, 255, 0)  # Green - COUNTED
                status = "COUNTED"
            elif obj['hits'] >= self.min_hits:
                color = (255, 165, 0)  # Orange - TRACKING
                status = f"TRACK ({obj['hits']})"
            else:
                color = (255, 255, 0)  # Yellow - DETECTING
                status = f"DETECT ({obj['hits']})"
            
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
            cv2.circle(frame, (cx, cy), 6, color, -1)
            
            # Draw trajectory
            if 'trajectory' in obj and len(obj['trajectory']) > 1:
                points = np.array(obj['trajectory'], dtype=np.int32)
                cv2.polylines(frame, [points], False, color, 2)
            
            # Draw label with more info
            label = f"ID:{obj_id} {status}"
            distance_to_line = abs(cy - self.counting_zone)
            label2 = f"Conf:{obj['confidence']:.2f} Dist:{distance_to_line}px"
            
            # Background for label
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)[0]
            cv2.rectangle(frame, (x, y - 40), (x + max(label_size[0], 200), y), (0, 0, 0), -1)
            
            cv2.putText(frame, label, (x + 5, y - 25),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.putText(frame, label2, (x + 5, y - 8),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
        # Draw comprehensive stats panel
        self.draw_debug_panel(frame)
        
        return frame
    
    def draw_debug_panel(self, frame):
        """Draw debug statistics"""
        height, width = frame.shape[:2]
        panel_height = 160
        
        # Semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, panel_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        
        # Statistics
        stats = [
            f"PEOPLE COUNTED: {len(self.counted_objects)}",
            f"Currently Tracking: {len(self.tracking_objects)}",
            f"Raw Detections: {len(self.raw_detections)}",
            f"Total Detections: {self.detection_count}",
            f"Frame: {self.frame_count}"
        ]
        
        y_offset = 25
        for i, stat in enumerate(stats):
            if i == 0:
                color = (0, 255, 255)
                size = 0.8
            else:
                color = (255, 255, 255)
                size = 0.6
            
            cv2.putText(frame, stat, (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, size, color, 2)
            y_offset += 28
        
        # Legend
        legend_y = panel_height - 30
        cv2.putText(frame, "Red=Rejected | Green=Accepted | Yellow=Detecting | Orange=Tracking",
                   (10, legend_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    def process_video(self, video_source, output_path=None, image_output_dir=None):
        """Process video with debug output"""
        self.image_output_dir = image_output_dir
        
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return {'error': f'Cannot open video source: {video_source}'}
        
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        start_time = time.time()
        
        print(f"[DEBUG] Video: {width}x{height} @ {fps}fps")
        print(f"[DEBUG] Confidence threshold: {self.confidence_threshold}")
        print(f"[DEBUG] Min hits for counting: {self.min_hits}")
        print(f"[DEBUG] Counting line will be at: {int(height * 0.65)}px (65% from top)")
        print("-" * 60)
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            self.frame_count += 1
            
            # Detect and track
            detections = self.detect_objects_hog(frame)
            self.update_tracking(detections, frame)
            
            # Draw debug visualization
            output_frame = self.draw_results(frame)
            
            if writer:
                writer.write(output_frame)
            
            # Detailed progress
            if self.frame_count % (fps * 2) == 0:  # Every 2 seconds
                elapsed = time.time() - start_time
                progress = (self.frame_count / total_frames * 100) if total_frames > 0 else 0
                print(f"[Frame {self.frame_count:5d}] Progress: {progress:5.1f}% | "
                      f"Detections: {len(detections)} | Tracking: {len(self.tracking_objects)} | "
                      f"Counted: {len(self.counted_objects)} | Time: {elapsed:.1f}s")
        
        cap.release()
        if writer:
            writer.release()
        
        processing_time = time.time() - start_time
        
        # Final statistics
        up_count = sum(1 for obj in self.counted_objects if obj['direction'] == 'UP')
        down_count = sum(1 for obj in self.counted_objects if obj['direction'] == 'DOWN')
        
        print("\n" + "=" * 60)
        print(f"FINAL RESULTS:")
        print(f"  Total People Counted: {len(self.counted_objects)}")
        print(f"  Direction - DOWN (entering): {down_count}")
        print(f"  Direction - UP (exiting): {up_count}")
        print(f"  Net count: {down_count - up_count}")
        print(f"  Total frames processed: {self.frame_count}")
        print(f"  Total detections made: {self.detection_count}")
        print(f"  Processing time: {processing_time:.1f}s")
        print("=" * 60)
        
        results = {
            'total_counted': len(self.counted_objects),
            'direction_counts': {
                'UP': up_count,
                'DOWN': down_count,
                'net': down_count - up_count
            },
            'frames_processed': self.frame_count,
            'total_detections': self.detection_count,
            'images_captured': len(self.captured_images),
            'detections': self.counted_objects,
            'processing_time': processing_time,
            'video_info': {
                'width': width,
                'height': height,
                'fps': fps,
                'total_frames': total_frames
            }
        }
        
        return results


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            'error': 'Usage: python debug_counter.py <video_path> [output_path] [--images <dir>] [--confidence <0.4>]'
        }))
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None
    
    image_dir = None
    confidence = 0.4  # Lower for testing
    
    i = 2 if output_path else 1
    while i < len(sys.argv):
        if sys.argv[i] == '--images' and i + 1 < len(sys.argv):
            image_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--confidence' and i + 1 < len(sys.argv):
            confidence = float(sys.argv[i + 1])
            i += 2
        else:
            i += 1
    
    if not os.path.exists(video_path):
        print(json.dumps({'error': f'Video not found: {video_path}'}))
        sys.exit(1)
    
    try:
        counter = DebugObjectCounter(
            confidence_threshold=confidence,
            capture_images=image_dir is not None
        )
        results = counter.process_video(video_path, output_path, image_dir)
        print(json.dumps(results, default=str))
    except Exception as e:
        print(json.dumps({'error': f'Failed: {str(e)}'}))
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()