"""
line_counter.py

Generic line-crossing counter for:
- People counting (temple, entrance, corridor)
- Object counting (conveyor belt)

Usage examples (from your models folder):

1) Temple people counting from file:
   python line_counter.py --source input.mp4 --mode person --no-show --output out_temp.mp4

2) Live CCTV (webcam index 0) for people:
   python line_counter.py --source 0 --mode person

3) Conveyor object counting (using YOLO class 0 by default or custom model):
   python line_counter.py --source conveyor.mp4 --mode object --no-show --output out_conv.mp4
"""

import argparse
import math
import time
from typing import List, Tuple, Dict, Optional, Set

import cv2
import numpy as np
from ultralytics import YOLO


# =========================
# CONFIG (adjust for your scene)
# =========================

# For a horizontal line (y = constant) across the frame
LINE_Y = 300          # adjust based on your video height
LINE_THICKNESS = 2

# Directions:
#  - For temple entrance: people moving from bottom to top -> use "up"
#  - For conveyor (objects moving from left to right or right to left),
#    you can still use a horizontal line and count just crossing, or
#    adapt logic for vertical line if needed.
COUNT_DIRECTION = "any"  # "up", "down", or "any"

# Tracker parameters
MAX_MISSED = 15      # how many frames a track can be missing before deleted
IOU_THRESH = 0.3


# =========================
# Simple Tracker
# =========================

class Track:
    def __init__(self, track_id: int, bbox: Tuple[int, int, int, int]):
        self.id = track_id
        self.bbox = bbox
        self.missed = 0
        self.history = []  # list of centroids

    @property
    def centroid(self):
        x1, y1, x2, y2 = self.bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


class SimpleTracker:
    """
    Very simple IOU-based tracker for static CCTV.
    """

    def __init__(self, max_missed: int = MAX_MISSED, iou_thresh: float = IOU_THRESH):
        self.tracks: Dict[int, Track] = {}
        self.next_id = 1
        self.max_missed = max_missed
        self.iou_thresh = iou_thresh

    @staticmethod
    def iou(b1, b2) -> float:
        x11, y11, x12, y12 = b1
        x21, y21, x22, y22 = b2
        xi1, yi1 = max(x11, x21), max(y11, y21)
        xi2, yi2 = min(x12, x22), min(y12, y22)
        w = max(0, xi2 - xi1)
        h = max(0, yi2 - yi1)
        inter = w * h
        if inter <= 0:
            return 0.0
        a1 = (x12 - x11) * (y12 - y11)
        a2 = (x22 - x21) * (y22 - y21)
        union = a1 + a2 - inter
        if union <= 0:
            return 0.0
        return inter / union

    def update(self, detections: List[Tuple[int, int, int, int]]) -> Dict[int, Track]:
        # Mark all existing tracks as missed by default
        for t in self.tracks.values():
            t.missed += 1

        # If no detections, just clean up
        if not detections:
            to_del = [tid for tid, t in self.tracks.items() if t.missed > self.max_missed]
            for tid in to_del:
                del self.tracks[tid]
            return self.tracks

        # Associate detections to existing tracks using greedy IoU
        assigned_dets = set()
        for det in detections:
            best_iou = 0.0
            best_id = None
            for tid, tr in self.tracks.items():
                iou_val = self.iou(tr.bbox, det)
                if iou_val > best_iou and iou_val >= self.iou_thresh:
                    best_iou = iou_val
                    best_id = tid

            if best_id is not None:
                # Assign detection to this track
                tr = self.tracks[best_id]
                tr.bbox = det
                tr.missed = 0
                assigned_dets.add(det)
                tr.history.append(tr.centroid)

        # Unassigned detections -> new tracks
        for det in detections:
            if det in assigned_dets:
                continue
            new_track = Track(self.next_id, det)
            new_track.history.append(new_track.centroid)
            self.tracks[self.next_id] = new_track
            self.next_id += 1

        # Remove dead tracks
        to_del = [tid for tid, t in self.tracks.items() if t.missed > self.max_missed]
        for tid in to_del:
            del self.tracks[tid]

        return self.tracks


# =========================
# YOLO-based detector
# =========================

class Detector:
    def __init__(self, model_name="yolov8n.pt", mode="person", conf_thresh=0.3, cls_id=0):
        """
        mode: "person" or "object"
        cls_id:
          - for 'person' with COCO model, person is class 0
          - for custom conveyor model, set appropriate class id
        """
        self.model = YOLO(model_name)
        self.mode = mode
        self.conf_thresh = conf_thresh
        self.cls_id = cls_id

    def detect(self, frame) -> List[Tuple[int, int, int, int]]:
        """
        Returns list of bboxes (x1, y1, x2, y2).
        """
        results = self.model(frame, verbose=False)[0]
        bboxes = []

        if results.boxes is None:
            return bboxes

        for box in results.boxes:
            cls = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            if conf < self.conf_thresh:
                continue

            if self.mode == "person":
                if cls != 0:  # person in COCO
                    continue
            else:
                # object mode: either filter by cls_id or take all
                if self.cls_id >= 0 and cls != self.cls_id:
                    continue

            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            bboxes.append((int(x1), int(y1), int(x2), int(y2)))

        return bboxes


# =========================
# Counting logic
# =========================

