import cv2
import numpy as np
import json
import sys
import os
import time
from datetime import datetime
from ultralytics import YOLO

class TrolleyObjectCounter:
    def __init__(self,
                 model_path='yolov8n.pt',
                 confidence_threshold=0.5,
                 capture_images=True):
        self.model = YOLO(model_path)
        self.confidence_threshold = confidence_threshold
        self.capture_images = capture_images

        self.tracking_objects = {}  # id => info
        self.next_object_id = 0
        self.counted_objects = []
        self.captured_images = []

        # rectangle zone: (x, y, w, h)
        self.counting_zone = None
        self.zone_entered_ids = set()

        self.image_output_dir = None

        # tracking parameters
        self.max_disappeared = 30
        self.max_distance = 50

        # classes to count
        self.objects_to_count = [
            'suitcase', 'backpack', 'handbag', 'bag', 'luggage',
            'box', 'package', 'cart', 'trolley', 'case'
        ]
        self.objects_to_ignore = [
            'person', 'car', 'bicycle', 'motorcycle', 'bus', 'truck',
            'traffic light', 'stop sign', 'bench', 'chair'
        ]

    def detect_objects_yolo(self, frame):
        """Detect objects using YOLOv8 and filter for trolley objects"""
        results = self.model(frame, verbose=False)
        detections = []

        for box in results[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            cls = self.model.names[int(box.cls[0])]

            # Ignore unwanted classes
            if cls in self.objects_to_ignore:
                continue

            if conf >= self.confidence_threshold:
                w = x2 - x1
                h = y2 - y1

                detections.append({
                    'bbox': [x1, y1, w, h],
                    'confidence': conf,
                    'class': cls,
                    'centroid': (
                        int((x1 + x2) / 2),
                        int((y1 + y2) / 2)
                    )
                })

        return detections


    def capture_detection_image(self, frame, object_id, bbox, timestamp):
        x, y, w, h = bbox
        padding = 20
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(frame.shape[1], x + w + padding)
        y2 = min(frame.shape[0], y + h + padding)
        crop = frame[y1:y2, x1:x2]
        if crop.size == 0:
            return None

        os.makedirs(self.image_output_dir, exist_ok=True)
        fname = f"detection_{object_id}_{timestamp.replace(':','-').replace('.','-')}.jpg"
        fpath = os.path.join(self.image_output_dir, fname)
        cv2.imwrite(fpath, crop)

        info = {
            'path': fpath,
            'filename': fname,
            'width': crop.shape[1],
            'height': crop.shape[0]
        }
        # append to list
        self.captured_images.append(info)
        return info

    def register_object(self, detection):
        self.tracking_objects[self.next_object_id] = {
            'centroid': detection['centroid'],
            'bbox': detection['bbox'],
            'class': detection['class'],
            'confidence': detection['confidence'],
            'disappeared': 0,
            'first_seen': datetime.now(),
            'last_seen': datetime.now(),
            'in_zone': False
        }
        self.next_object_id += 1

    def update_tracking(self, detections, frame=None):
        if len(detections) == 0:
            # mark all as disappeared
            for obj_id in list(self.tracking_objects.keys()):
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]
            return []

        input_centroids = np.array([d['centroid'] for d in detections])
        object_ids = list(self.tracking_objects.keys())
        object_centroids = np.array([self.tracking_objects[i]['centroid'] for i in object_ids])

        if len(self.tracking_objects) == 0:
            for det in detections:
                self.register_object(det)
        else:
            # compute distances
            distances = np.linalg.norm(object_centroids[:, None] - input_centroids[None, :], axis=2)
            rows = distances.min(axis=1).argsort()
            cols = distances.argmin(axis=1)[rows]

            used_rows = set()
            used_cols = set()

            for (row, col) in zip(rows, cols):
                if row in used_rows or col in used_cols:
                    continue
                if distances[row, col] > self.max_distance:
                    continue

                obj_id = object_ids[row]
                det = detections[col]
                old_centroid = self.tracking_objects[obj_id]['centroid']
                new_centroid = det['centroid']

                # update object
                self.tracking_objects[obj_id].update({
                    'centroid': new_centroid,
                    'bbox': det['bbox'],
                    'disappeared': 0,
                    'last_seen': datetime.now()
                })

                # check zone
                if self.counting_zone is not None:
                    self._check_zone_activity(obj_id, old_centroid, new_centroid, frame)

                used_rows.add(row)
                used_cols.add(col)

            # register new detections
            for col in set(range(len(detections))) - used_cols:
                self.register_object(detections[col])

            # disappeared existing ones
            for row in set(range(len(object_centroids))) - used_rows:
                obj_id = object_ids[row]
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]

        return list(self.tracking_objects.keys())

    def _is_point_in_zone(self, point):
        if self.counting_zone is None:
            return False
        x, y, w, h = self.counting_zone
        px, py = point
        return (x <= px <= x + w) and (y <= py <= y + h)

    def _check_zone_activity(self, obj_id, old_centroid, new_centroid, frame=None):
        was_in = self.tracking_objects[obj_id]['in_zone']
        is_now = self._is_point_in_zone(new_centroid)

        # entering
        if (not was_in) and is_now and (obj_id not in self.zone_entered_ids):
            self.zone_entered_ids.add(obj_id)
            self.tracking_objects[obj_id]['in_zone'] = True
            ts = datetime.now().isoformat()
            cap_img = None
            if self.capture_images and frame is not None and self.image_output_dir:
                cap_img = self.capture_detection_image(frame, obj_id, self.tracking_objects[obj_id]['bbox'], ts)
            event = {
                'object_id': obj_id,
                'class': self.tracking_objects[obj_id]['class'],
                'direction': 'ENTER',
                'timestamp': ts,
                'confidence': self.tracking_objects[obj_id]['confidence'],
                'position': new_centroid,
                'captured_image': cap_img
            }
            self.counted_objects.append(event)
            print(f"[OK] Object {obj_id} ({self.tracking_objects[obj_id]['class']}) entered counting zone")

        # exiting (optional)
        elif was_in and not is_now:
            self.tracking_objects[obj_id]['in_zone'] = False
            # you could add exit event here if needed

    def draw_results(self, frame):
        height, width = frame.shape[:2]
        if self.counting_zone is None:
            # Set fixed position and larger size
            zone_w = width // 3  # Bigger width (1/3 of frame width)
            zone_h = height // 2  # Bigger height (1/2 of frame height)
            # Fixed position: x=220, y=123
            self.counting_zone = (220, 123, zone_w, zone_h)

        x, y, w, h = self.counting_zone
        # print(f"Drawing counting zone at: {x},{y} {w}x{h}")
        cv2.rectangle(frame, (x, y), (x + w, y + h), (10, 200, 255), 3)
        cv2.putText(frame, 'COUNTING ZONE', (x, y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        for obj_id, obj in self.tracking_objects.items():
            x0, y0, w0, h0 = obj['bbox']
            if obj_id in self.zone_entered_ids:
                color = (0, 255, 0)
            elif obj.get('in_zone', False):
                color = (255, 255, 0)
            else:
                color = (255, 0, 0)

            cv2.rectangle(frame, (x0, y0), (x0 + w0, y0 + h0), color, 2)
            cv2.circle(frame, obj['centroid'], 4, color, -1)
            label = f"ID {obj_id} ({obj['class']})"
            cv2.putText(frame, label, (x0, y0 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        count_text = f"Total Counted: {len(self.counted_objects)} | Active: {len(self.tracking_objects)}"
        cv2.putText(frame, count_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        zone_info = f"Zone: {x},{y} {w}x{h}"
        cv2.putText(frame, zone_info, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        return frame

    def process_video(self, video_source, output_path=None, image_output_dir=None):
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
            annotated = self.draw_results(frame)

            if writer:
                writer.write(annotated)

            cv2.imshow("Trolley Object Counter", annotated)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('w'):
                x, y, w, h = self.counting_zone
                self.counting_zone = (x, max(0, y - 10), w, h)
            elif key == ord('s'):
                x, y, w, h = self.counting_zone
                self.counting_zone = (x, min(height - h, y + 10), w, h)
            elif key == ord('a'):
                x, y, w, h = self.counting_zone
                self.counting_zone = (max(0, x - 10), y, w, h)
            elif key == ord('d'):
                x, y, w, h = self.counting_zone
                self.counting_zone = (min(width - w, x + 10), y, w, h)

        cap.release()
        if writer:
            writer.release()
        cv2.destroyAllWindows()

        results = {
            'total_counted': len(self.counted_objects),
            'frames_processed': None,  # you can count frames if needed
            'images_captured': len(self.captured_images),
            'detections': self.counted_objects,
            'video_info': {'width': width, 'height': height, 'fps': fps}
        }
        print(json.dumps(results, indent=2, default=str))
        return results

def main():
    if len(sys.argv) < 2:
        print("Usage: python trolley_object_counter.py <video_path> [output_path] [--images <image_dir>]")
        sys.exit(1)

    video_path = sys.argv[1]
    output_path = None
    image_dir = None

    if len(sys.argv) > 2:
        output_path = sys.argv[2]
    if '--images' in sys.argv:
        i = sys.argv.index('--images')
        if i + 1 < len(sys.argv):
            image_dir = sys.argv[i+1]

    counter = TrolleyObjectCounter(confidence_threshold=0.5, capture_images=True)
    counter.process_video(video_path, output_path, image_dir)

if __name__ == "__main__":
    main()