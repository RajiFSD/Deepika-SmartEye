#!/usr/bin/env python3
"""
object_counter_full.py

Detect, track and count products on a conveyor using YOLOv8 + centroid tracker.
Features:
 - Region-based counting (green box)
 - Line-cross counting
 - Both modes enabled by default (mode C)
 - Always-visible Total + Active counters
 - Final freeze-frame summary appended to output
 - Headless-friendly (no imshow); writes annotated video

Dependencies:
  pip install ultralytics opencv-python numpy

Usage examples:
  # Default (uses uploaded video path, auto-line/region computed)
  python object_counter_full.py

  # Custom input + explicit region + line + direction
  python object_counter_full.py --input "/mnt/data/Product counting on a high speed conveyor line.mp4" \
    --output out.mp4 --region 250,220,520,360 --line 50,330,590,330 --direction right

  # Auto compute region/line from a saved frame (you can supply --save-start-frame)
  python object_counter_full.py --start-frame 150 --save-start-frame frame150.jpg --auto-line --auto-region
"""

import argparse
import os
import sys
import math
import cv2
import numpy as np
from collections import defaultdict
from ultralytics import YOLO

# -----------------------
# Centroid tracker
# -----------------------
class CentroidTracker:
    def __init__(self, max_disappeared=30, iou_threshold=0.25):
        self.next_id = 0
        self.objects = {}      # id -> bbox
        self.disappeared = {}  # id -> frames missed
        self.history = defaultdict(list)  # id -> list of centroids
        self.iou_threshold = iou_threshold
        self.max_disappeared = max_disappeared

    @staticmethod
    def centroid(box):
        x1, y1, x2, y2 = box
        return ((x1 + x2) / 2.0, (y1 + y2) / 2.0)

    @staticmethod
    def iou(a, b):
        xA = max(a[0], b[0]); yA = max(a[1], b[1])
        xB = min(a[2], b[2]); yB = min(a[3], b[3])
        interW = max(0, xB - xA); interH = max(0, yB - yA)
        inter = interW * interH
        areaA = max(0, a[2]-a[0]) * max(0, a[3]-a[1])
        areaB = max(0, b[2]-b[0]) * max(0, b[3]-b[1])
        union = areaA + areaB - inter
        return inter / union if union > 0 else 0.0

    def update(self, detections):
        """
        detections: list of boxes [x1,y1,x2,y2]
        returns: list of active IDs
        """
        if len(self.objects) == 0:
            for box in detections:
                self.objects[self.next_id] = box
                self.disappeared[self.next_id] = 0
                self.history[self.next_id].append(self.centroid(box))
                self.next_id += 1
            return list(self.objects.keys())

        obj_ids = list(self.objects.keys())
        obj_boxes = [self.objects[i] for i in obj_ids]

        if len(detections) == 0:
            # increment disappeared counters
            to_remove = []
            for oid in obj_ids:
                self.disappeared[oid] = self.disappeared.get(oid, 0) + 1
                if self.disappeared[oid] > self.max_disappeared:
                    to_remove.append(oid)
            for r in to_remove:
                self.objects.pop(r, None); self.disappeared.pop(r, None); self.history.pop(r, None)
            return list(self.objects.keys())

        # compute IoU matrix
        iou_matrix = np.zeros((len(obj_boxes), len(detections)), dtype=float)
        for i, ob in enumerate(obj_boxes):
            for j, db in enumerate(detections):
                iou_matrix[i, j] = self.iou(ob, db)

        # greedy matching
        matched_obj = set()
        matched_det = set()
        pairs = []
        flat = []
        for i in range(iou_matrix.shape[0]):
            for j in range(iou_matrix.shape[1]):
                flat.append((iou_matrix[i, j], i, j))
        flat.sort(reverse=True, key=lambda x: x[0])
        for score, i, j in flat:
            if score < self.iou_threshold:
                break
            if i in matched_obj or j in matched_det:
                continue
            matched_obj.add(i); matched_det.add(j)
            pairs.append((i, j))

        used_det = set()
        # update matched
        for i, j in pairs:
            oid = obj_ids[i]
            db = detections[j]
            self.objects[oid] = db
            self.disappeared[oid] = 0
            c = self.centroid(db)
            self.history[oid].append(c)
            used_det.add(j)

        # unmatched detections -> new objects
        for j, db in enumerate(detections):
            if j in used_det:
                continue
            oid = self.next_id
            self.objects[oid] = db
            self.disappeared[oid] = 0
            self.history[oid].append(self.centroid(db))
            self.next_id += 1

        # unmatched objects -> increase disappeared & remove stale
        for i, oid in enumerate(obj_ids):
            if i not in [p[0] for p in pairs]:
                self.disappeared[oid] = self.disappeared.get(oid, 0) + 1
                if self.disappeared[oid] > self.max_disappeared:
                    self.objects.pop(oid, None); self.disappeared.pop(oid, None); self.history.pop(oid, None)

        return list(self.objects.keys())

