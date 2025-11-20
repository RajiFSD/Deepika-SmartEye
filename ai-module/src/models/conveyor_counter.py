#!/usr/bin/env python3
"""
conveyor_counter.py

Conveyor-belt object counter with:
 - direction-based line crossing
 - always-visible total + active counters
 - freeze final frame with large final summary
 - start-frame and auto-line support (uses uploaded frame if present)

Usage examples:
  # Save a start frame image (then inspect to pick line coords)
  python conveyor_counter.py --input conveyorproduct1video.webm --start-frame 150 --save-start-frame frame150.jpg

  # Auto choose a horizontal line based on saved frame (frame path defaults to /mnt/data/frame150.jpg if exists)
  python conveyor_counter.py --input conveyorproduct1video.webm --start-frame 150 --auto-line --direction right --output conveyor_counted.mp4

  # Or provide explicit line coordinates (x1,y1,x2,y2)
  python conveyor_counter.py --input conveyorproduct1video.webm --start-frame 150 --line 50,300,590,300 --direction right --output conveyor_counted.mp4
"""

import argparse
import cv2
import numpy as np
from ultralytics import YOLO
from collections import defaultdict
import os
import math
import sys

# -------------------------
# CentroidTracker
# -------------------------
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
        areaA = max(0, a[2] - a[0]) * max(0, a[3] - a[1])
        areaB = max(0, b[2] - b[0]) * max(0, b[3] - b[1])
        union = areaA + areaB - inter
        return inter / union if union > 0 else 0.0

    def update(self, detections):
        """
        detections: list of boxes [x1,y1,x2,y2]
        returns active IDs
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

# -------------------------
# Utils
# -------------------------
def parse_line(s):
    parts = s.split(',')
    if len(parts) != 4:
        raise ValueError("line must be x1,y1,x2,y2")
    return tuple(int(p) for p in parts)

def point_line_side(px, py, x1, y1, x2, y2):
    # signed area (positive one side, negative other)
    return (x2 - x1)*(py - y1) - (y2 - y1)*(px - x1)

# auto-line: choose horizontal line across width at given fraction of height
def auto_line_from_image(image_path, frac=0.60):
    if not os.path.exists(image_path):
        return None
    img = cv2.imread(image_path)
    if img is None:
        return None
    h, w = img.shape[:2]
    y = int(h * frac)
    # choose start/end with small padding
    x1 = int(w * 0.05)
    x2 = int(w * 0.95)
    return (x1, y, x2, y)

# overlay final big summary
def overlay_final_summary(frame, total_count, active_count):
    h, w = frame.shape[:2]
    overlay = frame.copy()
    alpha = 0.7
    # darken background center
    cv2.rectangle(overlay, (0, int(h*0.4)), (w, h), (0,0,0), -1)
    cv2.addWeighted(overlay, alpha, frame, 1-alpha, 0, frame)
    # big text
    text_total = f"FINAL TOTAL: {total_count}"
    text_active = f"ACTIVE: {active_count}"
    cv2.putText(frame, text_total, (int(w*0.05), int(h*0.6)), cv2.FONT_HERSHEY_SIMPLEX, 2.2, (0,255,0), 5, cv2.LINE_AA)
    cv2.putText(frame, text_active, (int(w*0.05), int(h*0.75)), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (200,200,200), 3, cv2.LINE_AA)
    return frame

# -------------------------
# Main
# -------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", "-i", required=True, help="Input video path")
    ap.add_argument("--output", "-o", default="conveyor_out.mp4", help="Output annotated video")
    ap.add_argument("--model", default="yolov8s.pt", help="YOLO model")
    ap.add_argument("--start-frame", type=int, default=0, help="Frame index to start processing from")
    ap.add_argument("--save-start-frame", default=None, help="If set, save the start-frame as image for drawing line")
    ap.add_argument("--line", default=None, help="Crossing line in format x1,y1,x2,y2")
    ap.add_argument("--auto-line", action='store_true', help="Auto compute horizontal line using saved frame or default uploaded frame")
    ap.add_argument("--auto-line-frame", default="/mnt/data/frame150.jpg", help="Frame path to use for auto-line (default uses uploaded frame)")
    ap.add_argument("--direction", choices=['left','right','up','down'], default='right', help="Expected crossing direction")
    ap.add_argument("--conf", type=float, default=0.35, help="YOLO confidence threshold")
    ap.add_argument("--min-frames", type=int, default=3, help="Min frames seen to be counted")
    ap.add_argument("--freeze-sec", type=float, default=2.0, help="Seconds to freeze final frame in output")
    args = ap.parse_args()

    # load model
    model = YOLO(args.model)

    cap = cv2.VideoCapture(args.input)
    if not cap.isOpened():
        print("❌ Cannot open video:", args.input)
        sys.exit(1)

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # seek to start frame if requested
    if args.start_frame > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, args.start_frame)

    # optionally save frame for visual selection
    if args.save_start_frame:
        ret, frame0 = cap.read()
        if ret:
            cv2.imwrite(args.save_start_frame, frame0)
            print(f"Saved start-frame image to {args.save_start_frame}")
            cap.set(cv2.CAP_PROP_POS_FRAMES, args.start_frame)
        else:
            print("Could not read start frame to save.")

    # compute crossing line
    if args.line:
        x1, y1, x2, y2 = parse_line(args.line)
    elif args.auto_line:
        auto = auto_line_from_image(args.auto_line_frame)
        if auto is None:
            # fallback: center horizontal line at 60% height
            y = int(h * 0.60)
            x1, y1, x2, y2 = int(w*0.05), y, int(w*0.95), y
            print("Auto-line frame not found; used default horizontal line.")
        else:
            x1, y1, x2, y2 = auto
            print(f"Auto-line from image {args.auto_line_frame}: ({x1},{y1})-({x2},{y2})")
    else:
        print("ERROR: Provide --line x1,y1,x2,y2 or use --auto-line with a saved frame.")
        sys.exit(1)

    print(f"Using line: ({x1},{y1}) -> ({x2},{y2}), direction={args.direction}")

    # Video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(args.output, fourcc, fps, (w, h))

    tracker = CentroidTracker(max_disappeared=30, iou_threshold=0.25)
    counted_ids = set()
    total_count = 0

    frame_idx = args.start_frame
    print("Processing... (this may take a while)")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # YOLO inference
        results = model(frame, conf=args.conf, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                x1b, y1b, x2b, y2b = map(int, box.xyxy[0])
                detections.append((x1b, y1b, x2b, y2b))

        active_ids = tracker.update(detections)
        active_count = len(active_ids)

        # For each active id, check crossing
        for oid in active_ids:
            hist = tracker.history.get(oid, [])
            if len(hist) < 2:
                continue
            prev_cent = hist[-2]
            curr_cent = hist[-1]
            prev_side = point_line_side(prev_cent[0], prev_cent[1], x1, y1, x2, y2)
            curr_side = point_line_side(curr_cent[0], curr_cent[1], x1, y1, x2, y2)

            crossed = (prev_side <= 0 and curr_side > 0) or (prev_side >= 0 and curr_side < 0)
            if crossed and oid not in counted_ids and len(hist) >= args.min_frames:
                # direction check using movement vector
                # take a slightly earlier point for robust direction calculation
                if len(hist) >= 3:
                    p_prev = hist[-3]
                else:
                    p_prev = hist[0]
                dx = curr_cent[0] - p_prev[0]
                dy = curr_cent[1] - p_prev[1]
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

        # annotate frame: line, boxes, text
        # draw line
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
            cv2.putText(frame, f"ID:{oid}", (bx1, max(by1 - 6, 0)), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # always show global totals + active count in top-left
        cv2.putText(frame, f"Total: {total_count}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 2, cv2.LINE_AA)
        cv2.putText(frame, f"Active: {active_count}", (10, 62), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (200,200,200), 2, cv2.LINE_AA)

        out.write(frame)
        frame_idx += 1

    # release capture
    cap.release()

    # Freeze final frame for N seconds with final overlay
    # If output has frames, read last written frame from video file by re-opening output (safer to use last frame we have in memory)
    # We'll create a final frame showing the big summary by reading last frame from output file if possible, otherwise reuse black frame
    final_frame = None
    try:
        # Try to read last frame from the output file by opening it
        tmp_cap = cv2.VideoCapture(args.output)
        last_frame = None
        while True:
            ret, f = tmp_cap.read()
            if not ret:
                break
            last_frame = f
        tmp_cap.release()
        if last_frame is not None:
            final_frame = last_frame
    except Exception:
        final_frame = None

    if final_frame is None:
        # fallback: create black frame
        final_frame = 255 * np.ones((h, w, 3), dtype=np.uint8)

    final_frame = overlay_final_summary(final_frame, total_count, 0 if 'active_count' not in locals() else active_count)

    # append freeze frames
    freeze_frames = max(1, int(round(args.freeze_sec * fps)))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    # reopen writer in append mode by creating a new file and concatenating: easier to simply write new file by reading old
    # We'll write a new final file by reading old frames and appending freeze frames to a new file
    tmp_input = args.output
    tmp_output = args.output + ".tmp.mp4"

    cap2 = cv2.VideoCapture(tmp_input)
    writer = cv2.VideoWriter(tmp_output, fourcc, fps, (w, h))
    # copy existing frames
    while True:
        ret, f = cap2.read()
        if not ret:
            break
        writer.write(f)
    cap2.release()

    # write the freeze frames with final overlay
    for _ in range(freeze_frames):
        writer.write(final_frame)

    writer.release()

    # replace original
    try:
        os.replace(tmp_output, args.output)
    except Exception:
        print("Warning: could not replace original output file automatically. Check", tmp_output)

    print("Done. FINAL TOTAL:", total_count)
    print("Output saved to:", args.output)

if __name__ == "__main__":
    main()
