"""
line_counter.py - ENHANCED VERSION

Supports both horizontal and vertical counting lines for any conveyor orientation.

Usage:
1) Horizontal line (for vertical movement - people/objects moving up/down):
   python line_counter.py --source video.mp4 --line-type horizontal --line-pos 400

2) Vertical line (for horizontal movement - objects moving left/right):
   python line_counter.py --source video.mp4 --line-type vertical --line-pos 600
"""

import argparse
import time
from typing import List, Tuple, Dict, Optional, Set

import cv2
import numpy as np
from ultralytics import YOLO


# =========================
# CONFIG
# =========================
LINE_THICKNESS = 4
COUNT_DIRECTION = "any"  # "up", "down", "left", "right", or "any"
MAX_MISSED = 15
IOU_THRESH = 0.3


# =========================
# Simple Tracker
# =========================
class Track:
    def __init__(self, track_id: int, bbox: Tuple[int, int, int, int]):
        self.id = track_id
        self.bbox = bbox
        self.missed = 0
        self.history = []

    @property
    def centroid(self):
        x1, y1, x2, y2 = self.bbox
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)


class SimpleTracker:
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
        for t in self.tracks.values():
            t.missed += 1

        if not detections:
            to_del = [tid for tid, t in self.tracks.items() if t.missed > self.max_missed]
            for tid in to_del:
                del self.tracks[tid]
            return self.tracks

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
                tr = self.tracks[best_id]
                tr.bbox = det
                tr.missed = 0
                assigned_dets.add(det)
                tr.history.append(tr.centroid)

        for det in detections:
            if det in assigned_dets:
                continue
            new_track = Track(self.next_id, det)
            new_track.history.append(new_track.centroid)
            self.tracks[self.next_id] = new_track
            self.next_id += 1

        to_del = [tid for tid, t in self.tracks.items() if t.missed > self.max_missed]
        for tid in to_del:
            del self.tracks[tid]

        return self.tracks


# =========================
# Detector
# =========================
class Detector:
    def __init__(self, model_name="yolov8n.pt", mode="person", conf_thresh=0.3, cls_id=0):
        self.model = YOLO(model_name)
        self.mode = mode
        self.conf_thresh = conf_thresh
        self.cls_id = cls_id

    def detect(self, frame) -> List[Tuple[int, int, int, int]]:
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
                if cls != 0:
                    continue
            else:
                if self.cls_id >= 0 and cls != self.cls_id:
                    continue

            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            bboxes.append((int(x1), int(y1), int(x2), int(y2)))

        return bboxes


# =========================
# Counting Logic - ENHANCED
# =========================
def check_crossing_horizontal(prev_y: float, curr_y: float, line_y: int, direction: str) -> bool:
    """Check if object crossed a horizontal line (for vertical movement)"""
    if direction == "up":
        return prev_y > line_y and curr_y <= line_y
    elif direction == "down":
        return prev_y < line_y and curr_y >= line_y
    else:  # "any"
        crossed_up = prev_y > line_y and curr_y <= line_y
        crossed_down = prev_y < line_y and curr_y >= line_y
        return crossed_up or crossed_down


def check_crossing_vertical(prev_x: float, curr_x: float, line_x: int, direction: str) -> bool:
    """Check if object crossed a vertical line (for horizontal movement)"""
    if direction == "right":
        return prev_x < line_x and curr_x >= line_x
    elif direction == "left":
        return prev_x > line_x and curr_x <= line_x
    else:  # "any"
        crossed_right = prev_x < line_x and curr_x >= line_x
        crossed_left = prev_x > line_x and curr_x <= line_x
        return crossed_right or crossed_left


