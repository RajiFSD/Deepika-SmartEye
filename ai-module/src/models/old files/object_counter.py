#!/usr/bin/env python3
"""
Object Counter (debug-enabled)
- All debug / trace prints -> stderr
- Final JSON result -> stdout (single line)
- Uses HOG person detector (OpenCV) by default
"""

import cv2
import numpy as np
import json
import sys
import os
from datetime import datetime
import time
import argparse
import traceback

def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)

class ObjectCounter:
    def __init__(self, confidence_threshold=0.4, capture_images=True, min_hits=2, max_disappeared=40, max_distance=100):
        self.confidence_threshold = confidence_threshold
        self.capture_images = capture_images
        self.tracking_objects = {}
        self.next_object_id = 0
        self.counted_objects = []
        self.captured_images = []
        self.crossed_ids = set()
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance
        self.min_hits = min_hits
        self.counting_zone = None
        self.image_output_dir = None

        # HOG people detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())

        # debug counters
        self.frame_count = 0
        self.detection_count = 0
        self.raw_detections = []

    def detect_objects_hog(self, frame):
        boxes, weights = self.hog.detectMultiScale(
            frame,
            winStride=(4, 4),
            padding=(16, 16),
            scale=1.05,
            hitThreshold=0.0
        )

        detections = []
        self.raw_detections = []

        for i, (x, y, w, h) in enumerate(boxes):
            confidence = float(weights[i])
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

    def register_object(self, detection):
        self.tracking_objects[self.next_object_id] = {
            'centroid': detection['centroid'],
            'bbox': detection['bbox'],
            'class': detection['class'],
            'confidence': detection['confidence'],
            'disappeared': 0,
            'hits': 1,
            'first_seen': datetime.now().isoformat(),
            'last_seen': datetime.now().isoformat(),
            'crossed': False,
            'trajectory': [detection['centroid']]
        }
        self.next_object_id += 1

    def update_tracking(self, detections, frame=None):
        if len(detections) == 0:
            for obj_id in list(self.tracking_objects.keys()):
                self.tracking_objects[obj_id]['disappeared'] += 1
                if self.tracking_objects[obj_id]['disappeared'] > self.max_disappeared:
                    del self.tracking_objects[obj_id]
            return list(self.tracking_objects.keys())

        if len(self.tracking_objects) == 0:
            for detection in detections:
                self.register_object(detection)
            return list(self.tracking_objects.keys())

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
            self.tracking_objects[object_id]['last_seen'] = datetime.now().isoformat()

            if 'trajectory' not in self.tracking_objects[object_id]:
                self.tracking_objects[object_id]['trajectory'] = []
            self.tracking_objects[object_id]['trajectory'].append(new_centroid)

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

    def check_line_crossing(self, object_id, old_centroid, new_centroid, frame):
        if self.tracking_objects[object_id]['crossed']:
            return

        old_y = old_centroid[1]
        new_y = new_centroid[1]
        hysteresis = 5

        if old_y < self.counting_zone - hysteresis and new_y > self.counting_zone + hysteresis:
            self.record_crossing(object_id, 'DOWN', new_centroid, frame)
        elif old_y > self.counting_zone + hysteresis and new_y < self.counting_zone - hysteresis:
            self.record_crossing(object_id, 'UP', new_centroid, frame)

    def record_crossing(self, object_id, direction, centroid, frame):
        try:
            self.tracking_objects[object_id]['crossed'] = True
            self.crossed_ids.add(object_id)
            timestamp = datetime.now().isoformat()

            captured_image = None
            if self.capture_images and frame is not None and self.image_output_dir:
                captured_image = self.capture_detection_image(frame, object_id, self.tracking_objects[object_id]['bbox'], timestamp)

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
            eprint(f"*** COUNTED *** Person {object_id} crossed {direction} | Total: {len(self.counted_objects)}")
        except Exception as e:
            eprint("Error in record_crossing:", str(e))

    def capture_detection_image(self, frame, object_id, bbox, timestamp):
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
            filename = f"person_{object_id}_{timestamp.replace(':', '-').replace('.', '_')}.jpg"
            image_path = os.path.join(self.image_output_dir, filename)
            cv2.imwrite(image_path, detection_img)
            return {'path': image_path, 'filename': filename, 'width': detection_img.shape[1], 'height': detection_img.shape[0]}
        except Exception as e:
            eprint("capture_detection_image error:", str(e))
            return None

    def draw_results(self, frame):
        height, width = frame.shape[:2]
        if self.counting_zone is None:
            self.counting_zone = int(height * 0.65)

        # counting line
        cv2.line(frame, (0, self.counting_zone), (width, self.counting_zone), (0, 255, 255), 3)

        # raw detections
        for det in self.raw_detections:
            x, y, w, h = det['bbox']
            color = (0, 255, 0) if det['accepted'] else (0, 0, 255)
            thickness = 2 if det['accepted'] else 1
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, thickness)
            conf_text = f"{det['confidence']:.2f}"
            cv2.putText(frame, conf_text, (x, y - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

        # tracked objects
        for obj_id, obj in self.tracking_objects.items():
            x, y, w, h = obj['bbox']
            cx, cy = obj['centroid']
            if obj_id in self.crossed_ids:
                color = (0, 255, 0)
                status = "COUNTED"
            elif obj['hits'] >= self.min_hits:
                color = (255, 165, 0)
                status = f"TRACK ({obj['hits']})"
            else:
                color = (255, 255, 0)
                status = f"DETECT ({obj['hits']})"
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
            cv2.circle(frame, (cx, cy), 6, color, -1)
            label = f"ID:{obj_id} {status}"
            cv2.putText(frame, label, (x + 5, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # debug panel top-left
        self.draw_debug_panel(frame)
        return frame

    def draw_debug_panel(self, frame):
        height, width = frame.shape[:2]
        panel_h = 140
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, panel_h), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
        stats = [
            f"PEOPLE COUNTED: {len(self.counted_objects)}",
            f"Currently Tracking: {len(self.tracking_objects)}",
            f"Raw Detections: {len(self.raw_detections)}",
            f"Total Detections: {self.detection_count}",
            f"Frame: {self.frame_count}"
        ]
        y = 25
        for i, s in enumerate(stats):
            sz = 0.8 if i == 0 else 0.6
            col = (0, 255, 255) if i == 0 else (255, 255, 255)
            cv2.putText(frame, s, (10, y), cv2.FONT_HERSHEY_SIMPLEX, sz, col, 2)
            y += 26

    def process_video(self, video_source, output_path=None, image_output_dir=None, confidence=None):
        if image_output_dir:
            self.image_output_dir = image_output_dir
            os.makedirs(self.image_output_dir, exist_ok=True)

        if confidence is not None:
            self.confidence_threshold = confidence

        cap = cv2.VideoCapture(video_source)
        if not cap.isOpened():
            return {'error': f'Cannot open video source: {video_source}'}

        fps = int(cap.get(cv2.CAP_PROP_FPS)) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 640
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 480
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 0

        writer = None
        if output_path:
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

        start_time = time.time()
        eprint(f"[DEBUG] Video info: {width}x{height} @ {fps}fps | total_frames={total_frames}")
        eprint(f"[DEBUG] Confidence threshold: {self.confidence_threshold}")

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            self.frame_count += 1
            detections = self.detect_objects_hog(frame)
            self.update_tracking(detections, frame)
            output_frame = self.draw_results(frame)
            if writer:
                writer.write(output_frame)
            if total_frames > 0 and self.frame_count % max(1, fps * 2) == 0:
                elapsed = time.time() - start_time
                progress = (self.frame_count / total_frames) * 100
                eprint(f"[Frame {self.frame_count}] Progress: {progress:.1f}% | Dets: {len(detections)} | Tracking: {len(self.tracking_objects)} | Counted: {len(self.counted_objects)} | Elapsed: {elapsed:.1f}s")

        cap.release()
        if writer:
            writer.release()

        processing_time = time.time() - start_time
        up_count = sum(1 for obj in self.counted_objects if obj['direction'] == 'UP')
        down_count = sum(1 for obj in self.counted_objects if obj['direction'] == 'DOWN')

        results = {
            'total_counted': len(self.counted_objects),
            'direction_counts': {'UP': up_count, 'DOWN': down_count, 'net': down_count - up_count},
            'frames_processed': self.frame_count,
            'total_detections': self.detection_count,
            'images_captured': len(self.captured_images),
            'detections': self.counted_objects,
            'processing_time': processing_time,
            'video_info': {'width': width, 'height': height, 'fps': fps, 'total_frames': total_frames}
        }

        return results

def main():
    parser = argparse.ArgumentParser(prog="object_counter.py")
    parser.add_argument("video_path", help="Path to input video (file or stream URL)")
    parser.add_argument("output_path", nargs="?", default=None, help="Optional output video path")
    parser.add_argument("--images", dest="images", default=None, help="Directory to save captured images")
    parser.add_argument("--confidence", dest="confidence", type=float, default=0.4, help="Confidence threshold")
    parser.add_argument("--model", dest="model", default="hog", help="Model type (hog supported)")
    args = parser.parse_args()

    if not os.path.exists(args.video_path):
        eprint(json.dumps({'error': f'Video not found: {args.video_path}'}))
        sys.exit(2)

    try:
        counter = ObjectCounter(confidence_threshold=args.confidence, capture_images=bool(args.images))
        results = counter.process_video(args.video_path, args.output_path, args.images, confidence=args.confidence)
        # Write final JSON to stdout only (single-line)
        print(json.dumps(results, default=str), flush=True)
        sys.exit(0)
    except Exception as e:
        eprint("Exception during processing:")
        traceback.print_exc(file=sys.stderr)
        try:
            print(json.dumps({'error': str(e)}), flush=True)
        except:
            eprint("Couldn't print JSON error to stdout")
        sys.exit(1)

if __name__ == "__main__":
    main()
