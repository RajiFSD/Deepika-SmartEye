#!/usr/bin/env python3
"""
People Count Video Processing (save processed video to backend uploads)

Usage:
    python people_count_video.py <video_path> [direction]

Output:
    - JSON printed to stdout with summary, detections and saved video path.
    - Processed video saved to:
        D:/Web APP/Smarteye/backend/uploads/videos/people-count/Output/processed_<inputname>.mp4
"""

import sys
import json
import os
import cv2
import numpy as np
import time
from collections import OrderedDict
from math import hypot

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"success": False, "error": "ultralytics not installed"}))
    sys.exit(1)


def convert_to_native_types(obj):
    """Convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_native_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_native_types(item) for item in obj]
    return obj


class CentroidTracker:
    """Simple centroid-based object tracker"""
    def __init__(self, max_disappeared=30, max_distance=50):
        self.nextObjectID = 1
        self.objects = OrderedDict()
        self.disappeared = OrderedDict()
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        self.objects[self.nextObjectID] = centroid
        self.disappeared[self.nextObjectID] = 0
        obj_id = self.nextObjectID
        self.nextObjectID += 1
        return obj_id

    def deregister(self, objectID):
        if objectID in self.objects:
            del self.objects[objectID]
        if objectID in self.disappeared:
            del self.disappeared[objectID]

    def update(self, rects):
        if len(rects) == 0:
            for objectID in list(self.disappeared.keys()):
                self.disappeared[objectID] += 1
                if self.disappeared[objectID] > self.max_disappeared:
                    self.deregister(objectID)
            return self.objects

        inputCentroids = np.zeros((len(rects), 2), dtype="int")
        for (i, (startX, startY, endX, endY)) in enumerate(rects):
            cX = int((startX + endX) / 2.0)
            cY = int((startY + endY) / 2.0)
            inputCentroids[i] = (cX, cY)

        if len(self.objects) == 0:
            for i in range(0, len(inputCentroids)):
                self.register(inputCentroids[i])
        else:
            objectIDs = list(self.objects.keys())
            objectCentroids = list(self.objects.values())

            D = np.zeros((len(objectCentroids), len(inputCentroids)))
            for i, (oX, oY) in enumerate(objectCentroids):
                for j, (iX, iY) in enumerate(inputCentroids):
                    D[i, j] = hypot(oX - iX, oY - iY)

            usedRows = set()
            usedCols = set()

            # Greedy assignment: each existing object matched to nearest new centroid
            for row in range(D.shape[0]):
                col = int(D[row].argmin())
                if row in usedRows or col in usedCols:
                    continue
                if D[row, col] > self.max_distance:
                    continue

                objectID = objectIDs[row]
                self.objects[objectID] = tuple(inputCentroids[col])
                self.disappeared[objectID] = 0
                usedRows.add(row)
                usedCols.add(col)

            # Unmatched existing objects -> disappeared
            for row in range(D.shape[0]):
                if row not in usedRows:
                    objectID = objectIDs[row]
                    self.disappeared[objectID] += 1
                    if self.disappeared[objectID] > self.max_disappeared:
                        self.deregister(objectID)

            # Unmatched new centroids -> register new object
            for col in range(D.shape[1]):
                if col not in usedCols:
                    self.register(inputCentroids[col])

        return self.objects


class PeopleCounterVideo:
    """People counter for video files with crossing detection and processed output"""
    def __init__(self, direction_mode="LEFT_RIGHT", line_pos=None):
        self.direction_mode = direction_mode
        self.line_pos = line_pos

        self.tracker = CentroidTracker(max_disappeared=20, max_distance=60)
        self.track_history = {}

        # counting by gender (we keep but gender is 'unknown' by default)
        self.entered_male = 0
        self.entered_female = 0
        self.exited_male = 0
        self.exited_female = 0

        self.detections = []  # Store individual detections
        self.detection_id = 1

        # prevents double counting: objectID -> last direction counted ('IN'/'OUT'/None)
        self.crossed_state = {}

    def detect_gender(self, frame, bbox):
        """
        Placeholder gender detection returning 'unknown'.
        Replace with a real model if desired.
        """
        return "unknown"

    def update_counts(self, objects, frame, frame_number, timestamp):
        if self.line_pos is None:
            h, w = frame.shape[:2]
            if self.direction_mode in ("LEFT_RIGHT", "RIGHT_LEFT"):
                self.line_pos = w // 2
            else:
                self.line_pos = h // 2

        for objectID, (cX, cY) in list(objects.items()):
            prev = self.track_history.get(objectID, None)
            self.track_history[objectID] = (cX, cY)

            if prev is None:
                continue

            pX, pY = prev
            direction = None
            crossed = False

            # Determine crossing and direction
            if self.direction_mode == "LEFT_RIGHT":
                if pX < self.line_pos <= cX:
                    direction = "IN"
                    crossed = True
                elif pX > self.line_pos >= cX:
                    direction = "OUT"
                    crossed = True

            elif self.direction_mode == "RIGHT_LEFT":
                if pX > self.line_pos >= cX:
                    direction = "IN"
                    crossed = True
                elif pX < self.line_pos <= cX:
                    direction = "OUT"
                    crossed = True

            elif self.direction_mode == "UP_DOWN":
                if pY < self.line_pos <= cY:
                    direction = "IN"
                    crossed = True
                elif pY > self.line_pos >= cY:
                    direction = "OUT"
                    crossed = True

            elif self.direction_mode == "DOWN_UP":
                if pY > self.line_pos >= cY:
                    direction = "IN"
                    crossed = True
                elif pY < self.line_pos <= cY:
                    direction = "OUT"
                    crossed = True

            # If crossed, ensure we haven't already counted this same crossing for the same object
            if crossed:
                last = self.crossed_state.get(objectID)
                if last == direction:
                    # already counted this direction for this object; skip
                    continue

                # If last is different (or None), count and set state
                self.crossed_state[objectID] = direction

                # Gender detection (placeholder)
                gender = self.detect_gender(frame, (cX - 50, cY - 100, cX + 50, cY + 100))

                # Update counts
                if direction == "IN":
                    if gender == "male":
                        self.entered_male += 1
                    elif gender == "female":
                        self.entered_female += 1
                    else:
                        # unknown: track inside via generic counters later
                        pass
                else:  # OUT
                    if gender == "male":
                        self.exited_male += 1
                    elif gender == "female":
                        self.exited_female += 1
                    else:
                        pass

                # Store detection entry (gender may be 'unknown')
                self.detections.append({
                    "id": self.detection_id,
                    "person_id": f"person_{objectID}",
                    "gender": gender,
                    "direction": direction,
                    "frame_number": frame_number,
                    "timestamp": timestamp,
                    "confidence": 0.85,
                    "position": {"x": int(cX), "y": int(cY)}
                })
                self.detection_id += 1

    def get_summary(self):
        entered = self.entered_male + self.entered_female
        exited = self.exited_male + self.exited_female
        inside = entered - exited
        if inside < 0:
            inside = 0
        return {
            "entered": entered,
            "exited": exited,
            "inside": inside,
            "entered_male": self.entered_male,
            "entered_female": self.entered_female,
            "exited_male": self.exited_male,
            "exited_female": self.exited_female
        }


def safe_make_dirs(path):
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        pass


def process_video(video_path, direction="LEFT_RIGHT", output_dir=r"D:\\Web APP\\Smarteye\\backend\\uploads\\videos\\people-count\\Output"):
    # Prepare output directory
    safe_make_dirs(output_dir)

    # Derive processed filename based on input filename (Option B)
    base = os.path.basename(video_path)
    name, ext = os.path.splitext(base)
    processed_name = f"processed_{name}.mp4"
    output_path = os.path.join(output_dir, processed_name)

    # Load YOLO model
    try:
        model = YOLO("yolov8n.pt")
    except Exception as e:
        return {"success": False, "error": f"Failed to load YOLO model: {str(e)}"}

    # Open video
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {"success": False, "error": f"Failed to open video: {video_path}"}

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    fps = fps if fps and fps > 0 else 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) if cap.get(cv2.CAP_PROP_FRAME_COUNT) else 0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"Processing video: {total_frames} frames at {fps:.2f} FPS ({width}x{height})", file=sys.stderr)

    # VideoWriter
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, float(fps), (width, height))

    counter = PeopleCounterVideo(direction_mode=direction)
    frame_number = 0
    start_time = time.time()

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_number += 1
            timestamp = frame_number / fps if fps > 0 else 0.0

            # YOLO detection (person class only)
            try:
                results = model(frame, conf=0.4, imgsz=640, verbose=False, classes=[0])
            except Exception as e:
                # skip this frame on model error
                print(f"[WARN] YOLO inference failed on frame {frame_number}: {str(e)}", file=sys.stderr)
                continue

            rects = []
            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    if cls != 0:
                        continue
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    rects.append((x1, y1, x2, y2))

            objects = counter.tracker.update(rects)
            counter.update_counts(objects, frame, frame_number, timestamp)

            # Draw info on frame
            # draw crossing line
            if counter.line_pos is not None:
                if counter.direction_mode in ("LEFT_RIGHT", "RIGHT_LEFT"):
                    cv2.line(frame, (counter.line_pos, 0), (counter.line_pos, height), (0, 0, 255), 2)
                else:
                    cv2.line(frame, (0, counter.line_pos), (width, counter.line_pos), (0, 0, 255), 2)

            # draw bounding boxes and ids (approx center)
            for oid, (cx, cy) in objects.items():
                cv2.circle(frame, (int(cx), int(cy)), 4, (0, 255, 0), -1)
                cv2.putText(frame, f"ID:{oid}", (int(cx) - 10, int(cy) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1)

            # draw simple summary overlay
            summary = counter.get_summary()
            overlay_text = f"Entered:{summary['entered']} Exited:{summary['exited']} Inside:{summary['inside']}"
            cv2.putText(frame, overlay_text, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

            # write frame to output
            out.write(frame)

            # progress to stderr every 30 frames
            if frame_number % 30 == 0:
                prog = (frame_number / total_frames * 100) if total_frames > 0 else 0
                print(f"Progress: {prog:.1f}% ({frame_number}/{total_frames})", file=sys.stderr)

    except KeyboardInterrupt:
        print("Interrupted by user.", file=sys.stderr)
    except Exception as e:
        cap.release()
        out.release()
        return {"success": False, "error": f"Processing error: {str(e)}"}

    cap.release()
    out.release()
    processing_time = time.time() - start_time

    # Final summary & result
    summary = counter.get_summary()
    result = {
        "success": True,
        "summary": summary,
        "detections": counter.detections,
        "video_info": {
            "total_frames": total_frames,
            "fps": float(fps),
            "duration": float(total_frames / fps) if fps > 0 else 0.0,
            "processing_time": processing_time,
            "output_path": output_path
        }
    }
    return result


def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python people_count_video.py <video_path> [direction]"
        }))
        sys.exit(1)

    video_path = sys.argv[1]
    direction = sys.argv[2] if len(sys.argv) > 2 else "LEFT_RIGHT"

    print("Starting video processing...", file=sys.stderr)
    print(f"Video: {video_path}", file=sys.stderr)
    print(f"Direction: {direction}", file=sys.stderr)

    result = process_video(video_path, direction)
    print(json.dumps(convert_to_native_types(result)))


if __name__ == "__main__":
    main()