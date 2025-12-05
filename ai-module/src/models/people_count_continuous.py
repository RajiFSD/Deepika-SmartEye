import sys
import time
import json
import cv2
import numpy as np
import requests
from collections import OrderedDict
from math import hypot

try:
    from ultralytics import YOLO
except ImportError:
    print("ERROR: ultralytics not installed in this venv.")
    print("Run: venv\\Scripts\\python.exe -m pip install ultralytics")
    sys.exit(1)


# -----------------------------
# Simple Centroid Tracker
# -----------------------------
class CentroidTracker:
    def __init__(self, max_disappeared=30, max_distance=50):
        self.nextObjectID = 1
        self.objects = OrderedDict()         # id -> (cx, cy)
        self.disappeared = OrderedDict()     # id -> frames disappeared
        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        self.objects[self.nextObjectID] = centroid
        self.disappeared[self.nextObjectID] = 0
        self.nextObjectID += 1

    def deregister(self, objectID):
        if objectID in self.objects:
            del self.objects[objectID]
        if objectID in self.disappeared:
            del self.disappeared[objectID]

    def update(self, rects):
        # rects: list of (startX, startY, endX, endY)
        if len(rects) == 0:
            # mark existing as disappeared
            for objectID in list(self.disappeared.keys()):
                self.disappeared[objectID] += 1
                if self.disappeared[objectID] > self.max_disappeared:
                    self.deregister(objectID)
            return self.objects

        # compute centroids
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

            # compute distance matrix
            D = np.zeros((len(objectCentroids), len(inputCentroids)))
            for i, (oX, oY) in enumerate(objectCentroids):
                for j, (iX, iY) in enumerate(inputCentroids):
                    D[i, j] = hypot(oX - iX, oY - iY)

            # for each existing object, assign nearest new centroid
            usedRows = set()
            usedCols = set()

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

            # any unassigned objectIDs -> disappeared
            for row in range(D.shape[0]):
                if row not in usedRows:
                    objectID = objectIDs[row]
                    self.disappeared[objectID] += 1
                    if self.disappeared[objectID] > self.max_disappeared:
                        self.deregister(objectID)

            # any unassigned centroids -> new objects
            for col in range(D.shape[1]):
                if col not in usedCols:
                    self.register(inputCentroids[col])

        return self.objects


# -----------------------------
# People Counter (standalone)
# -----------------------------
class PeopleCounter:
    def __init__(self, direction_mode="LEFT_RIGHT", line_pos=None):
        """
        direction_mode: "LEFT_RIGHT", "RIGHT_LEFT", "UP_DOWN", "DOWN_UP", "BOTH"
        line_pos: None => auto (middle of frame)
        """
        self.direction_mode = direction_mode
        self.line_pos = line_pos  # set later when frame size known

        self.tracker = CentroidTracker(max_disappeared=15, max_distance=60)
        self.track_history = {}  # id -> last centroid

        self.entered_total = 0
        self.exited_total = 0

    def update_counts(self, objects, frame_shape):
        if self.line_pos is None:
            h, w = frame_shape[:2]
            if self.direction_mode in ("LEFT_RIGHT", "RIGHT_LEFT"):
                self.line_pos = w // 2
            else:
                self.line_pos = h // 2

        for objectID, (cX, cY) in objects.items():
            prev = self.track_history.get(objectID, None)
            self.track_history[objectID] = (cX, cY)

            if prev is None:
                continue

            pX, pY = prev

            if self.direction_mode == "LEFT_RIGHT":
                if pX < self.line_pos <= cX:
                    self.entered_total += 1
                elif pX > self.line_pos >= cX:
                    self.exited_total += 1

            elif self.direction_mode == "RIGHT_LEFT":
                if pX > self.line_pos >= cX:
                    self.entered_total += 1
                elif pX < self.line_pos <= cX:
                    self.exited_total += 1

            elif self.direction_mode == "UP_DOWN":
                if pY < self.line_pos <= cY:
                    self.entered_total += 1
                elif pY > self.line_pos >= cY:
                    self.exited_total += 1

            elif self.direction_mode == "DOWN_UP":
                if pY > self.line_pos >= cY:
                    self.entered_total += 1
                elif pY < self.line_pos <= cY:
                    self.exited_total += 1
            else:
                # BOTH: just count any crossing as entered
                if (pX < self.line_pos <= cX) or (pX > self.line_pos >= cX) or \
                   (pY < self.line_pos <= cY) or (pY > self.line_pos >= cY):
                    self.entered_total += 1

    def get_counts(self, objects):
        inside = len(objects)
        return {
            "inside": inside,
            "entered": self.entered_total,
            "exited": self.exited_total
        }


# -----------------------------
# Main loop
# -----------------------------
def main():
    if len(sys.argv) < 4:
        print("Usage: python people_count_continuous.py <stream_url> <api_url> <direction>")
        sys.exit(1)

    stream_url = sys.argv[1]
    api_url = sys.argv[2]
    direction_mode = sys.argv[3]

    print("=== People Count Continuous ===")
    print(f"Stream URL: {stream_url}")
    print(f"API URL   : {api_url}")
    print(f"Direction : {direction_mode}")

    # Load YOLO model (person class)
    try:
        model = YOLO("yolov8n.pt")  # adjust path/model if needed
    except Exception as e:
        print("ERROR loading YOLO model:", e)
        sys.exit(1)

    # Open video source
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened():
        print("ERROR: Failed to open stream:", stream_url)
        sys.exit(1)

    counter = PeopleCounter(direction_mode=direction_mode)
    last_post_time = 0.0
    post_interval = 0.5  # seconds

    try:
        while True:
            ret, frame = cap.read()
            if not ret or frame is None:
                print("WARNING: Failed to read frame, retrying...")
                time.sleep(0.2)
                continue

            # YOLO inference (only person class: 0)
            try:
                results = model(frame, conf=0.4, imgsz=640, verbose=False, classes=[0])
            except Exception as e:
                print("ERROR during YOLO inference:", e)
                time.sleep(0.2)
                continue

            rects = []
            detections = []

            for r in results:
                for box in r.boxes:
                    cls = int(box.cls[0])
                    if cls != 0:
                        continue  # person only

                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().tolist()
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                    rects.append((x1, y1, x2, y2))
                    detections.append({
                        "bbox": [x1, y1, x2, y2],
                        "confidence": conf
                    })

            objects = counter.tracker.update(rects)
            counter.update_counts(objects, frame.shape)
            counts = counter.get_counts(objects)

            now = time.time()
            if now - last_post_time >= post_interval:
                payload = {
                    "inside": counts["inside"],
                    "entered": counts["entered"],
                    "exited": counts["exited"],
                    "direction": direction_mode,
                    "timestamp": now,
                    "objects": [
                        {
                            "id": int(obj_id),
                            "cx": int(cx),
                            "cy": int(cy)
                        }
                        for obj_id, (cx, cy) in objects.items()
                    ]
                }

                # Send to backend
                try:
                    resp = requests.post(api_url, json=payload, timeout=1.0)
                    # Optional: print status for debug
                    # print("POST", resp.status_code, payload)
                except Exception as e:
                    print("WARNING: Failed to POST to API:", e)

                # Also print JSON line for Node stdout parser (if you use it)
                print(json.dumps(payload))

                last_post_time = now

            # Small sleep to avoid maxing CPU
            time.sleep(0.01)

    except KeyboardInterrupt:
        print("Interrupted by user.")
    finally:
        cap.release()
        print("Stream closed. Exiting.")


if __name__ == "__main__":
    main()