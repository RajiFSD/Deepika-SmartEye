#!/usr/bin/env python3
"""
detection_service_new.py

YOLOv8 + DeepSORT (deep_sort_realtime v1.3.2 compatible) person counting
with OpenCV gender fallback. This version:

- Fixes deep_sort_realtime expected input (x, y, width, height, confidence).
- Handles multiple DeepSort track object shapes safely.
- Falls back to a robust internal tracker only if DeepSort truly fails.
- Uses OpenCV gender Caffe model if available, else a geometric heuristic.
- Writes an annotated output video and prints final counts.

Usage:
    python detection_service_new.py --input input.mp4 --output output.mp4
"""

import os
import cv2
import math
import argparse
import numpy as np
from datetime import datetime
from collections import Counter

# ----- optional libs -----
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✅ ultralytics YOLO available")
except Exception:
    YOLO_AVAILABLE = False

DEEPSORT_AVAILABLE = False
try:
    # Try common deep_sort_realtime import paths
    try:
        from deep_sort_realtime.deepsort_tracker import DeepSort
        DEEPSORT_AVAILABLE = True
        _DS_IMPORT = "deep_sort_realtime.deepsort_tracker.DeepSort"
    except Exception:
        from deep_sort_realtime.deep_sort import DeepSort
        DEEPSORT_AVAILABLE = True
        _DS_IMPORT = "deep_sort_realtime.deep_sort.DeepSort"
    print(f"✅ deep_sort_realtime available ({_DS_IMPORT})")
except Exception:
    DEEPSORT_AVAILABLE = False
    print("⚠️ deep_sort_realtime not available — will use fallback tracker")

# Path to optional uploaded model in some environments
UPLOADED_YOLO_PATH = "/mnt/data/00e0b0ae-bf7f-4d48-83be-38ddc1ced7b2.pt"

# Haar cascade path
DEFAULT_HAAR = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