def run_counter(
    source: str,
    mode: str = "person",
    model_name: str = "yolov8n.pt",
    conf_thresh: float = 0.3,
    class_id: int = 0,
    output_path: Optional[str] = None,
    process_fps: Optional[float] = None,
    show_window: bool = True,
    line_type: str = "horizontal",  # NEW: "horizontal" or "vertical"
    line_position: int = 400,       # NEW: unified parameter for both X and Y
):
    """
    Run object counter with configurable line orientation.
    
    Args:
        line_type: "horizontal" (for vertical movement) or "vertical" (for horizontal movement)
        line_position: Y-coordinate for horizontal line, X-coordinate for vertical line
    """
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
        return 0

    input_fps = cap.get(cv2.CAP_PROP_FPS)
    if input_fps <= 0:
        input_fps = 25.0

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    writer = None
    if output_path is not None:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, input_fps, (width, height))

    detector = Detector(model_name=model_name, mode=mode, conf_thresh=conf_thresh, cls_id=class_id)
    tracker = SimpleTracker()

    process_interval = None
    last_process_time = 0.0
    if process_fps is not None and process_fps > 0:
        process_interval = 1.0 / process_fps

    total_count = 0
    already_counted: Set[int] = set()

    frame_idx = 0
    start_time = time.time()

    print(f"\n🎯 Line Configuration:")
    print(f"   Type: {line_type}")
    print(f"   Position: {line_position}")
    print(f"   Direction: {COUNT_DIRECTION}")
    print(f"   Mode: {mode}")
    print(f"   Confidence: {conf_thresh}\n")

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
            bboxes = []

        tracks = tracker.update(bboxes)

        # Draw counting line based on type
        if line_type == "horizontal":
            # Horizontal line for vertical movement
            cv2.line(frame, (0, line_position), (width, line_position), (255, 0, 0), LINE_THICKNESS)
        else:
            # Vertical line for horizontal movement
            cv2.line(frame, (line_position, 0), (line_position, height), (255, 0, 0), LINE_THICKNESS)

        # Check crossings for each track
        for tid, tr in tracks.items():
            cx, cy = tr.centroid

            # Get previous position
            if len(tr.history) >= 2:
                prev_cx, prev_cy = tr.history[-2]
            elif len(tr.history) == 1:
                prev_cx, prev_cy = tr.history[0]
            else:
                prev_cx, prev_cy = cx, cy

            # Update history
            if not tr.history or tr.history[-1] != (cx, cy):
                tr.history.append((cx, cy))

            # Check crossing based on line type
            if tid not in already_counted:
                crossed = False
                
                if line_type == "horizontal":
                    crossed = check_crossing_horizontal(prev_cy, cy, line_position, COUNT_DIRECTION)
                else:  # vertical
                    crossed = check_crossing_vertical(prev_cx, cx, line_position, COUNT_DIRECTION)
                
                if crossed:
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

        # Display counter
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
    print(f"Total {label_mode.lower()} counted: {total_count}")
    print(f"Line type: {line_type} at position {line_position}")
    print("==========================\n")
    
    return total_count


# =========================
# CLI
# =========================
def parse_args():
    p = argparse.ArgumentParser(description="Enhanced line crossing counter")
    p.add_argument("--source", type=str, required=True, help="Video path or camera index")
    p.add_argument("--mode", type=str, default="person", choices=["person", "object"])
    p.add_argument("--model", type=str, default="yolov8n.pt")
    p.add_argument("--conf", type=float, default=0.3)
    p.add_argument("--class-id", type=int, default=0)
    p.add_argument("--output", type=str, default=None)
    p.add_argument("--process-fps", type=float, default=None)
    p.add_argument("--no-show", action="store_true")
    
    # NEW PARAMETERS
    p.add_argument("--line-type", type=str, default="horizontal", 
                   choices=["horizontal", "vertical"],
                   help="Line orientation: horizontal (for vertical movement) or vertical (for horizontal movement)")
    p.add_argument("--line-pos", type=int, default=400,
                   help="Line position: Y for horizontal, X for vertical")
    
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
        line_type=args.line_type,
        line_position=args.line_pos,
    )