def check_crossing(prev_y: float, curr_y: float, line_y: int, direction: str) -> bool:
    """
    Returns True if path from prev_y to curr_y crosses line_y
    according to the direction.
    """
    if direction == "up":
        # moved from below the line to above
        return prev_y > line_y and curr_y <= line_y
    elif direction == "down":
        # moved from above the line to below
        return prev_y < line_y and curr_y >= line_y
    else:  # "any"
        # crossed line in any direction
        crossed_up = prev_y > line_y and curr_y <= line_y
        crossed_down = prev_y < line_y and curr_y >= line_y
        return crossed_up or crossed_down


def run_counter(
    source: str,
    mode: str = "person",
    model_name: str = "yolov8n.pt",
    conf_thresh: float = 0.3,
    class_id: int = 0,
    output_path: Optional[str] = None,
    process_fps: Optional[float] = None,
    show_window: bool = True,
):
    # Prepare source (0 or video path)
    try:
        if len(source) == 1 and source.isdigit():
            src = int(source)
        else:
            src = source
    except Exception:
        src = source

    cap = cv2.VideoCapture(src)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open source: {source}")
        return

    input_fps = cap.get(cv2.CAP_PROP_FPS)
    if input_fps <= 0:
        input_fps = 25.0

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # create writer if needed
    writer = None
    if output_path is not None:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, input_fps, (width, height))

    detector = Detector(model_name=model_name, mode=mode, conf_thresh=conf_thresh, cls_id=class_id)
    tracker = SimpleTracker()

    # For frame skipping (optional)
    process_interval = None
    last_process_time = 0.0
    if process_fps is not None and process_fps > 0:
        process_interval = 1.0 / process_fps

    # Counting state
    total_count = 0
    already_counted: Set[int] = set()  # track IDs that already triggered count

    frame_idx = 0
    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1

        run_det = True
        if process_interval is not None:
            now = time.time()
            if now - last_process_time < process_interval:
                run_det = False
            else:
                last_process_time = now

        if run_det:
            bboxes = detector.detect(frame)
        else:
            # no new detections, but tracker still ages tracks
            bboxes = []

        # Update tracker
        tracks = tracker.update(bboxes)

        # Draw counting line
        cv2.line(
            frame,
            (0, LINE_Y),
            (width, LINE_Y),
            (255, 0, 0),
            LINE_THICKNESS,
        )

        # For each track, check if it crosses counting line
        for tid, tr in tracks.items():
            cx, cy = tr.centroid

            # Get previous y
            if len(tr.history) >= 2:
                prev_cx, prev_cy = tr.history[-2]
            elif len(tr.history) == 1:
                prev_cx, prev_cy = tr.history[0]
            else:
                prev_cx, prev_cy = cx, cy

            # Save current centroid to history
            if not tr.history or tr.history[-1] != (cx, cy):
                tr.history.append((cx, cy))

            if tid not in already_counted:
                if check_crossing(prev_cy, cy, LINE_Y, COUNT_DIRECTION):
                    total_count += 1
                    already_counted.add(tid)

            # Draw bbox and ID
            x1, y1, x2, y2 = tr.bbox
            color = (0, 255, 0) if tid in already_counted else (0, 255, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(
                frame,
                f"ID {tid}",
                (x1, max(15, y1 - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                color,
                1,
                cv2.LINE_AA,
            )

        # Put counter text
        label_mode = "Persons" if mode == "person" else "Objects"
        cv2.putText(
            frame,
            f"{label_mode} counted: {total_count}",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )

        elapsed = time.time() - start_time
        if elapsed > 0:
            fps_str = f"FPS: {frame_idx / elapsed:.1f}"
            cv2.putText(
                frame,
                fps_str,
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        if show_window:
            cv2.imshow("Line Counter", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

        if writer is not None:
            writer.write(frame)

    cap.release()
    if writer is not None:
        writer.release()
    if show_window:
        cv2.destroyAllWindows()

    print("\n==========================")
    print("  PROCESSING FINISHED")
    print("==========================")
    print(f"Total {label_mode.lower()} counted across line: {total_count}")
    print("==========================\n")


# =========================
# CLI
# =========================

def parse_args():
    p = argparse.ArgumentParser(description="Line crossing counter (people / objects)")
    p.add_argument("--source", type=str, required=True, help="Video path, camera index (e.g. '0'), or stream URL")
    p.add_argument("--mode", type=str, default="person", choices=["person", "object"], help="Counting mode")
    p.add_argument("--model", type=str, default="yolov8n.pt", help="YOLO model path or name")
    p.add_argument("--conf", type=float, default=0.3, help="Confidence threshold")
    p.add_argument("--class-id", type=int, default=0, help="Class ID for object mode (ignored for person mode)")
    p.add_argument("--output", type=str, default=None, help="Optional output video path")
    p.add_argument("--process-fps", type=float, default=None, help="Detection FPS (None = every frame)")
    p.add_argument("--no-show", action="store_true", help="Do not display window (for servers / no GUI)")
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run_counter(
        source=args.source,
        mode=args.mode,
        model_name=args.model,
        conf_thresh=args.conf,
        class_id=args.class_id,
        output_path=args.output,
        process_fps=args.process_fps,
        show_window=not args.no_show,
    )