# ------------------------------
# Small robust fallback tracker (keeps working if DeepSORT fails)
# ------------------------------
class FallbackTracker:
    def __init__(self, max_disappeared=60, match_threshold=0.28, distance_weight=0.45, confirm_frames=2, reattach_iou=0.45):
        self.next_id = 0
        self.tracks = {}
        self.finished_tracks = {}
        self.max_disappeared = max_disappeared
        self.match_threshold = match_threshold
        self.distance_weight = distance_weight
        self.confirm_frames = confirm_frames
        self.reattach_iou = reattach_iou
        self.pending = {}

    @staticmethod
    def iou(a,b):
        xA = max(a[0], b[0]); yA = max(a[1], b[1])
        xB = min(a[2], b[2]); yB = min(a[3], b[3])
        interW = max(0, xB-xA); interH = max(0, yB-yA)
        inter = interW * interH
        areaA = max(0, a[2]-a[0]) * max(0, a[3]-a[1])
        areaB = max(0, b[2]-b[0]) * max(0, b[3]-b[1])
        union = areaA + areaB - inter
        return inter/union if union > 0 else 0.0

    @staticmethod
    def centroid(box):
        x1,y1,x2,y2 = box
        return ((x1+x2)/2.0, (y1+y2)/2.0)

    def _build_scores(self, detections):
        items = list(self.tracks.items())
        if not items:
            return items, None
        scores = np.zeros((len(items), len(detections)), dtype=float)
        for ti, (tid, tr) in enumerate(items):
            tcent = self.centroid(tr['bbox'])
            diag = math.hypot(max(1, tr['bbox'][2]-tr['bbox'][0]), max(1, tr['bbox'][3]-tr['bbox'][1]))
            for di, d in enumerate(detections):
                dcent = self.centroid(d['bbox'])
                dist = math.dist(tcent, dcent)
                nd = min(1.0, dist / (diag + 1e-6))
                dist_score = 1.0 - nd
                iou_score = self.iou(tr['bbox'], d['bbox'])
                score = iou_score * (1.0 - self.distance_weight) + dist_score * self.distance_weight
                scores[ti, di] = score
        return items, scores

    def _greedy(self, items, scores):
        mapping = {}
        if scores is None:
            return mapping
        candidates = []
        for ti in range(scores.shape[0]):
            for di in range(scores.shape[1]):
                candidates.append((scores[ti, di], ti, di))
        candidates.sort(reverse=True, key=lambda x: x[0])
        used_t = set(); used_d = set()
        for sc, ti, di in candidates:
            if sc < self.match_threshold:
                break
            tid, _ = items[ti]
            if tid in used_t or di in used_d:
                continue
            mapping[di] = tid
            used_t.add(tid); used_d.add(di)
        return mapping

    def _find_finished(self, bbox):
        best_i = 0.0; best_id = None
        for fid, tr in self.finished_tracks.items():
            i = self.iou(bbox, tr['bbox'])
            if i > best_i:
                best_i = i; best_id = fid
        if best_i >= self.reattach_iou:
            return best_id
        return None

    def update(self, detections, frame_idx):
        # match active tracks
        items, scores = self._build_scores(detections)
        mapping = self._greedy(items, scores) if items else {}
        matched_t = set(); matched_d = set()
        for di, tid in mapping.items():
            det = detections[di]
            tr = self.tracks.get(tid)
            if tr is None:
                continue
            tr['bbox'] = det['bbox']; tr['last_seen'] = frame_idx
            tr['frames_seen'] += 1; tr['disappeared'] = 0
            if det.get('gender'):
                tr['gender_votes'].append((det.get('gender'), float(det.get('gender_conf', 0.0))))
            matched_t.add(tid); matched_d.add(di)

        # increment disappeared
        for tid, tr in list(self.tracks.items()):
            if tid not in matched_t:
                tr['disappeared'] = tr.get('disappeared', 0) + 1

        # move long-disappeared to finished
        to_rm = [tid for tid, tr in self.tracks.items() if tr.get('disappeared', 0) > self.max_disappeared]
        for tid in to_rm:
            self.finished_tracks[tid] = self.tracks[tid]
            del self.tracks[tid]

        # handle unmatched detections with pending confirmation
        for di, det in enumerate(detections):
            if di in matched_d:
                key = self._pending_key(det['bbox'])
                if key in self.pending:
                    del self.pending[key]
                continue
            key = self._pending_key(det['bbox'])
            entry = self.pending.get(key)
            if entry is None:
                self.pending[key] = {
                    'bbox': det['bbox'],
                    'count': 1,
                    'last_seen': frame_idx,
                    'gender': det.get('gender'),
                    'gender_conf': det.get('gender_conf', 0.0)
                }
            else:
                if self.iou(entry['bbox'], det['bbox']) > 0.2:
                    entry['bbox'] = det['bbox']; entry['count'] += 1; entry['last_seen'] = frame_idx
                    entry['gender'] = det.get('gender') or entry['gender']
                    entry['gender_conf'] = float(det.get('gender_conf', 0.0)) or entry['gender_conf']
                else:
                    self.pending[key] = {
                        'bbox': det['bbox'],
                        'count': 1,
                        'last_seen': frame_idx,
                        'gender': det.get('gender'),
                        'gender_conf': det.get('gender_conf', 0.0)
                    }
            entry = self.pending.get(key)
            if entry and entry['count'] >= self.confirm_frames:
                rid = self._find_finished(entry['bbox'])
                if rid is not None:
                    tr = self.finished_tracks.pop(rid)
                    tr['bbox'] = entry['bbox']; tr['last_seen'] = frame_idx
                    tr['disappeared'] = 0; tr['frames_seen'] += 1
                    if entry.get('gender'):
                        tr['gender_votes'].append((entry.get('gender'), float(entry.get('gender_conf', 0.0))))
                    self.tracks[rid] = tr
                else:
                    self._create_track(entry, frame_idx)
                try:
                    del self.pending[key]
                except KeyError:
                    pass

        # expire old pending
        for k, entry in list(self.pending.items()):
            if frame_idx - entry['last_seen'] > max(2, int(self.max_disappeared / 3)):
                try:
                    del self.pending[k]
                except KeyError:
                    pass

    def _pending_key(self, bbox):
        c = self.centroid(bbox)
        return f"{int(c[0] // 20)}_{int(c[1] // 20)}"

    def _create_track(self, entry, frame_idx):
        tid = self.next_id; self.next_id += 1
        self.tracks[tid] = {
            'id': tid,
            'bbox': entry['bbox'],
            'first_seen': frame_idx,
            'last_seen': frame_idx,
            'frames_seen': 1,
            'disappeared': 0,
            'gender_votes': [(entry.get('gender'), float(entry.get('gender_conf', 0.0)))] if entry.get('gender') else []
        }

    def get_final_counts(self, min_frames_seen=2):
        male = female = unknown = 0
        details = []
        all_tracks = {}
        all_tracks.update(self.finished_tracks)
        all_tracks.update(self.tracks)
        for tid, tr in all_tracks.items():
            if tr.get('frames_seen', 0) < min_frames_seen:
                continue
            votes = [g for g, c in tr.get('gender_votes', []) if g]
            avg_conf = 0.0
            if votes:
                cnt = Counter(votes)
                final = cnt.most_common(1)[0][0]
                confs = [c for g, c in tr.get('gender_votes', []) if g == final]
                avg_conf = float(sum(confs) / max(1, len(confs))) if confs else 0.0
            else:
                final = 'unknown'
            if final == 'male':
                male += 1
            elif final == 'female':
                female += 1
            else:
                unknown += 1
            details.append({
                'track_id': tid,
                'gender': final,
                'avg_confidence': avg_conf,
                'frames_seen': tr.get('frames_seen', 0),
                'bbox': tr.get('bbox')
            })
        return {'male_count': male, 'female_count': female, 'unknown_count': unknown, 'total_count': male + female + unknown, 'tracks': details}

