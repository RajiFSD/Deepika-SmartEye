import cv2
import numpy as np
from ultralytics import YOLO
from collections import defaultdict

# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
MODEL = "yolov8s.pt"         # any YOLOv8 model
CAP_SOURCE = 0               # webcam
# Example for RTSP:
# CAP_SOURCE = "rtsp://user:pass@192.168.1.20:554/stream1"

CONF_THRESHOLD = 0.45
IOU_MATCH_THRESHOLD = 0.35
MIN_FRAMES_FOR_COUNT = 3     # avoid false detections

# ---------------------------------------------------------
# Simple Tracker (NO DeepSORT)
# ---------------------------------------------------------
class SimpleTracker:
    def __init__(self):
        self.next_id = 0
        self.tracks = {}          # id → bbox
        self.disappeared = {}     # id → number of miss frames
        self.counted = set()      # ids counted
        self.frames_seen = defaultdict(int)

    @staticmethod
    def iou(boxA, boxB):
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        inter = max(0, xB - xA) * max(0, yB - yA)
        areaA = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
        areaB = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
        union = areaA + areaB - inter
        return inter / union if union > 0 else 0

    def update(self, detections):
        matched = set()
        used_tracks = set()

        # match detections with existing tracks
        for det in detections:
            best_iou = 0
            best_id = None

            for tid, tb in self.tracks.items():
                i = self.iou(det, tb)
                if i > best_iou and i > IOU_MATCH_THRESHOLD:
                    best_iou = i
                    best_id = tid

            if best_id is not None:
                self.tracks[best_id] = det
                matched.add(best_id)
                self.frames_seen[best_id] += 1
                used_tracks.add(best_id)
            else:
                # new ID
                new_id = self.next_id
                self.next_id += 1
                self.tracks[new_id] = det
                self.frames_seen[new_id] = 1
                matched.add(new_id)
                used_tracks.add(new_id)

        # remove disappeared tracks
        to_remove = []
        for tid in list(self.tracks.keys()):
            if tid not in used_tracks:
                self.disappeared[tid] = self.disappeared.get(tid, 0) + 1
                if self.disappeared[tid] > 20:
                    to_remove.append(tid)

        for tid in to_remove:
            del self.tracks[tid]
            if tid in self.disappeared:
                del self.disappeared[tid]

        return matched

# ---------------------------------------------------------
# Main
# ---------------------------------------------------------
def main():
    model = YOLO(MODEL)
    tracker = SimpleTracker()

    cap = cv2.VideoCapture(CAP_SOURCE)

    if not cap.isOpened():
        print("❌ Could not open video source!")
        return

    total_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # YOLO inference
        results = model(frame, conf=CONF_THRESHOLD, verbose=False)
        detections = []

        for r in results:
            for box in r.boxes:
                cls = int(box.cls)
                conf = float(box.conf)
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # add bbox
                detections.append((x1, y1, x2, y2))

        # update tracker
        active_ids = tracker.update(detections)

        # draw results
        for tid in active_ids:
            x1, y1, x2, y2 = tracker.tracks[tid]

            color = (0, 255, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"ID:{tid}", (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            # count logic
            if tracker.frames_seen[tid] >= MIN_FRAMES_FOR_COUNT and tid not in tracker.counted:
                tracker.counted.add(tid)
                total_count += 1

        cv2.putText(frame, f"Total Count: {total_count}",
                    (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 200, 0), 2)

        cv2.imshow("Object Counter", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
