"""
Product Counter using YOLOv8 for Real-time Detection and Counting
Supports video files, images, and live camera streams
"""
import cv2
import numpy as np
from ultralytics import YOLO
import json
import sys
import os
from datetime import datetime
from collections import defaultdict
import time

class ProductCounter:
    def __init__(self, model_path='yolov8n.pt', confidence_threshold=0.25, iou_threshold=0.45):
        """
        Initialize product counter with YOLO model
        
        Args:
            model_path: Path to YOLO model weights
            confidence_threshold: Minimum confidence for detections
            iou_threshold: IOU threshold for NMS
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.iou_threshold = iou_threshold
        
        # Tracking
        self.tracked_objects = {}
        self.next_object_id = 0
        self.counted_ids = set()
        self.counting_line = None
        self.max_disappeared = 30
        self.max_distance = 100
        
        # Product categories from COCO dataset
        self.product_classes = {
            39: 'bottle', 40: 'wine glass', 41: 'cup', 42: 'fork', 43: 'knife',
            44: 'spoon', 45: 'bowl', 46: 'banana', 47: 'apple', 48: 'sandwich',
            49: 'orange', 50: 'broccoli', 51: 'carrot', 52: 'hot dog', 53: 'pizza',
            54: 'donut', 55: 'cake', 56: 'chair', 57: 'couch', 58: 'potted plant',
            59: 'bed', 60: 'dining table', 61: 'toilet', 62: 'tv', 63: 'laptop',
            64: 'mouse', 65: 'remote', 66: 'keyboard', 67: 'cell phone', 68: 'microwave',
            69: 'oven', 70: 'toaster', 71: 'sink', 72: 'refrigerator', 73: 'book',
            74: 'clock', 75: 'vase', 76: 'scissors', 77: 'teddy bear', 78: 'hair drier',
            79: 'toothbrush'
        }
        
        # Stats
        self.detection_counts = defaultdict(int)
        self.detection_history = []
        self.image_output_dir = None
        
    def detect_products(self, frame):
        """Run YOLO detection on frame"""
        results = self.model(frame, conf=self.confidence_threshold, iou=self.iou_threshold)[0]
        
        detections = []
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0])
            cls = int(box.cls[0])
            
            # Filter for product classes only
            if cls in self.product_classes:
                w, h = x2 - x1, y2 - y1
                cx, cy = int(x1 + w/2), int(y1 + h/2)
                
                detections.append({
                    'bbox': [int(x1), int(y1), int(w), int(h)],
                    'confidence': conf,
                    'class_id': cls,
                    'class_name': self.product_classes[cls],
                    'centroid': (cx, cy)
                })
        
        return detections
    
    def update_tracking(self, detections, frame=None):
        """Update object tracking with centroid tracking algorithm"""
        if len(detections) == 0:
            # Mark disappeared objects
            for obj_id in list(self.tracked_objects.keys()):
                self.tracked_objects[obj_id]['disappeared'] += 1
                if self.tracked_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracked_objects[obj_id]
            return []
        
        input_centroids = np.array([d['centroid'] for d in detections])
        
        if len(self.tracked_objects) == 0:
            # Register all detections as new objects
            for detection in detections:
                self.register_object(detection)
        else:
            # Match existing objects with new detections
            object_ids = list(self.tracked_objects.keys())
            object_centroids = np.array([self.tracked_objects[oid]['centroid'] for oid in object_ids])
            
            # Compute distances
            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            
            # Hungarian algorithm (simplified greedy matching)
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
                old_centroid = self.tracked_objects[object_id]['centroid']
                new_centroid = detections[col]['centroid']
                
                # Update tracked object
                self.tracked_objects[object_id]['centroid'] = new_centroid
                self.tracked_objects[object_id]['bbox'] = detections[col]['bbox']
                self.tracked_objects[object_id]['confidence'] = detections[col]['confidence']
                self.tracked_objects[object_id]['disappeared'] = 0
                self.tracked_objects[object_id]['last_seen'] = datetime.now()
                
                # Check line crossing
                if self.counting_line is not None and frame is not None:
                    self.check_line_crossing(object_id, old_centroid, new_centroid, frame, detections[col])
                
                used_rows.add(row)
                used_cols.add(col)
            
            # Register new detections
            unused_cols = set(range(len(input_centroids))) - used_cols
            for col in unused_cols:
                self.register_object(detections[col])
            
            # Mark disappeared objects
            unused_rows = set(range(len(object_centroids))) - used_rows
            for row in unused_rows:
                object_id = object_ids[row]
                self.tracked_objects[object_id]['disappeared'] += 1
                if self.tracked_objects[object_id]['disappeared'] > self.max_disappeared:
                    del self.tracked_objects[object_id]
        
        return list(self.tracked_objects.keys())
    
    def register_object(self, detection):
        """Register a new tracked object"""
        self.tracked_objects[self.next_object_id] = {
            'centroid': detection['centroid'],
            'bbox': detection['bbox'],
            'class_id': detection['class_id'],
            'class_name': detection['class_name'],
            'confidence': detection['confidence'],
            'disappeared': 0,
            'first_seen': datetime.now(),
            'last_seen': datetime.now()
        }
        self.next_object_id += 1
    
    def check_line_crossing(self, object_id, old_centroid, new_centroid, frame, detection):
        """Check if object crossed the counting line"""
        if object_id in self.counted_ids:
            return
        
        old_y = old_centroid[1]
        new_y = new_centroid[1]
        
        # Check if crossed the line
        if (old_y < self.counting_line <= new_y) or (old_y > self.counting_line >= new_y):
            direction = 'DOWN' if new_y > old_y else 'UP'
            self.counted_ids.add(object_id)
            
            # Update class-specific count
            class_name = detection['class_name']
            self.detection_counts[class_name] += 1
            
            # Capture image if enabled
            captured_image = None
            if self.image_output_dir and frame is not None:
                captured_image = self.capture_detection_image(
                    frame, object_id, detection['bbox'], class_name
                )
            
            # Record detection event
            event = {
                'object_id': object_id,
                'class_id': detection['class_id'],
                'class_name': class_name,
                'direction': direction,
                'timestamp': datetime.now().isoformat(),
                'confidence': detection['confidence'],
                'position': new_centroid,
                'captured_image': captured_image
            }
            self.detection_history.append(event)
            
            print(f"[OK] Product {object_id} ({class_name}) crossed line going {direction} - Count: {self.detection_counts[class_name]}")
    
    def capture_detection_image(self, frame, object_id, bbox, class_name):
        """Capture and save detection image"""
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
            
            os.makedirs(self.image_output_dir, exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
            filename = f"{class_name}_{object_id}_{timestamp}.jpg"
            image_path = os.path.join(self.image_output_dir, filename)
            
            cv2.imwrite(image_path, detection_img)
            
            return {
                'path': image_path,
                'filename': filename,
                'width': detection_img.shape[1],
                'height': detection_img.shape[0]
            }
        except Exception as e:
            print(f"[X] Error capturing image: {e}")
            return None
    
    def draw_results(self, frame):
        """Draw bounding boxes, labels, and counting line"""
        height, width = frame.shape[:2]
        
        # Set counting line if not set
        if self.counting_line is None:
            self.counting_line = height // 2
        
        # Draw counting line
        cv2.line(frame, (0, self.counting_line), (width, self.counting_line), (0, 255, 255), 3)
        cv2.putText(frame, 'COUNTING LINE', (10, self.counting_line - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
        
        # Draw tracked objects
        for obj_id, obj in self.tracked_objects.items():
            x, y, w, h = obj['bbox']
            cx, cy = obj['centroid']
            
            # Color: green if counted, blue if tracking
            color = (0, 255, 0) if obj_id in self.counted_ids else (255, 0, 0)
            
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.circle(frame, (cx, cy), 4, color, -1)
            
            # Draw label
            label = f"ID:{obj_id} {obj['class_name']} {obj['confidence']:.2f}"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(frame, (x, y - label_size[1] - 10), (x + label_size[0], y), color, -1)
            cv2.putText(frame, label, (x, y - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # Draw statistics panel
        self.draw_stats_panel(frame)
        
        return frame
    
    def draw_stats_panel(self, frame):
        """Draw statistics panel on frame"""
        height, width = frame.shape[:2]
        panel_height = 180
        
        # Semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, panel_height), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Title
        cv2.putText(frame, 'PRODUCT COUNTING SYSTEM', (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        # Total counts
        total = sum(self.detection_counts.values())
        cv2.putText(frame, f'Total Counted: {total}', (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(frame, f'Active Tracking: {len(self.tracked_objects)}', (10, 85),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        # Top 5 product counts
        y_offset = 110
        sorted_counts = sorted(self.detection_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        for i, (class_name, count) in enumerate(sorted_counts):
            text = f'{class_name}: {count}'
            cv2.putText(frame, text, (10, y_offset + i * 20),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    def process_frame(self, frame, draw=True):
        """Process a single frame"""
        detections = self.detect_products(frame)
        tracked_ids = self.update_tracking(detections, frame)
        
        if draw:
            frame = self.draw_results(frame)
        
        return frame, len(tracked_ids), sum(self.detection_counts.values())
    
    def process_video(self, video_source, output_path=None, image_output_dir=None):
        """Process video file or stream"""
        self.image_output_dir = image_output_dir
        
        # Open video
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return {'error': f'Cannot open video source: {video_source}'}
        
        # Video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Video writer
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        start_time = time.time()
        
        print(f"[OK] Processing video: {width}x{height} @ {fps}fps")
        if image_output_dir:
            print(f"[OK] Image capture enabled: {image_output_dir}")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            processed_frame, active_count, total_count = self.process_frame(frame, draw=True)
            
            if writer:
                writer.write(processed_frame)
            
            frame_count += 1
            
            # Progress update every 5 seconds
            if total_frames > 0 and frame_count % (fps * 5) == 0:
                progress = (frame_count / total_frames * 100)
                elapsed = time.time() - start_time
                print(f"Progress: {frame_count}/{total_frames} ({progress:.1f}%) - "
                      f"Counted: {total_count} - Time: {elapsed:.1f}s")
        
        cap.release()
        if writer:
            writer.release()
        
        processing_time = time.time() - start_time
        
        results = {
            'total_counted': sum(self.detection_counts.values()),
            'product_counts': dict(self.detection_counts),
            'frames_processed': frame_count,
            'images_captured': len(self.detection_history),
            'detections': self.detection_history,
            'processing_time': processing_time,
            'video_info': {
                'width': width,
                'height': height,
                'fps': fps,
                'total_frames': total_frames
            },
            'image_output_directory': self.image_output_dir
        }
        
        return results
    
    def process_image(self, image_path, output_path=None):
        """Process a single image"""
        frame = cv2.imread(image_path)
        if frame is None:
            return {'error': f'Cannot read image: {image_path}'}
        
        detections = self.detect_products(frame)
        
        # Count products by class
        product_counts = defaultdict(int)
        for det in detections:
            product_counts[det['class_name']] += 1
        
        # Draw results
        for det in detections:
            x, y, w, h = det['bbox']
            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
            
            label = f"{det['class_name']} {det['confidence']:.2f}"
            cv2.putText(frame, label, (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        # Draw counts
        y_offset = 30
        for class_name, count in product_counts.items():
            text = f'{class_name}: {count}'
            cv2.putText(frame, text, (10, y_offset),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            y_offset += 30
        
        if output_path:
            cv2.imwrite(output_path, frame)
        
        return {
            'total_products': len(detections),
            'product_counts': dict(product_counts),
            'detections': detections
        }


def main():
    """Command-line interface"""
    if len(sys.argv) < 3:
        print(json.dumps({
            'error': 'Usage: python product_counter.py <mode> <source> [options]',
            'modes': {
                'video': 'Process video file',
                'image': 'Process single image',
                'stream': 'Process camera stream'
            },
            'example': 'python product_counter.py video input.mp4 --output result.mp4 --images ./captures'
        }))
        sys.exit(1)
    
    mode = sys.argv[1]
    source = sys.argv[2]
    
    # Parse arguments
    output_path = None
    image_dir = None
    model_path = 'yolov8n.pt'
    
    i = 3
    while i < len(sys.argv):
        if sys.argv[i] == '--output' and i + 1 < len(sys.argv):
            output_path = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--images' and i + 1 < len(sys.argv):
            image_dir = sys.argv[i + 1]
            i += 2
        elif sys.argv[i] == '--model' and i + 1 < len(sys.argv):
            model_path = sys.argv[i + 1]
            i += 2
        else:
            i += 1
    
    try:
        counter = ProductCounter(model_path=model_path)
        
        if mode == 'video' or mode == 'stream':
            results = counter.process_video(source, output_path, image_dir)
        elif mode == 'image':
            results = counter.process_image(source, output_path)
        else:
            results = {'error': f'Invalid mode: {mode}'}
        
        print(json.dumps(results, default=str))
        
    except Exception as e:
        print(json.dumps({'error': f'Processing failed: {str(e)}'}))
        sys.exit(1)


if __name__ == '__main__':
    main()