# ------------------------------
# Detection + gender helpers
# ------------------------------
class DetectionService:
    def __init__(self, models_dir=None):
        self.models_dir = models_dir or os.path.join(os.getcwd(), "models")
        os.makedirs(self.models_dir, exist_ok=True)
        self.yolo_person = None
        self.yolo_face = None
        self.hog = None
        self.face_cascade = None
        self.gender_net = None
        self.gender_list = ['male', 'female']

        if YOLO_AVAILABLE:
            try:
                person_weight = os.path.join(self.models_dir, "yolov8s.pt")
                if os.path.exists(person_weight):
                    self.yolo_person = YOLO(person_weight)
                elif os.path.exists(UPLOADED_YOLO_PATH):
                    self.yolo_person = YOLO(UPLOADED_YOLO_PATH)
                else:
                    self.yolo_person = YOLO("yolov8s.pt")
                face_weight = os.path.join(self.models_dir, "yolov8n-face.pt")
                if os.path.exists(face_weight):
                    try:
                        self.yolo_face = YOLO(face_weight)
                    except Exception:
                        self.yolo_face = None
                print("✅ YOLO models loaded (if available)")
            except Exception as e:
                print("⚠️ YOLO load error:", e)
                self.yolo_person = None

        if not self.yolo_person:
            try:
                self.hog = cv2.HOGDescriptor()
                self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
                print("✅ HOG fallback loaded")
            except Exception:
                self.hog = None

        try:
            self.face_cascade = cv2.CascadeClassifier(DEFAULT_HAAR)
            if self.face_cascade.empty():
                self.face_cascade = None
            else:
                print("✅ Haar cascade loaded")
        except Exception:
            self.face_cascade = None

        gp = os.path.join(self.models_dir, 'gender_net.caffemodel')
        gp_proto = os.path.join(self.models_dir, 'gender_deploy.prototxt')
        if os.path.exists(gp) and os.path.exists(gp_proto):
            try:
                self.gender_net = cv2.dnn.readNetFromCaffe(gp_proto, gp)
                print("✅ OpenCV gender net loaded")
            except Exception as e:
                print("⚠️ OpenCV gender net load failed:", e)
                self.gender_net = None

    def detect_people(self, frame):
        res = []
        if self.yolo_person:
            try:
                results = self.yolo_person(frame, verbose=False)
                for r in results:
                    boxes = getattr(r.boxes, 'xyxy', None)
                    if boxes is None:
                        continue
                    boxes_xy = boxes.cpu().numpy()
                    confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, 'conf') else np.ones(len(boxes_xy)) * 0.5
                    cls_ids = r.boxes.cls.cpu().numpy() if hasattr(r.boxes, 'cls') else np.zeros(len(boxes_xy))
                    for i, b in enumerate(boxes_xy):
                        x1, y1, x2, y2 = map(int, b)
                        conf = float(confs[i])
                        cls = int(cls_ids[i]) if len(cls_ids) > 0 else 0
                        if cls == 0 and conf > 0.28:
                            res.append(((max(0, x1), max(0, y1), min(frame.shape[1], x2), min(frame.shape[0], y2)), conf))
            except Exception:
                pass
        elif self.hog:
            try:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                boxes, weights = self.hog.detectMultiScale(gray, winStride=(8, 8), padding=(8, 8), scale=1.05)
                for (x, y, w, h), wt in zip(boxes, weights):
                    if float(wt) > 0.5:
                        res.append(((int(x), int(y), int(x + w), int(y + h)), float(wt)))
            except Exception:
                pass
        return res

    def detect_faces_in_frame(self, frame):
        faces = []
        if self.yolo_face:
            try:
                results = self.yolo_face(frame, verbose=False)
                for r in results:
                    boxes = getattr(r.boxes, 'xyxy', None)
                    if boxes is None:
                        continue
                    boxes_xy = boxes.cpu().numpy()
                    confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, 'conf') else np.ones(len(boxes_xy))
                    for i, b in enumerate(boxes_xy):
                        x1, y1, x2, y2 = map(int, b)
                        conf = float(confs[i])
                        if conf > 0.35:
                            faces.append(((x1, y1, x2, y2), conf))
            except Exception:
                pass
        return faces

    def detect_faces_in_roi(self, roi):
        out = []
        if self.face_cascade is None or roi is None or roi.size == 0:
            return out
        try:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            rects = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(24, 24))
            for (x, y, w, h) in rects:
                out.append((x, y, w, h))
        except Exception:
            pass
        return out

    def classify_gender_opencv(self, face_img):
        if self.gender_net is None:
            return None
        try:
            blob = cv2.dnn.blobFromImage(face_img, 1.0, (227, 227),
                                         (78.4263377603, 87.7689143744, 114.895847746), swapRB=False)
            self.gender_net.setInput(blob)
            preds = self.gender_net.forward()
            idx = int(np.argmax(preds[0])); conf = float(preds[0][idx])
            gender = self.gender_list[idx] if idx < len(self.gender_list) else 'male'
            return {'gender': gender, 'confidence': conf}
        except Exception:
            return None

    def classify_gender_heuristic(self, roi):
        if roi is None or roi.size == 0:
            return {'gender': 'unknown', 'confidence': 0.0}
        h, w = roi.shape[:2]; aspect = h / (w + 1e-6)
        gender = 'male' if aspect > 1.6 else 'female'
        return {'gender': gender, 'confidence': 0.45}

    def classify_gender(self, frame, person_box, face_boxes_global):
        x1, y1, x2, y2 = person_box
        # find best overlapping face_box
        face_box = None; best_i = 0.0
        for (fb, fconf) in face_boxes_global:
            fx1, fy1, fx2, fy2 = fb
            interW = max(0, min(x2, fx2) - max(x1, fx1)); interH = max(0, min(y2, fy2) - max(y1, fy1))
            inter = interW * interH
            areaA = max(0, x2 - x1) * max(0, y2 - y1)
            areaB = max(0, fx2 - fx1) * max(0, fy2 - fy1)
            union = areaA + areaB - inter
            iou = inter / union if union > 0 else 0.0
            if iou > best_i:
                best_i = iou; face_box = (fx1, fy1, fx2, fy2)
        face_img = None
        if face_box and best_i > 0.02:
            fx1, fy1, fx2, fy2 = face_box
            fx1c, fy1c = max(0, fx1), max(0, fy1)
            fx2c, fy2c = min(frame.shape[1], fx2), min(frame.shape[0], fy2)
            if fx2c - fx1c > 0 and fy2c - fy1c > 0:
                face_img = frame[fy1c:fy2c, fx1c:fx2c].copy()
        else:
            try:
                roi = frame[y1:y2, x1:x2].copy()
                haar = self.detect_faces_in_roi(roi)
                if haar:
                    hx, hy, hw, hh = max(haar, key=lambda t: t[2] * t[3])
                    fx1c = x1 + hx; fy1c = y1 + hy
                    fx2c = fx1c + hw; fy2c = fy1c + hh
                    if fx2c - fx1c > 0 and fy2c - fy1c > 0:
                        face_img = frame[fy1c:fy2c, fx1c:fx2c].copy(); face_box = (fx1c, fy1c, fx2c, fy2c)
            except Exception:
                face_img = None

        if face_img is not None and face_img.size > 0:
            res = None
            if self.gender_net:
                res = self.classify_gender_opencv(face_img)
            if res is None:
                res = self.classify_gender_heuristic(face_img)
            return {'gender': res.get('gender', 'unknown'), 'gender_conf': float(res.get('confidence', 0.0)), 'face_box': face_box}
        else:
            try:
                roi = frame[y1:y2, x1:x2].copy()
                res = self.classify_gender_heuristic(roi)
                return {'gender': res.get('gender', 'unknown'), 'gender_conf': float(res.get('confidence', 0.0)), 'face_box': None}
            except Exception:
                return {'gender': 'unknown', 'gender_conf': 0.0, 'face_box': None}