# -----------------------
# Utilities
# -----------------------
def parse_line(s):
    parts = s.split(',')
    if len(parts) != 4:
        raise ValueError("line must be x1,y1,x2,y2")
    return tuple(int(p) for p in parts)

def parse_region(s):
    parts = s.split(',')
    if len(parts) != 4:
        raise ValueError("region must be x1,y1,x2,y2")
    return tuple(int(p) for p in parts)

def point_line_side(px, py, x1, y1, x2, y2):
    # signed area (positive one side, negative other)
    return (x2 - x1)*(py - y1) - (y2 - y1)*(px - x1)

def auto_line_from_image(image_path, frac=0.60):
    if not os.path.exists(image_path):
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    y = int(h * frac)
    x1 = int(w * 0.05)
    x2 = int(w * 0.95)
    return (x1, y, x2, y)

def auto_region_from_image(image_path, top_frac=0.45, bottom_frac=0.80):
    if not os.path.exists(image_path):
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    y1 = int(h * top_frac)
    y2 = int(h * bottom_frac)
    x1 = int(w * 0.10)
    x2 = int(w * 0.90)
    return (x1, y1, x2, y2)

def overlay_final_summary(frame, total_count, active_count):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    alpha = 0.7
    cv2.rectangle(overlay, (0, int(h*0.35)), (w, h), (0,0,0), -1)
    cv2.addWeighted(overlay, alpha, frame, 1-alpha, 0, frame)
    text_total = f"FINAL TOTAL: {total_count}"
    text_active = f"ACTIVE: {active_count}"
    cv2.putText(frame, text_total, (int(w*0.05), int(h*0.6)), cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0,255,0), 5, cv2.LINE_AA)
    cv2.putText(frame, text_active, (int(w*0.05), int(h*0.75)), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200,200,200), 3, cv2.LINE_AA)
    return frame

