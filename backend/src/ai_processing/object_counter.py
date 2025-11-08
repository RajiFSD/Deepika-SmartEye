"""
Real-time Object Counter using OpenCV and YOLO
Supports live camera streams and video files
"""
import cv2
import numpy as np
import json
import sys
import os
from datetime import datetime
from collections import defaultdict
import time

class ObjectCounter:
    def __init__(self, model_type='hog', confidence_threshold=0.5):
        """
        Initialize object counter
        model_type: 'hog' (built-in) or 'yolo' (requires weights)
        """
        self.model_type = model_type
        self.confidence_threshold = confidence_threshold
        self.tracking_objects = {}
        self.next_object_id = 0
        self.counted_objects = []
        self.line_position = None  # Counting line position (y-coordinate)
        self.crossed_ids = set()  # Track which objects have crossed the line
        
        # Initialize detector
        if model_type == 'hog':
            self.hog = cv2.HOGDescriptor()
            self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            self.class_name = 'person'
        elif model_type == 'yolo':
            # Load YOLO (you'll need to download weights)
            self.load_yolo()
        
        # Tracking parameters
        self.max_disappeared = 30  # Frames before removing tracked object
        self.max_distance = 50  # Max distance for matching objects
    
    def load_yolo(self):
        """Load YOLO model (optional - requires model files)"""
        try:
            weights_path = 'yolov3.weights'
            config_path = 'yolov3.cfg'
            names_path = 'coco.names'
            
            if not all(os.path.exists(p) for p in [weights_path, config_path, names_path]):
                print("YOLO files not found, falling back to HOG")
                self.model_type = 'hog'
                self.hog = cv2.HOGDescriptor()
                self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
                return
            
            self.net = cv2.dnn.readNet(weights_path, config_path)
            with open(names_path, 'r') as f:
                self.classes = [line.strip() for line in f.readlines()]
            
            layer_names = self.net.getLayerNames()
            self.output_layers = [layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()]
        except Exception as e:
            print(f"Error loading YOLO: {e}")
            self.model_type = 'hog'
    
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
    
    def detect_objects_yolo(self, frame):
        """Detect objects using YOLO"""
        height, width = frame.shape[:2]
        
        # Create blob and forward pass
        blob = cv2.dnn.blobFromImage(frame, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
        self.net.setInput(blob)
        outs = self.net.forward(self.output_layers)
        
        # Process detections
        class_ids = []
        confidences = []
        boxes = []
        
        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > self.confidence_threshold:
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        # Non-maximum suppression
        indexes = cv2.dnn.NMSBoxes(boxes, confidences, self.confidence_threshold, 0.4)
        
        detections = []
        for i in indexes.flatten():
            x, y, w, h = boxes[i]
            detections.append({
                'bbox': [x, y, w, h],
                'confidence': confidences[i],
                'class': self.classes[class_ids[i]],
                'centroid': (int(x + w/2), int(y + h/2))
            })
        
        return detections
    
    def update_tracking(self, detections):
        """Update object tracking and count crossings"""
        if len(detections) == 0:
            # Mark objects as disappeared
            for obj_id in list(self.tracking_objects.keys()):
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]
            return []
        
        # Get centroids of current detections
        input_centroids = np.array([d['centroid'] for d in detections])
        
        if len(self.tracking_objects) == 0:
            # Register all as new objects
            for detection in detections:
                self.register_object(detection)
        else:
            # Match existing objects with new detections
            object_ids = list(self.tracking_objects.keys())
            object_centroids = np.array([self.tracking_objects[oid]['centroid'] for oid in object_ids])
            
            # Compute distances between existing and new centroids
            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            
            # Find minimum distances
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
                
                # Update object
                self.tracking_objects[object_id]['centroid'] = new_centroid
                self.tracking_objects[object_id]['bbox'] = detections[col]['bbox']
                self.tracking_objects[object_id]['disappeared'] = 0
                self.tracking_objects[object_id]['last_seen'] = datetime.now()
                
                # Check line crossing
                if self.line_position is not None:
                    self.check_line_crossing(object_id, old_centroid, new_centroid)
                
                used_rows.add(row)
                used_cols.add(col)
            
            # Register new objects
            unused_cols = set(range(len(input_centroids))) - used_cols
            for col in unused_cols:
                self.register_object(detections[col])
            
            # Mark disappeared objects
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
    
    def check_line_crossing(self, object_id, old_centroid, new_centroid):
        """Check if object crossed the counting line"""
        if object_id in self.crossed_ids:
            return
        
        old_y = old_centroid[1]
        new_y = new_centroid[1]
        
        # Check if crossed from top to bottom or bottom to top
        if (old_y < self.line_position <= new_y) or (old_y > self.line_position >= new_y):
            direction = 'DOWN' if new_y > old_y else 'UP'
            self.crossed_ids.add(object_id)
            
            count_event = {
                'object_id': object_id,
                'class': self.tracking_objects[object_id]['class'],
                'direction': direction,
                'timestamp': datetime.now().isoformat(),
                'confidence': self.tracking_objects[object_id]['confidence'],
                'position': new_centroid
            }
            self.counted_objects.append(count_event)
            print(f"Object {object_id} crossed line going {direction}")
    
    def process_frame(self, frame, draw=True):
        """Process a single frame"""
        # Detect objects
        if self.model_type == 'hog':
            detections = self.detect_objects_hog(frame)
        else:
            detections = self.detect_objects_yolo(frame)
        
        # Update tracking
        tracked_ids = self.update_tracking(detections)
        
        # Draw on frame if requested
        if draw:
            frame = self.draw_results(frame)
        
        return frame, len(tracked_ids), len(self.counted_objects)
    
    def draw_results(self, frame):
        """Draw bounding boxes and counting line on frame"""
        height, width = frame.shape[:2]
        
        # Set counting line if not set (middle of frame)
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
            
            # Color based on whether crossed
            color = (0, 255, 0) if obj_id in self.crossed_ids else (255, 0, 0)
            
            # Draw bounding box
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            
            # Draw centroid
            cv2.circle(frame, centroid, 4, color, -1)
            
            # Draw ID and class
            label = f"ID: {obj_id} - {obj['class']}"
            cv2.putText(frame, label, (x, y - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        # Draw counts
        count_text = f"Total Count: {len(self.counted_objects)} | Active: {len(self.tracking_objects)}"
        cv2.putText(frame, count_text, (10, 30),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        
        return frame
    
    def process_video(self, video_source, output_path=None):
        """Process video from file or camera stream"""
        cap = cv2.VideoCapture(video_source)
        
        if not cap.isOpened():
            return {'error': f'Cannot open video source: {video_source}'}
        
        # Get video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        # Video writer if output path provided
        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
        
        frame_count = 0
        start_time = time.time()
        
        print(f"Processing video: {width}x{height} @ {fps}fps, {total_frames} frames")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            processed_frame, active_count, total_count = self.process_frame(frame, draw=True)
            
            # Write to output
            if writer:
                writer.write(processed_frame)
            
            frame_count += 1
            
            # Progress update
            if frame_count % (fps * 5) == 0:  # Every 5 seconds
                elapsed = time.time() - start_time
                progress = (frame_count / total_frames * 100) if total_frames > 0 else 0
                print(f"Progress: {frame_count}/{total_frames} ({progress:.1f}%) - "
                      f"Count: {total_count} - Time: {elapsed:.1f}s")
        
        cap.release()
        if writer:
            writer.release()
        
        # Return results
        results = {
            'total_counted': len(self.counted_objects),
            'frames_processed': frame_count,
            'detections': self.counted_objects,
            'processing_time': time.time() - start_time,
            'video_info': {
                'width': width,
                'height': height,
                'fps': fps,
                'total_frames': total_frames
            }
        }
        
        return results

def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: python object_counter.py <video_path> [output_path]'}))
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not os.path.exists(video_path):
        print(json.dumps({'error': f'Video file not found: {video_path}'}))
        sys.exit(1)
    
    try:
        counter = ObjectCounter(model_type='hog', confidence_threshold=0.5)
        results = counter.process_video(video_path, output_path)
        print(json.dumps(results, default=str))
    except Exception as e:
        print(json.dumps({'error': f'Processing failed: {str(e)}'}))
        sys.exit(1)

if __name__ == '__main__':
    main()