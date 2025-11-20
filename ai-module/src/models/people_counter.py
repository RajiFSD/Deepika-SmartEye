"""
people_counter.py

Count people in a video file or live camera using YOLOv8 + simple tracking.

Usage:

1) From a video file:
   python people_counter.py --source path/to/video.mp4 --no-show --output out.mp4

2) From webcam (index 0):
   python people_counter.py --source 0

3) From RTSP/HTTP stream:
   python people_counter.py --source "rtsp://user:pass@ip:port/..."

You can optionally save annotated video:
   python people_counter.py --source input.mp4 --output output_annotated.mp4

"""

import argparse
import math
import time
from typing import List, Tuple, Dict, Any, Set, Optional

import cv2
import numpy as np
from ultralytics import YOLO


# ---------------------------
# Tracker for unique people
# ---------------------------

class Track:
    def __init__(self, track_id: int, bbox: Tuple[int, int, int, int], frame_index: int):
        """
        bbox: (x1, y1, x2, y2)
        """
        self.id = track_id
        self.bbox = bbox
        self.last_seen_frame = frame_index
        self.frames_seen = 1
        self.disappeared_frames = 0

    @property
    def centroid(self) -> Tuple[float, float]:
        x1, y1, x2, y2 = self.bbox
        return (x1 + x2) / 2.0, (y1 + y2) / 2.0


class SimplePersonTracker:
    """
    Simple tracker:
    - Associates detections to existing tracks using IoU and centroid distance.
    - Assigns new IDs for unmatched detections.
    - Tracks are removed if they disappear for too many frames.
    - "Current count" = how many tracks are active now and seen at least N frames.
    """

    def __init__(
        self,
        max_disappeared: int = 30,
        iou_threshold: float = 0.3,
        max_centroid_dist: float = 80.0,
    ):
        self.next_id: int = 1
        self.tracks: Dict[int, Track] = {}
        self.max_disappeared = max_disappeared
        self.iou_threshold = iou_threshold
        self.max_centroid_dist = max_centroid_dist

    @staticmethod
    def iou(b1: Tuple[int, int, int, int], b2: Tuple[int, int, int, int]) -> float:
        x11, y11, x12, y12 = b1
        x21, y21, x22, y22 = b2

        xi1 = max(x11, x21)
        yi1 = max(y11, y21)
        xi2 = min(x12, x22)
        yi2 = min(y12, y22)

        w = max(0, xi2 - xi1)
        h = max(0, yi2 - yi1)
        inter = w * h

        if inter <= 0:
            return 0.0

        area1 = (x12 - x11) * (y12 - y11)
        area2 = (x22 - x21) * (y22 - y21)
        union = area1 + area2 - inter
        if union <= 0:
            return 0.0

        return inter / union

    @staticmethod
    def centroid_distance(b1: Tuple[int, int, int, int], b2: Tuple[int, int, int, int]) -> float:
        x11, y11, x12, y12 = b1
        x21, y21, x22, y22 = b2
        c1 = ((x11 + x12) / 2.0, (y11 + y12) / 2.0)
        c2 = ((x21 + x22) / 2.0, (y21 + y22) / 2.0)
        return math.hypot(c1[0] - c2[0], c1[1] - c2[1])

    def update(
        self,
        detections: List[Tuple[int, int, int, int]],
        frame_index: int,
    ) -> Dict[int, Tuple[int, int, int, int]]:
        """
        detections: list of bounding boxes (x1, y1, x2, y2) for this frame
        Returns dict: track_id -> bbox
        """
        # If no tracks yet, create new ones from detections
        if len(self.tracks) == 0:
            for det in detections:
                self.tracks[self.next_id] = Track(self.next_id, det, frame_index)
                self.next_id += 1

            return {tid: tr.bbox for tid, tr in self.tracks.items()}

        # If there are tracks but no detections, just increase disappeared count
        if len(detections) == 0:
            remove_ids = []
            for tid, tr in self.tracks.items():
                tr.disappeared_frames += 1
                if tr.disappeared_frames > self.max_disappeared:
                    remove_ids.append(tid)
            for rid in remove_ids:
                del self.tracks[rid]

            return {tid: tr.bbox for tid, tr in self.tracks.items()}

        # There are both tracks and detections – associate them
        track_ids = list(self.tracks.keys())
        unmatched_detections = set(range(len(detections)))
        unmatched_tracks = set(track_ids)

        # Greedy association by IoU, then centroid distance
        for det_idx, det in enumerate(detections):
            best_track_id = None
            best_score = 0.0
            for tid in track_ids:
                if tid not in unmatched_tracks:
                    continue

                tr = self.tracks[tid]
                iou_val = self.iou(tr.bbox, det)
                if iou_val >= self.iou_threshold:
                    if iou_val > best_score:
                        best_score = iou_val
                        best_track_id = tid
                else:
                    # If IoU low, check centroid distance
                    dist = self.centroid_distance(tr.bbox, det)
                    if dist < self.max_centroid_dist:
                        score = 1.0 / (1.0 + dist)
                        if score > best_score:
                            best_score = score
                            best_track_id = tid

            if best_track_id is not None:
                # Assign detection to this track
                tr = self.tracks[best_track_id]
                tr.bbox = det
                tr.frames_seen += 1
                tr.disappeared_frames = 0
                tr.last_seen_frame = frame_index

                if det_idx in unmatched_detections:
                    unmatched_detections.remove(det_idx)
                if best_track_id in unmatched_tracks:
                    unmatched_tracks.remove(best_track_id)

        # Remaining detections become new tracks
        for det_idx in unmatched_detections:
            det = detections[det_idx]
            self.tracks[self.next_id] = Track(self.next_id, det, frame_index)
            self.next_id += 1

        # Tracks not matched this frame: increase disappeared counter
        remove_ids = []
        for tid in unmatched_tracks:
            tr = self.tracks[tid]
            tr.disappeared_frames += 1
            if tr.disappeared_frames > self.max_disappeared:
                remove_ids.append(tid)
        for rid in remove_ids:
            del self.tracks[rid]

        return {tid: tr.bbox for tid, tr in self.tracks.items()}

    def get_current_ids_seen_enough(self, min_frames_for_count: int = 3) -> Set[int]:
        """
        Active tracks in the current frame that have been seen at least N frames.
        """
        return {
            tr.id
            for tr in self.tracks.values()
            if tr.frames_seen >= min_frames_for_count and tr.disappeared_frames == 0
        }

    def get_all_ids_seen_enough(self, min_frames_for_count: int = 3) -> Set[int]:
        """
        All tracks (historical) that have been seen at least N frames.
        """
        return {tr.id for tr in self.tracks.values() if tr.frames_seen >= min_frames_for_count}


