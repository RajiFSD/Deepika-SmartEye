"""
Real-time Object Counter using YOLOv8
Supports live camera streams, video files, and image capture
"""
import cv2
import numpy as np
import json
import sys
import os
import time
from datetime import datetime
from ultralytics import YOLO


class ObjectCounter:
    def _init_(self, model_path='yolov8n.pt', confidence_threshold=0.5, capture_images=True):
        """
        Initialize YOLOv8 object counter
        """
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.capture_images = capture_images

        self.tracking_objects = {}
        self.next_object_id = 0
        self.counted_objects = []
        self.captured_images = []
        self.line_position = None
        self.crossed_ids = set()
        self.image_output_dir = None

        # Tracking parameters
        self.max_disappeared = 30
        self.max_distance = 50

    def detect_objects_yolo(self, frame):
        """Detect objects using YOLOv8"""
        results = self.model(frame, verbose=False)
        detections = []

        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = self.model.names[int(box.cls[0])]

            # Only detect people (optional: comment this if you want all classes)
            if cls != 'person':
                continue

            if conf >= self.confidence_threshold:
                detections.append({
                    'bbox': [x1, y1, x2 - x1, y2 - y1],
                    'confidence': conf,
                    'class': cls,
                    'centroid': (int((x1 + x2) / 2), int((y1 + y2) / 2))
                })
        return detections

    def capture_detection_image(self, frame, object_id, bbox, timestamp):
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
            filename = f"detection_{object_id}{timestamp.replace(':', '-').replace('.', '')}.jpg"
            image_path = os.path.join(self.image_output_dir, filename)
            cv2.imwrite(image_path, detection_img)

            return {
                'path': image_path,
                'filename': filename,
                'width': detection_img.shape[1],
                'height': detection_img.shape[0]
            }
        except Exception as e:
            print(f"Error capturing image: {e}")
            return None

    def register_object(self, detection):
        """Register new tracked object"""
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

    def update_tracking(self, detections, frame=None):
        """Simple centroid-based tracking"""
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
            object_centroids = np.array([self.tracking_objects[i]['centroid'] for i in object_ids])

            distances = np.linalg.norm(object_centroids[:, np.newaxis] - input_centroids, axis=2)
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]

            used_rows, used_cols = set(), set()
            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if distances[row, col] > self.max_distance:
                    continue

                object_id = object_ids[row]
                old_centroid = self.tracking_objects[object_id]['centroid']
                new_centroid = detections[col]['centroid']

                self.tracking_objects[object_id].update({
                    'centroid': new_centroid,
                    'bbox': detections[col]['bbox'],
                    'disappeared': 0,
                    'last_seen': datetime.now()
                })

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

    def check_line_crossing(self, object_id, old_centroid, new_centroid, frame=None):
        """Count if object crosses the line"""
        if object_id in self.crossed_ids:
            return

        old_y, new_y = old_centroid[1], new_centroid[1]
        if (old_y < self.line_position <= new_y) or (old_y > self.line_position >= new_y):
            direction = 'DOWN' if new_y > old_y else 'UP'
            self.crossed_ids.add(object_id)
            timestamp = datetime.now().isoformat()

            captured_image = None
            if self.capture_images and frame is not None and self.image_output_dir:
                captured_image = self.capture_detection_image(frame, object_id, self.tracking_objects[object_id]['bbox'], timestamp)

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
            print(f"[OK] Object {object_id} crossed line going {direction}")

    def draw_results(self, frame):
        """Draw results on frame"""
        height, width = frame.shape[:2]
        if self.line_position is None:
            self.line_position = height // 2

        cv2.line(frame, (0, self.line_position), (width, self.line_position), (0, 255, 255), 2)
        cv2.putText(frame, 'COUNTING LINE', (10, self.line_position - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        for obj_id, obj in self.tracking_objects.items():
            x, y, w, h = obj['bbox']
            color = (0, 255, 0) if obj_id in self.crossed_ids else (255, 0, 0)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.circle(frame, obj['centroid'], 4, color, -1)
            cv2.putText(frame, f"ID {obj_id}", (x, y - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        count_text = f"Total: {len(self.counted_objects)} | Active: {len(self.tracking_objects)}"
        cv2.putText(frame, count_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        return frame

    def process_video(self, video_source, output_path=None, image_output_dir=None):
        """Process video input"""
        self.image_output_dir = image_output_dir
        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            print(json.dumps({'error': f'Cannot open video source: {video_source}'}))
            return

        fps = int(cap.get(cv2.CAP_PROP_FPS))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        print(f"Processing video: {width}x{height} @ {fps}fps")

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            detections = self.detect_objects_yolo(frame)
            self.update_tracking(detections, frame)
            frame = self.draw_results(frame)

            if writer:
                writer.write(frame)

            cv2.imshow("YOLOv8 Object Counter", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        if writer:
            writer.release()
        cv2.destroyAllWindows()

        results = {
            'total_counted': len(self.counted_objects),
            'frames_processed': len(self.counted_objects),
            'images_captured': len(self.captured_images),
            'detections': self.counted_objects,
            'video_info': {'width': width, 'height': height, 'fps': fps}
        }
        print(json.dumps(results, indent=2, default=str))
        return results


def main():
    if len(sys.argv) < 2:
        print("Usage: python object_counter_yolo.py <video_path> [output_path] [--images <image_dir>]")
        sys.exit(1)

    video_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else None

    image_dir = None
    for i in range(2, len(sys.argv)):
        if sys.argv[i] == '--images' and i + 1 < len(sys.argv):
            image_dir = sys.argv[i + 1]

    counter = ObjectCounter(confidence_threshold=0.5, capture_images=True)
    counter.process_video(video_path, output_path, image_dir)


if _name_ == "_main_":
    main()