# ------------------------------
# Main processing with DeepSORT compatibility fix
# ------------------------------
def process_video_and_save(input_path, output_path, min_frames_for_counting=2, process_fps=6, max_dim=1280, show_progress=True):
    svc = DetectionService()

    # Try to instantiate DeepSort if available (tune parameters)
    deepsort = None
    using_deepsort = False
    if DEEPSORT_AVAILABLE:
        try:
            # Common constructor params; adjust max_age (frames) and n_init as needed
            deepsort = DeepSort(max_age=int(process_fps * 8), n_init=2)
            using_deepsort = True
            print("✅ Using DeepSORT tracker")
        except Exception as e:
            print("⚠️ DeepSort init failed, falling back:", e)
            deepsort = None
            using_deepsort = False

    # fallback internal tracker
    fallback_tracker = FallbackTracker(max_disappeared=int(process_fps * 8),
                                       match_threshold=0.28,
                                       distance_weight=0.45,
                                       confirm_frames=2,
                                       reattach_iou=0.45)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise RuntimeError("Cannot open video: " + str(input_path))

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    scale = 1.0
    if max(width, height) > max_dim:
        scale = max_dim / max(width, height)
        width = int(width * scale)
        height = int(height * scale)

    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    step_frames = max(1, int(round(fps / process_fps))) if process_fps > 0 else 1

    frame_idx = 0
    # store deepsort gender votes per track id (if we use deep sort)
    deepsort_gender_votes = {}

    print(f"🔁 Starting: frames={total_frames}, fps={fps}, step={step_frames}, deepsort={'yes' if using_deepsort else 'no'}")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if scale != 1.0:
            frame = cv2.resize(frame, (width, height))

        if frame_idx % step_frames == 0:
            people = svc.detect_people(frame)
            face_boxes = svc.detect_faces_in_frame(frame)

            detections_for_ds = []
            detections_plain = []
            for (bbox, conf) in people:
                x1, y1, x2, y2 = bbox
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                # Save plain detection for fallback usage
                detections_plain.append({'bbox': (x1, y1, x2, y2), 'person_conf': float(conf)})
                # IMPORTANT: deep_sort_realtime v1.3.2 expects [x, y, width, height, confidence]
                w = max(1, x2 - x1)
                h = max(1, y2 - y1)
                detections_for_ds.append([float(x1), float(y1), float(w), float(h), float(conf)])

            # If using DeepSORT, pass xywh format
            if using_deepsort and deepsort is not None:
                try:
                    # Some versions of DeepSort expect list of detections, others expect numpy array — both usually work
                    tracks = deepsort.update_tracks(detections_for_ds, frame=frame)
                    # tracks is an iterable of track objects; we will robustly extract id and bbox
                    active_tracks = {}
                    for tr in tracks:
                        try:
                            # skip unconfirmed tracks if the object provides is_confirmed method/attribute
                            if hasattr(tr, 'is_confirmed') and callable(getattr(tr, 'is_confirmed')) and not tr.is_confirmed():
                                continue
                            # different versions may expose attributes differently
                            tid = None
                            if hasattr(tr, 'track_id'):
                                tid = tr.track_id
                            elif hasattr(tr, 'track_id_'):
                                tid = tr.track_id_
                            elif hasattr(tr, 'trackID'):
                                tid = tr.trackID
                            else:
                                # some versions use 'id' attribute
                                tid = getattr(tr, 'id', None)

                            # get bbox in tlbr (x1,y1,x2,y2)
                            tlbr = None
                            if hasattr(tr, 'to_tlbr') and callable(getattr(tr, 'to_tlbr')):
                                tlbr = tr.to_tlbr()
                            elif hasattr(tr, 'to_ltwh') and callable(getattr(tr, 'to_ltwh')):
                                ltwh = tr.to_ltwh()
                                if ltwh and len(ltwh) >= 4:
                                    x, y, w, h = ltwh
                                    tlbr = (int(x), int(y), int(x + w), int(y + h))
                            elif hasattr(tr, 'tlbr'):
                                tlbr = tr.tlbr
                            elif hasattr(tr, 'bbox'):
                                b = tr.bbox
                                if isinstance(b, (list, tuple)) and len(b) >= 4:
                                    # assume tlbr
                                    tlbr = (int(b[0]), int(b[1]), int(b[2]), int(b[3]))
                            # final guard: try tr.to_tlbr() call via method name fallback
                            if tlbr is None:
                                try:
                                    tlbr = tr.to_tlbr()
                                except Exception:
                                    tlbr = None

                            if tid is None or tlbr is None:
                                # cannot use this track robustly
                                continue

                            x1, y1, x2, y2 = map(int, tlbr)
                            # classify gender for that bbox using face detections
                            g = svc.classify_gender(frame, (x1, y1, x2, y2), face_boxes)
                            # save votes per tid for final aggregation
                            votes = deepsort_gender_votes.get(tid, {'gender_votes': []})
                            if g.get('gender') and g.get('gender') != 'unknown':
                                votes['gender_votes'].append((g.get('gender'), float(g.get('gender_conf', 0.0))))
                            deepsort_gender_votes[tid] = votes

                            active_tracks[tid] = {'bbox': (x1, y1, x2, y2)}
                        except Exception:
                            # skip malformed track object
                            continue

                    # annotate frame with active tracks
                    for tid, info in active_tracks.items():
                        bx1, by1, bx2, by2 = info['bbox']
                        votes = deepsort_gender_votes.get(tid, {}).get('gender_votes', [])
                        label = 'unknown'; avg_conf = 0.0
                        if votes:
                            genders = [g for g, c in votes if g]
                            cnt = Counter(genders)
                            label = cnt.most_common(1)[0][0]
                            confs = [c for g, c in votes if g == label]
                            avg_conf = float(sum(confs) / (len(confs) if confs else 1))
                        color = (0, 200, 255) if label == 'male' else (255, 0, 255) if label == 'female' else (200, 200, 200)
                        cv2.rectangle(frame, (bx1, by1), (bx2, by2), color, 2)
                        cv2.putText(frame, f"ID:{tid} {label[:1].upper()} {avg_conf:.2f}", (bx1, max(15, by1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

                except Exception as e:
                    # If anything goes wrong at runtime, fallback to internal tracker
                    print("⚠️ DeepSORT runtime error — falling back to robust tracker:", e)
                    using_deepsort = False
                    deepsort = None

            if not using_deepsort:
                # Use fallback tracker with gender classification
                detections_aug = []
                for det in detections_plain:
                    x1, y1, x2, y2 = det['bbox']
                    g = svc.classify_gender(frame, (x1, y1, x2, y2), face_boxes)
                    detections_aug.append({'bbox': (x1, y1, x2, y2), 'person_conf': det.get('person_conf', 0.0), 'gender': g.get('gender', 'unknown'), 'gender_conf': float(g.get('gender_conf', 0.0))})
                fallback_tracker.update(detections_aug, frame_idx)
                # annotate fallback tracks
                for tid, tr in fallback_tracker.tracks.items():
                    bx1, by1, bx2, by2 = map(int, tr['bbox'])
                    votes = [g for g, c in tr.get('gender_votes', []) if g]
                    label = 'unknown'; avg_conf = 0.0
                    if votes:
                        cnt = Counter(votes)
                        label = cnt.most_common(1)[0][0]
                        confs = [c for g, c in tr.get('gender_votes', []) if g == label]
                        avg_conf = float(sum(confs) / (len(confs) if confs else 1))
                    color = (0, 200, 255) if label == 'male' else (255, 0, 255) if label == 'female' else (200, 200, 200)
                    cv2.rectangle(frame, (bx1, by1), (bx2, by2), color, 2)
                    cv2.putText(frame, f"ID:{tr['id']} {label[:1].upper()} {avg_conf:.2f}", (bx1, max(15, by1 - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1, cv2.LINE_AA)

            out.write(frame)

            if show_progress and (frame_idx % (step_frames * 50) == 0):
                print(f" progress frame {frame_idx}/{total_frames} -- deepsort={'yes' if using_deepsort else 'no'}")

        frame_idx += 1

    cap.release(); out.release()

    # final counts
    if using_deepsort and deepsort is not None and deepsort_gender_votes:
        male = female = unknown = 0; details = []
        for tid, rec in deepsort_gender_votes.items():
            votes = [g for g, c in rec.get('gender_votes', []) if g]
            if votes:
                cnt = Counter(votes); final = cnt.most_common(1)[0][0]
            else:
                final = 'unknown'
            if final == 'male': male += 1
            elif final == 'female': female += 1
            else: unknown += 1
            details.append({'track_id': tid, 'gender': final, 'votes': rec.get('gender_votes', [])})
        final_counts = {'male_count': male, 'female_count': female, 'unknown_count': unknown, 'total_count': male + female + unknown, 'tracks': details}
    else:
        final_counts = fallback_tracker.get_final_counts(min_frames_seen=min_frames_for_counting)

    print("✅ Processing complete:")
    print(f"   Total unique persons counted (>= {min_frames_for_counting} frames): {final_counts['total_count']}")
    print(f"      male: {final_counts['male_count']}, female: {final_counts['female_count']}, unknown: {final_counts['unknown_count']}")
    return final_counts

# ------------------------------
# CLI
# ------------------------------
def parse_args():
    p = argparse.ArgumentParser(prog="detection_service_new.py")
    p.add_argument("--input", "-i", required=True, help="Input video path")
    p.add_argument("--output", "-o", required=True, help="Output annotated video path")
    p.add_argument("--min-frames", "-m", type=int, default=2, help="Min frames a track must appear to be counted")
    p.add_argument("--process-fps", "-r", type=int, default=6, help="How many times per second to process (affects speed)")
    p.add_argument("--max-dim", type=int, default=1280, help="Maximum frame dimension for processing")
    return p.parse_args()

if __name__ == "__main__":
    args = parse_args()
    start = datetime.now()
    print("🔎 Running with settings:", vars(args))
    try:
        result = process_video_and_save(args.input, args.output, min_frames_for_counting=args.min_frames,
                                        process_fps=args.process_fps, max_dim=args.max_dim)
        print("Result summary:", result)
    except KeyboardInterrupt:
        print("Interrupted by user")
    except Exception as e:
        print("❌ Error during processing:", e)
    finally:
        print("Elapsed:", (datetime.now() - start).total_seconds(), "seconds")