# ---------------------------
# YOLOv8-based people detector
# ---------------------------

class PeopleDetector:
    def __init__(
        self,
        model_name: str = "yolov8n.pt",
        conf_threshold: float = 0.3,
    ):
        """
        model_name: e.g. 'yolov8n.pt', 'yolov8s.pt', ...
        """
        self.model = YOLO(model_name)
        self.conf_threshold = conf_threshold

    def detect_people(self, frame: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Returns list of bboxes (x1, y1, x2, y2) of detected persons.
        """
        results = self.model(frame, verbose=False)[0]  # single image

        bboxes: List[Tuple[int, int, int, int]] = []
        if results.boxes is None:
            return bboxes

        for box in results.boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            # COCO 'person' class is 0
            if cls_id != 0:
                continue
            if conf < self.conf_threshold:
                continue

            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            bboxes.append((int(x1), int(y1), int(x2), int(y2)))

        return bboxes


# ---------------------------
# Main processing function
# ---------------------------

def process_stream(
    source: str,
    output_path: Optional[str] = None,
    model_name: str = "yolov8n.pt",
    conf_threshold: float = 0.3,
    min_frames_for_count: int = 3,
    process_fps: Optional[float] = None,
    show_window: bool = True,
):
    """
    source: video path, camera index (e.g. "0"), or RTSP/HTTP URL.
    output_path: if given, writes annotated video.
    process_fps: if set, we skip frames to approximately this FPS for detection.
                 If None, process every frame.
    """

    # Convert source possibly from numeric string to int
    try:
        if len(source) == 1 and source.isdigit():
            source_int = int(source)
        else:
            source_int = source
    except Exception:
        source_int = source

    cap = cv2.VideoCapture(source_int)
    if not cap.isOpened():
        print(f"[ERROR] Cannot open source: {source}")
        return

    # Video properties
    input_fps = cap.get(cv2.CAP_PROP_FPS)
    if input_fps <= 0:
        input_fps = 25.0  # default guess

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    # Output video writer
    writer = None
    if output_path is not None:
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(output_path, fourcc, input_fps, (width, height))

    detector = PeopleDetector(model_name=model_name, conf_threshold=conf_threshold)
    tracker = SimplePersonTracker(
        max_disappeared=int(input_fps * 2),  # allow ~2 seconds disappearance
        iou_threshold=0.3,
        max_centroid_dist=80.0,
    )

    frame_index = 0
    last_process_time = 0.0
    process_interval = None
    if process_fps is not None and process_fps > 0:
        process_interval = 1.0 / process_fps

    # For final unique IDs across entire run
    all_unique_ids: Set[int] = set()

    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_index += 1

        # Decide whether to run detection on this frame (frame skipping)
        run_detection = True
        if process_interval is not None:
            now = time.time()
            if now - last_process_time < process_interval:
                run_detection = False
            else:
                last_process_time = now

        if run_detection:
            bboxes = detector.detect_people(frame)
        else:
            bboxes = []

        # Update tracker
        track_bboxes = tracker.update(bboxes, frame_index)

        # Current live people (active tracks) seen enough frames
        current_ids = tracker.get_current_ids_seen_enough(min_frames_for_count)
        current_live_count = len(current_ids)

        # Historical total unique (ever seen) – for info
        all_ids_now = tracker.get_all_ids_seen_enough(min_frames_for_count)
        all_unique_ids.update(all_ids_now)
        total_unique_so_far = len(all_unique_ids)

        # Draw boxes + IDs
        for tid, bbox in track_bboxes.items():
            x1, y1, x2, y2 = bbox
            # Green for "counted", yellow for still warming up
            color = (0, 255, 0) if tid in current_ids else (0, 255, 255)
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

        # Draw counters (this is what you care about most)
        text1 = f"Current persons (>= {min_frames_for_count} frames): {current_live_count}"
        text2 = f"Total unique so far: {total_unique_so_far}"

        cv2.putText(
            frame,
            text1,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 255),
            2,
            cv2.LINE_AA,
        )
        cv2.putText(
            frame,
            text2,
            (10, 60),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

        # Show FPS info (optional)
        elapsed = time.time() - start_time
        if elapsed > 0:
            fps_str = f"FPS: {frame_index / elapsed:.1f}"
            cv2.putText(
                frame,
                fps_str,
                (10, 90),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                1,
                cv2.LINE_AA,
            )

        if show_window:
            cv2.imshow("People Counter", frame)
            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break

        if writer is not None:
            writer.write(frame)

    cap.release()
    if writer is not None:
        writer.release()
    if show_window:
        cv2.destroyAllWindows()

    print("\n======================================")
    print("      PROCESSING FINISHED")
    print("======================================")
    print(f"Total frames processed: {frame_index}")
    print(f"Final CURRENT persons in last frame (>= {min_frames_for_count} frames): {current_live_count}")
    print(f"Final TOTAL UNIQUE persons (>= {min_frames_for_count} frames): {len(all_unique_ids)}")
    print("======================================\n")


# ---------------------------
# CLI
# ---------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="People counter using YOLOv8 + simple tracking")
    parser.add_argument(
        "--source",
        type=str,
        required=True,
        help="Video file path, camera index (e.g. '0'), or stream URL",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Optional output video path (e.g. output.mp4)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="yolov8n.pt",
        help="YOLOv8 model name (default: yolov8n.pt)",
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=0.3,
        help="Detection confidence threshold (default: 0.3)",
    )
    parser.add_argument(
        "--min-frames",
        type=int,
        default=3,
        help="Minimum frames a person must be seen to be counted (default: 3)",
    )
    parser.add_argument(
        "--process-fps",
        type=float,
        default=None,
        help="Approximate FPS to process for detection (default: None = process every frame)",
    )
    parser.add_argument(
        "--no-show",
        action="store_true",
        help="Do not display window (useful on headless server)",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    process_stream(
        source=args.source,
        output_path=args.output,
        model_name=args.model,
        conf_threshold=args.conf,
        min_frames_for_count=args.min_frames,
        process_fps=args.process_fps,
        show_window=False,
    )
