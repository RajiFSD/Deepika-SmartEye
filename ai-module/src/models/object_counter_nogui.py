import cv2
import numpy as np
import sys
from ultralytics import YOLO
from collections import defaultdict

MODEL = "yolov8s.pt"
CONF_THRESHOLD = 0.45
IOU_MATCH_THRESHOLD = 0.35
MIN_FRAMES_FOR_COUNT = 3

class SimpleTracker:
    def __init__(self):
        self.next_id = 0
        self.tracks = {}
        self.disappeared = {}
        self.counted = set()
        self.frames_seen = defaultdict(int)

    @staticmethod
    def iou(a, b):
        xA = max(a[0], b[0])
        yA = max(a[1], b[1])
        xB = min(a[2], b[2])
        yB = min(a[3], b[3])
        inter = max(0, xB - xA) * max(0, yB - yA)
        areaA = (a[2] - a[0]) * (a[3] - a[1])
        areaB = (b[2] - b[0]) * (b[3] - b[1])
        union = areaA + areaB - inter
        return inter / union if union > 0 else 0

    def update(self, detections):
        matched = set()
        used_tracks = set()

        for det in detections:
            best_iou = 0
            best_id = None

            for tid, tbox in self.tracks.items():
                i = self.iou(det, tbox)
                if i > best_iou and i > IOU_MATCH_THRESHOLD:
                    best_iou = i
                    best_id = tid

            if best_id is not None:
                self.tracks[best_id] = det
                self.frames_seen[best_id] += 1
                matched.add(best_id)
                used_tracks.add(best_id)
            else:
                new_id = self.next_id
                self.next_id += 1
                self.tracks[new_id] = det
                self.frames_seen[new_id] = 1
                matched.add(new_id)
                used_tracks.add(new_id)

        # Remove disappeared
        to_delete = []
        for tid in list(self.tracks.keys()):
            if tid not in used_tracks:
                self.disappeared[tid] = self.disappeared.get(tid, 0) + 1
                if self.disappeared[tid] > 20:
                    to_delete.append(tid)

        for tid in to_delete:
            del self.tracks[tid]
            self.disappeared.pop(tid, None)

        return matched


def main():
    if len(sys.argv) < 2:
        print("Usage: python object_counter_nogui.py inputvideo.mp4")
        return

    input_source = sys.argv[1]

    model = YOLO(MODEL)
    tracker = SimpleTracker()

    cap = cv2.VideoCapture(input_source)
    if not cap.isOpened():
        print("❌ Could not open input video")
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    width = int(cap.get(3))
    height = int(cap.get(4))

    out = cv2.VideoWriter(
        "output_counted.mp4",
        cv2.VideoWriter_fourcc(*'mp4v'),
        fps,
        (width, height)
    )

    total_count = 0
    frame_no = 0

    print("🔁 Processing...")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        results = model(frame, conf=CONF_THRESHOLD, verbose=False)
        detections = []

        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                detections.append((x1, y1, x2, y2))

        active_ids = tracker.update(detections)

        for tid in active_ids:
            x1, y1, x2, y2 = tracker.tracks[tid]

            # draw
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 255), 2)
            cv2.putText(frame, f"ID:{tid}",
                        (x1, y1 - 5),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.6, (0, 200, 255), 2)

            # count
            if tracker.frames_seen[tid] >= MIN_FRAMES_FOR_COUNT and tid not in tracker.counted:
                tracker.counted.add(tid)
                total_count += 1

        # show count on video
        cv2.putText(frame, f"Total Count: {total_count}",
                    (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 255, 0), 2)

        out.write(frame)
        frame_no += 1

    cap.release()
    out.release()

    print("✅ Done!")
    print(f"Total Objects Counted: {total_count}")
    print("Saved output to: output_counted.mp4")


if __name__ == "__main__":
    main()