# -----------------------
# Main
# -----------------------
def main():
    default_input = "Sorting Amazon Packages.mp4"
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i", default=default_input, help="Input video path")
    ap.add_argument("--output", "-o", default="conveyor_counted_out.mp4", help="Output annotated video")
    ap.add_argument("--model", default="yolov8s.pt", help="YOLO model path/name")
    ap.add_argument("--start-frame", type=int, default=0, help="Frame to start processing")
    ap.add_argument("--save-start-frame", default=None, help="Save start-frame image for picking line/region")
    ap.add_argument("--line", default=None, help="Crossing line x1,y1,x2,y2")
    ap.add_argument("--region", default=None, help="Counting region x1,y1,x2,y2")
    ap.add_argument("--auto-line", action="store_true", help="Auto line from image")
    ap.add_argument("--auto-region", action="store_true", help="Auto region from image")
    ap.add_argument("--auto-line-frame", default="/mnt/data/frame150.jpg", help="Image used for auto-line/region")
    ap.add_argument("--direction", choices=['left','right','up','down'], default='right', help="Counting direction")
    ap.add_argument("--conf", type=float, default=0.35, help="YOLO confidence")
    ap.add_argument("--min-frames", type=int, default=3, help="Min frames seen to count")
    ap.add_argument("--freeze-sec", type=float, default=2.0, help="Seconds to freeze final frame")
    args = ap.parse_args()

    # verify input
    if not os.path.exists(args.input):
        print("Input video not found:", args.input)
        sys.exit(1)

    # open capture
    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        print("Could not open input:", args.input)
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # seek start
    if args.start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, args.start_frame)

    # option: save start frame
    if args.save_start_frame:
        ret, f0 = cap.read()
        if ret:
            cv2.imwrite(args.save_start_frame, f0)
            print("Saved start-frame to", args.save_start_frame)
            cap.set(cv2.CAP_PROP_POS_FRAMES, args.start_frame)
        else:
            print("Failed to save start frame")

    # determine line and region
    if args.line:
        x1, y1, x2, y2 = parse_line(args.line)
    elif args.auto_line:
        auto = auto_line_from_image(args.auto_line_frame)
        if auto:
            x1, y1, x2, y2 = auto
            print("Auto line:", (x1,y1,x2,y2))
        else:
            # default horizontal at 60% height
            y = int(H * 0.60)
            x1, y1, x2, y2 = int(W*0.05), y, int(W*0.95), y
            print("Auto-line fallback used")
    else:
        # default horizontal line at 60% height
        y = int(H * 0.60)
        x1, y1, x2, y2 = int(W*0.05), y, int(W*0.95), y

    if args.region:
        rx1, ry1, rx2, ry2 = parse_region(args.region)
    elif args.auto_region:
        auto_r = auto_region_from_image(args.auto_line_frame)
        if auto_r:
            rx1, ry1, rx2, ry2 = auto_r
            print("Auto region:", (rx1,ry1,rx2,ry2))
        else:
            # fallback region
            rx1, ry1, rx2, ry2 = int(W*0.2), int(H*0.45), int(W*0.8), int(H*0.80)
            print("Auto-region fallback used")
    else:
        # default region near lower half
        rx1, ry1, rx2, ry2 = int(W*0.2), int(H*0.45), int(W*0.8), int(H*0.80)

    print("Using line:", (x1,y1,x2,y2), "region:", (rx1,ry1,rx2,ry2), "direction:", args.direction)

    # load model
    model = YOLO(args.model)

    # prepare writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    tmp_out = args.output + ".tmp.mp4"
    writer = cv2.VideoWriter(tmp_out, fourcc, fps, (W, H))

    # tracker & counters
    tracker = CentroidTracker(max_disappeared=30, iou_threshold=0.25)
    counted_ids = set()
    total_count = 0

    frame_idx = args.start_frame
    print("Processing... (frames may be large, this can take time)")

    last_active_count = 0
    last_frame_written = None

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # detect
        results = model(frame, conf=args.conf, verbose=False)
        dets = []
        for r in results:
            for box in r.boxes:
                x1b, y1b, x2b, y2b = map(int, box.xyxy[0])
                # optional: filter small boxes
                if (x2b - x1b) < 6 or (y2b - y1b) < 6:
                    continue
                dets.append((x1b, y1b, x2b, y2b))

        active_ids = tracker.update(dets)
        active_count = len(active_ids)

        # region-based counting and line crossing
        for oid in active_ids:
            hist = tracker.history.get(oid, [])
            if len(hist) < 2:
                continue
            prev_cent = hist[-2]
            curr_cent = hist[-1]

            # check region entry: count when centroid enters and not yet counted
            cx, cy = curr_cent
            was_in_region = False
            if len(hist) >= 2:
                px, py = prev_cent
                was_in_region = (rx1 <= px <= rx2 and ry1 <= py <= ry2)
            is_in_region = (rx1 <= cx <= rx2 and ry1 <= cy <= ry2)

            if is_in_region and (not was_in_region) and oid not in counted_ids and len(hist) >= args.min_frames:
                # optional direction check based on movement vector
                p_prev = hist[-3] if len(hist) >= 3 else hist[0]
                dx = cx - p_prev[0]; dy = cy - p_prev[1]
                ok = False
                if args.direction == 'right' and dx > 2.0:
                    ok = True
                elif args.direction == 'left' and dx < -2.0:
                    ok = True
                elif args.direction == 'down' and dy > 2.0:
                    ok = True
                elif args.direction == 'up' and dy < -2.0:
                    ok = True
                if ok:
                    counted_ids.add(oid)
                    total_count += 1

            # line crossing detection (in addition to region)
            prev_side = point_line_side(prev_cent[0], prev_cent[1], x1, y1, x2, y2)
            curr_side = point_line_side(curr_cent[0], curr_cent[1], x1, y1, x2, y2)
            crossed = (prev_side <= 0 and curr_side > 0) or (prev_side >= 0 and curr_side < 0)
            if crossed and oid not in counted_ids and len(hist) >= args.min_frames:
                # direction check
                p_prev = hist[-3] if len(hist) >= 3 else hist[0]
                dx = curr_cent[0] - p_prev[0]; dy = curr_cent[1] - p_prev[1]
                ok = False
                if args.direction == 'right' and dx > 2.0:
                    ok = True
                elif args.direction == 'left' and dx < -2.0:
                    ok = True
                elif args.direction == 'down' and dy > 2.0:
                    ok = True
                elif args.direction == 'up' and dy < -2.0:
                    ok = True
                if ok:
                    counted_ids.add(oid)
                    total_count += 1

        # draw region and line and boxes
        # translucent region box
        overlay = frame.copy()
        cv2.rectangle(overlay, (rx1, ry1), (rx2, ry2), (0, 200, 0), -1)
        cv2.addWeighted(overlay, 0.12, frame, 0.88, 0, frame)
        # region border
        cv2.rectangle(frame, (rx1, ry1), (rx2, ry2), (0, 200, 0), 2)
        # counting line
        cv2.line(frame, (x1, y1), (x2, y2), (0, 255, 255), 2)

        for oid in active_ids:
            box = tracker.objects.get(oid)
            if not box:
                continue
            bx1, by1, bx2, by2 = map(int, box)
            color = (0, 200, 255) if oid not in counted_ids else (0, 255, 0)
            cv2.rectangle(frame, (bx1, by1), (bx2, by2), color, 2)
            cent = tracker.centroid(box)
            cv2.circle(frame, (int(cent[0]), int(cent[1])), 3, color, -1)
            cv2.putText(frame, f"ID:{oid}", (bx1, max(by1-6, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # top-left counters
        cv2.putText(frame, f"Total: {total_count}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Active: {active_count}", (10, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200,200,200), 2, cv2.LINE_AA)

        writer.write(frame)
        last_active_count = active_count
        last_frame_written = frame.copy()
        frame_idx += 1

    cap.release()
    writer.release()

    # prepare final freeze frame with final overlay
    final_frame = last_frame_written if last_frame_written is not None else (255 * np.ones((H, W, 3), dtype=np.uint8))
    final_frame = overlay_final_summary(final_frame, total_count, last_active_count)

    # append freeze frames
    freeze_frames = max(1, int(round(args.freeze_sec * fps)))
    tmp_in = args.output + ".tmp.mp4"
    tmp_out = args.output
    # write final file by copying tmp and appending freeze frames
    cap2 = cv2.VideoCapture(tmp_in)
    writer2 = cv2.VideoWriter(tmp_out, fourcc, fps, (W, H))
    while True:
        ret, f = cap2.read()
        if not ret:
            break
        writer2.write(f)
    cap2.release()
    for _ in range(freeze_frames):
        writer2.write(final_frame)
    writer2.release()

    # cleanup temp
    try:
        os.remove(tmp_in)
    except Exception:
        pass

    print("Done. FINAL TOTAL:", total_count)
    print("Saved:", args.output)

if __name__ == "__main__":
    main()
