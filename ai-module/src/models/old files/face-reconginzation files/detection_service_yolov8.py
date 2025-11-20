"""
detection_service_yolov8.py
YOLOv8 (person) + YOLO-face upgrade for person + face detection + gender classification.
- Uses ultralytics YOLO for person detection and (if available) a YOLO-face model for face detection.
- Falls back to original HOG + Haarcascade + heuristic/gender model if ultralytics/weights not available.
- Maintains Flask endpoints similar to your original service.

How to prepare:
1) Install packages:
   pip install ultralytics opencv-python-headless flask flask-cors numpy

   (If you want DeepFace gender/age support:)
   pip install deepface
   Note: DeepFace needs tensorflow; skip if you don't want that heavy dependency.

2) Download models:
   - YOLOv8 person: ultralytics will auto-download if using model names like 'yolov8n.pt' via ultralytics package,
     but you can also place local weights in ./models/yolov8n.pt
   - YOLO-face: model names differ (e.g., 'yolov8n-face.pt') — place it in ./models/yolov8n-face.pt if you have it.

3) Place OpenCV gender model (optional) at ./models/gender_net.caffemodel and ./models/gender_deploy.prototxt
   (same as before).

Run:
   python detection_service_yolov8.py
"""

import os
import cv2
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
from pathlib import Path
import traceback

# Try to import DeepFace (optional)
DEEPFACE_AVAILABLE = False
try:
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace available")
except Exception as e:
    print("⚠️ DeepFace not available or failed to import:", e)

# Try to import ultralytics YOLO
USE_YOLO = False
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✅ ultralytics YOLO imported")
except Exception as e:
    print("⚠️ ultralytics not available:", e)
    YOLO_AVAILABLE = False

# For fallback
DEFAULT_FACE_CASCADE = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"

class DetectionService:
    def __init__(self):
        print("🔧 Initializing Detection Service...")
        self.models_dir = os.path.join(os.path.dirname(__file__), "models")
        os.makedirs(self.models_dir, exist_ok=True)

        # Try load YOLO person & face models if ultralytics is available
        self.yolo_person = None
        self.yolo_face = None
        self._try_load_yolo_models()

        # Fallback detectors
        self.hog = None
        self.face_cascade = None
        if not self.yolo_person:
            self._init_hog()
        if not self.yolo_face:
            # still initialize face_cascade as fallback
            self.face_cascade = cv2.CascadeClassifier(DEFAULT_FACE_CASCADE)
            print("✅ Haar cascade face detector loaded as fallback")

        # Gender classification: try DeepFace, then OpenCV DNN, then heuristic
        self.gender_net = None
        self.gender_list = ['male', 'female']
        self._try_load_gender_model()
        self.use_deepface = DEEPFACE_AVAILABLE

        print(f"🎯 Mode: {'YOLOv8 (person+face)' if self.yolo_person or self.yolo_face else 'HOG+Haar fallback'}")
        print("🔍 Detection service ready\n")

    def _try_load_yolo_models(self):
        if not YOLO_AVAILABLE:
            return

        # Preferred names - try to load local models first, else ultralytics may auto-download if you supply model string
        person_weights_local = os.path.join(self.models_dir, "yolov8n.pt")
        face_weights_local = os.path.join(self.models_dir, "yolov8n-face.pt")

        # Load person model
        try:
            if os.path.exists(person_weights_local):
                print(f"🔁 Loading person model from {person_weights_local}")
                self.yolo_person = YOLO(person_weights_local)
            else:
                # try a small common model name — ultralytics will download if configured
                try:
                    print("🔁 Attempting to load 'yolov8n.pt' via ultralytics (may auto-download)")
                    self.yolo_person = YOLO("yolov8n.pt")
                except Exception as e:
                    print("⚠️ Could not auto-load 'yolov8n.pt':", e)
                    self.yolo_person = None
            if self.yolo_person:
                print("✅ YOLO person model loaded")
        except Exception as e:
            print("⚠️ Failed to load YOLO person model:", e)
            self.yolo_person = None

        # Load face model (if available)
        try:
            if os.path.exists(face_weights_local):
                print(f"🔁 Loading face model from {face_weights_local}")
                self.yolo_face = YOLO(face_weights_local)
            else:
                # try a conventional name; may not exist on autodelivery
                try:
                    print("🔁 Attempting to load 'yolov8n-face.pt' via ultralytics (may auto-download)")
                    self.yolo_face = YOLO("yolov8n-face.pt")
                except Exception as e:
                    print("⚠️ Could not auto-load 'yolov8n-face.pt':", e)
                    self.yolo_face = None
            if self.yolo_face:
                print("✅ YOLO face model loaded")
        except Exception as e:
            print("⚠️ Failed to load YOLO face model:", e)
            self.yolo_face = None

    def _init_hog(self):
        try:
            self.hog = cv2.HOGDescriptor()
            self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            print("✅ HOG person detector loaded (fallback)")
        except Exception as e:
            print("⚠️ Failed to initialize HOG:", e)
            self.hog = None

    def _try_load_gender_model(self):
        # try load OpenCV DNN gender model if present
        try:
            model_path = os.path.join(self.models_dir, 'gender_net.caffemodel')
            config_path = os.path.join(self.models_dir, 'gender_deploy.prototxt')
            if os.path.exists(model_path) and os.path.exists(config_path):
                self.gender_net = cv2.dnn.readNet(model_path, config_path)
                print("✅ OpenCV gender model loaded")
            else:
                print("⚠️ OpenCV gender model not found in models directory")
        except Exception as e:
            print("⚠️ Error loading OpenCV gender model:", e)
            self.gender_net = None

    @staticmethod
    def xyxy_to_xywh(x1, y1, x2, y2):
        """Convert bbox format"""
        w = x2 - x1
        h = y2 - y1
        return [int(x1), int(y1), int(w), int(h)]

    @staticmethod
    def iou(boxA, boxB):
        # boxes in xyxy
        xA = max(boxA[0], boxB[0])
        yA = max(boxA[1], boxB[1])
        xB = min(boxA[2], boxB[2])
        yB = min(boxA[3], boxB[3])
        interW = max(0, xB - xA)
        interH = max(0, yB - yA)
        interArea = interW * interH
        boxAArea = max(0, boxA[2] - boxA[0]) * max(0, boxA[3] - boxA[1])
        boxBArea = max(0, boxB[2] - boxB[0]) * max(0, boxB[3] - boxB[1])
        union = boxAArea + boxBArea - interArea
        return interArea / union if union > 0 else 0

    def detect_people_yolo(self, frame):
        """Detect people using YOLO person model."""
        try:
            results = self.yolo_person(frame, verbose=False)
            people = []
            for r in results:
                boxes = getattr(r.boxes, 'xyxy', None)
                if boxes is None:
                    continue
                confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, 'conf') else None
                cls_ids = r.boxes.cls.cpu().numpy() if hasattr(r.boxes, 'cls') else None

                boxes_xyxy = boxes.cpu().numpy() if hasattr(boxes, 'cpu') else np.array(boxes)
                for i, b in enumerate(boxes_xyxy):
                    x1, y1, x2, y2 = map(float, b)
                    conf = float(confs[i]) if confs is not None else 0.0
                    cls_id = int(cls_ids[i]) if cls_ids is not None else 0

                    # If model has names list, filter for 'person' class name or class id 0 (COCO)
                    attack_ok = True
                    try:
                        names = r.names if hasattr(r, 'names') else None
                        if names:
                            # If class name exists and not 'person', skip
                            class_name = names.get(cls_id, str(cls_id))
                            if 'person' not in class_name.lower():
                                attack_ok = False
                        else:
                            # fallback: accept class 0 as person
                            if cls_id != 0:
                                attack_ok = False
                    except Exception:
                        pass

                    if attack_ok and conf > 0.25:
                        people.append(([int(x1), int(y1), int(x2), int(y2)], float(conf)))
            return people
        except Exception as e:
            print("⚠️ YOLO person detection error:", e)
            return []

    def detect_faces_yolo(self, frame):
        """Detect faces using YOLO-face model on the whole frame."""
        faces = []
        try:
            results = self.yolo_face(frame, verbose=False)
            for r in results:
                boxes = getattr(r.boxes, 'xyxy', None)
                if boxes is None:
                    continue
                boxes_xyxy = boxes.cpu().numpy() if hasattr(boxes, 'cpu') else np.array(boxes)
                confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, 'conf') else None
                cls_ids = r.boxes.cls.cpu().numpy() if hasattr(r.boxes, 'cls') else None

                for i, b in enumerate(boxes_xyxy):
                    x1, y1, x2, y2 = map(int, b)
                    conf = float(confs[i]) if confs is not None else 0.0
                    faces.append(([x1, y1, x2, y2], conf))
            return faces
        except Exception as e:
            print("⚠️ YOLO face detection error:", e)
            return []

    def detect_people_hog(self, frame):
        """Fallback HOG person detector (returns xyxy)"""
        try:
            boxes, weights = self.hog.detectMultiScale(
                frame,
                winStride=(8, 8),
                padding=(8, 8),
                scale=1.05
            )
            results = []
            for (x, y, w, h), weight in zip(boxes, weights):
                if float(weight) > 0.4:
                    x1, y1, x2, y2 = int(x), int(y), int(x + w), int(y + h)
                    results.append(([x1, y1, x2, y2], float(weight)))
            return results
        except Exception as e:
            print("⚠️ HOG detection error:", e)
            return []

    def detect_faces_haar(self, roi):
        """Detect faces in ROI using Haar cascade (fallback)."""
        try:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24))
            out = []
            for (x, y, w, h) in faces:
                out.append(([x, y, x + w, y + h], 1.0))
            return out
        except Exception as e:
            print("⚠️ Haar face detection error:", e)
            return []

    def classify_gender_deepface(self, face_roi):
        if not self.use_deepface:
            return None
        try:
            if face_roi is None or face_roi.size == 0:
                return None
            analysis = DeepFace.analyze(face_roi, actions=['gender', 'age'], enforce_detection=False, detector_backend='opencv', silent=True)
            if isinstance(analysis, list):
                analysis = analysis[0]
            dominant_gender = analysis.get('dominant_gender') or analysis.get('gender')
            if dominant_gender is None:
                return None
            # DeepFace returns strings like 'Man'/'Woman' or 'male'/'female'
            gender = 'male' if 'man' in str(dominant_gender).lower() or 'male' in str(dominant_gender).lower() else 'female'
            # Confidence extraction is inconsistent; use fallback 0.8
            confidence = 0.8
            if 'gender' in analysis and isinstance(analysis['gender'], dict):
                # some versions give percentages
                try:
                    man_score = analysis['gender'].get('Man') or analysis['gender'].get('Male') or 0
                    confidence = float(man_score) / 100.0 if man_score > 1 else float(man_score)
                    if gender == 'female':
                        woman_score = analysis['gender'].get('Woman') or analysis['gender'].get('Female') or (1 - confidence)
                        confidence = float(woman_score) / 100.0 if woman_score > 1 else float(woman_score)
                except Exception:
                    confidence = 0.8
            age = analysis.get('age')
            return {'gender': gender, 'confidence': float(confidence), 'age': age}
        except Exception as e:
            print("⚠️ DeepFace classify error:", e)
            return None

    def classify_gender_opencv(self, face_roi):
        if self.gender_net is None:
            return None
        try:
            blob = cv2.dnn.blobFromImage(face_roi, 1.0, (227, 227), (78.4263377603, 87.7689143744, 114.895847746), swapRB=False, crop=False)
            self.gender_net.setInput(blob)
            preds = self.gender_net.forward()
            idx = int(np.argmax(preds[0]))
            conf = float(preds[0][idx])
            gender = self.gender_list[idx] if idx < len(self.gender_list) else ('male' if idx == 0 else 'female')
            return {'gender': gender, 'confidence': conf, 'age': None}
        except Exception as e:
            print("⚠️ OpenCV gender classifier error:", e)
            return None

    def classify_gender_heuristic(self, roi):
        # same heuristic - crude fallback on body aspect ratio
        try:
            h, w = roi.shape[:2]
            aspect = h / w if w > 0 else 1.0
            if aspect > 2.2:
                return {'gender': 'male', 'confidence': 0.55, 'age': None}
            else:
                return {'gender': 'female', 'confidence': 0.55, 'age': None}
        except Exception:
            return {'gender': 'unknown', 'confidence': 0.5, 'age': None}

    def detect_and_classify(self, frame):
        """
        Pipeline:
        - Person boxes: YOLO person (preferred) or HOG fallback
        - Face boxes: YOLO-face on full frame (preferred) or Haar inside person ROI fallback
        - Associate face->person by IoU / center-in
        - Classify gender (DeepFace preferred, else OpenCV DNN, else heuristic)
        """
        detections = []

        # --- Person detection ---
        if self.yolo_person:
            people = self.detect_people_yolo(frame)
        elif self.hog:
            people = self.detect_people_hog(frame)
        else:
            people = []
        # normalize to xyxy int boxes with confidence
        peoplexy = []
        for (box, conf) in people:
            # box is either [x1,y1,x2,y2]
            if len(box) == 4:
                x1, y1, x2, y2 = map(int, box)
            else:
                continue
            # clip
            x1 = max(0, x1); y1 = max(0, y1)
            x2 = min(frame.shape[1], x2); y2 = min(frame.shape[0], y2)
            if x2 <= x1 or y2 <= y1:
                continue
            peoplexy.append(((x1, y1, x2, y2), float(conf)))

        # --- Face detection (global) ---
        face_boxes = []
        if self.yolo_face:
            face_boxes = self.detect_faces_yolo(frame)
        # If no global face detection, we will try Haar per person later

        # --- Associate faces to people ---
        for idx, (pbox, pconf) in enumerate(peoplexy):
            x1, y1, x2, y2 = pbox
            person_roi = frame[y1:y2, x1:x2].copy()
            has_face = False
            face_info = None

            # Try to find any face from global face_boxes that overlaps the person
            if face_boxes:
                best_face = None
                best_iou = 0.0
                for (fb, fconf) in face_boxes:
                    fx1, fy1, fx2, fy2 = fb
                    # compute IoU in global coords
                    iou_val = self.iou((x1, y1, x2, y2), (fx1, fy1, fx2, fy2))
                    if iou_val > best_iou:
                        best_iou = iou_val
                        best_face = (fb, fconf)
                if best_face and best_iou > 0.05:
                    has_face = True
                    (fx1, fy1, fx2, fy2), fconf = best_face
                    # crop face ROI from full frame
                    fx1c, fy1c = max(0, fx1), max(0, fy1)
                    fx2c, fy2c = min(frame.shape[1], fx2), min(frame.shape[0], fy2)
                    face_roi = frame[fy1c:fy2c, fx1c:fx2c].copy()
                    face_info = {'bbox': [fx1c, fy1c, fx2c - fx1c, fy2c - fy1c], 'confidence': fconf}
            else:
                # fallback: run Haar inside person ROI
                try:
                    haar_faces = self.detect_faces_haar(person_roi)
                    if haar_faces:
                        # get largest
                        (fx1r, fy1r, fx2r, fy2r), fconf = max(haar_faces, key=lambda t: (t[0][2]-t[0][0])*(t[0][3]-t[0][1]))
                        # convert to global coords
                        fx1g = x1 + fx1r
                        fy1g = y1 + fy1r
                        fx2g = x1 + fx2r
                        fy2g = y1 + fy2r
                        has_face = True
                        face_roi = frame[fy1g:fy2g, fx1g:fx2g].copy()
                        face_info = {'bbox': [fx1g, fy1g, fx2g - fx1g, fy2g - fy1g], 'confidence': fconf}
                except Exception as e:
                    pass

            # Classify gender
            gender_info = None
            if has_face and face_info and 'bbox' in face_info:
                # use face_roi if available
                try:
                    fid = face_info['bbox']
                    fr = frame[fid[1]:fid[1]+fid[3], fid[0]:fid[0]+fid[2]].copy()
                    if fr is None or fr.size == 0:
                        fr = person_roi
                except Exception:
                    fr = person_roi

                # DeepFace preferred
                if self.use_deepface:
                    gender_info = self.classify_gender_deepface(fr)
                # OpenCV DNN next
                if gender_info is None and self.gender_net is not None:
                    gender_info = self.classify_gender_opencv(fr)
            # fallback heuristic on body
            if gender_info is None:
                gender_info = self.classify_gender_heuristic(person_roi)

            method = 'yolo' if (self.yolo_person or self.yolo_face) else 'hog_haar'
            det = {
                'bbox': {'x': int(x1), 'y': int(y1), 'width': int(x2 - x1), 'height': int(y2 - y1)},
                'gender': gender_info.get('gender') if gender_info else 'unknown',
                'confidence_score': float(gender_info.get('confidence', 0.0)) if gender_info else 0.0,
                'person_confidence': float(pconf),
                'metadata': {
                    'has_face': bool(has_face),
                    'face_bbox': face_info.get('bbox') if face_info else None,
                    'face_confidence': float(face_info.get('confidence')) if face_info and 'confidence' in face_info else None,
                    'detection_method': method
                }
            }
            detections.append(det)

        # If no people detected but faces exist and you want to detect individuals from faces alone:
        # (optional) this block will create detections from face boxes when no person boxes are found.
        if len(detections) == 0 and face_boxes:
            for i, (fb, fconf) in enumerate(face_boxes):
                fx1, fy1, fx2, fy2 = fb
                fx1 = max(0, fx1); fy1 = max(0, fy1)
                fx2 = min(frame.shape[1], fx2); fy2 = min(frame.shape[0], fy2)
                face_roi = frame[fy1:fy2, fx1:fx2].copy()
                gender_info = None
                if self.use_deepface:
                    gender_info = self.classify_gender_deepface(face_roi)
                if gender_info is None and self.gender_net:
                    gender_info = self.classify_gender_opencv(face_roi)
                if gender_info is None:
                    gender_info = {'gender': 'unknown', 'confidence': 0.5, 'age': None}
                det = {
                    'bbox': {'x': int(fx1), 'y': int(fy1), 'width': int(fx2 - fx1), 'height': int(fy2 - fy1)},
                    'gender': gender_info.get('gender'),
                    'confidence_score': float(gender_info.get('confidence', 0.0)),
                    'person_confidence': float(fconf),
                    'metadata': {
                        'has_face': True,
                        'face_bbox': [int(fx1), int(fy1), int(fx2 - fx1), int(fy2 - fy1)],
                        'face_confidence': float(fconf),
                        'detection_method': 'yolo_face_only'
                    }
                }
                detections.append(det)

        return detections

    def process_frame(self, frame, camera_id=None):
        if frame is None or frame.size == 0:
            return {'success': False, 'message': 'Invalid frame'}

        # Resize if too big for performance
        max_dim = 1280
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w*scale), int(h*scale)))

        detections = self.detect_and_classify(frame)
        for i, d in enumerate(detections):
            d['detection_id'] = f"det_{camera_id}_{int(datetime.now().timestamp())}_{i}"
            d['detection_time'] = datetime.now().isoformat()
            d['camera_id'] = camera_id

        male_count = len([d for d in detections if d['gender'] == 'male'])
        female_count = len([d for d in detections if d['gender'] == 'female'])

        return {
            'success': True,
            'detections': detections,
            'count': len(detections),
            'male_count': male_count,
            'female_count': female_count,
            'timestamp': datetime.now().isoformat()
        }

    def process_video(self, video_path, job_id=None):
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {'success': False, 'message': 'Cannot open video file'}

        fps = cap.get(cv2.CAP_PROP_FPS) or 25
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        duration = total_frames / fps if fps > 0 else 0

        all_detections = []
        frame_count = 0
        male_count = 0
        female_count = 0
        process_every_n_frames = max(1, int(fps / 2))  # process ~2 FPS

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_count % process_every_n_frames == 0:
                detections = self.detect_and_classify(frame)
                timestamp = str(timedelta(seconds=int(frame_count/fps))) if fps > 0 else "00:00:00"
                for i, det in enumerate(detections):
                    record = {
                        'detection_id': f"det_{job_id}_{frame_count}_{i}",
                        'person_id': f"person_{len(all_detections)}",
                        'gender': det.get('gender'),
                        'direction': 'IN',
                        'detection_time': timestamp,
                        'frame_number': frame_count,
                        'confidence_score': det.get('confidence_score'),
                        'metadata': {
                            'bbox': det.get('bbox'),
                            'person_confidence': det.get('person_confidence'),
                            'age': det.get('metadata', {}).get('age'),
                            'has_face': det.get('metadata', {}).get('has_face'),
                            'face_bbox': det.get('metadata', {}).get('face_bbox'),
                            'detection_method': det.get('metadata', {}).get('detection_method'),
                            'model_version': 'YOLOv8_person_face_v1' if (self.yolo_person or self.yolo_face) else 'HOG_OpenCV_v1'
                        }
                    }
                    all_detections.append(record)
                    if det.get('gender') == 'male':
                        male_count += 1
                    elif det.get('gender') == 'female':
                        female_count += 1

            frame_count += 1

        cap.release()
        return {
            'success': True,
            'detections': all_detections,
            'summary': {
                'total_count': len(all_detections),
                'male_count': male_count,
                'female_count': female_count,
                'male_percentage': (male_count / len(all_detections) * 100) if all_detections else 0,
                'female_percentage': (female_count / len(all_detections) * 100) if all_detections else 0,
                'total_frames': frame_count,
                'processed_frames': frame_count // process_every_n_frames,
                'duration_seconds': duration,
                'fps': fps,
                'detection_method': 'yolov8' if (self.yolo_person or self.yolo_face) else 'hog_haar'
            }
        }


# Flask app (endpoints similar to your original file)
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

print("="*60)
print("🚀 Starting detection service (YOLOv8 upgrade)...")
print("="*60)

detector = DetectionService()

print("="*60)
print("✅ Detection Service Ready")
print("="*60)

@app.route('/api/detection/process-video', methods=['POST'])
def process_video():
    if 'video' not in request.files:
        return jsonify({'success': False, 'message': 'No video file'}), 400
    file = request.files['video']
    if not file or file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Invalid file type'}), 400
    try:
        filepath = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(filepath)
        job_id = f"job_{int(datetime.now().timestamp())}"
        result = detector.process_video(filepath, job_id)
        try:
            os.remove(filepath)
        except:
            pass
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/detection/detect-frame', methods=['POST'])
def detect_frame():
    if 'frame' not in request.files:
        return jsonify({'success': False, 'message': 'No frame'}), 400
    try:
        file = request.files['frame']
        camera_id = request.form.get('camera_id')
        file_bytes = np.frombuffer(file.read(), np.uint8)
        frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        result = detector.process_frame(frame, camera_id)
        return jsonify(result)
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/detection/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'YOLOv8 Detection Service',
        'yolo_available': bool(detector.yolo_person or detector.yolo_face),
        'deepface_available': DEEPFACE_AVAILABLE,
        'opencv_gender_model': detector.gender_net is not None,
        'detection_mode': 'yolov8' if (detector.yolo_person or detector.yolo_face) else 'hog_haar'
    })

@app.route('/api/detection/capabilities', methods=['GET'])
def get_capabilities():
    return jsonify({
        'person_detection': 'YOLOv8' if detector.yolo_person else 'HOG',
        'face_detection': 'YOLOv8-face' if detector.yolo_face else 'Haarcascade',
        'gender_detection': 'DeepFace' if detector.use_deepface else ('OpenCV DNN' if detector.gender_net else 'Heuristic'),
        'supports_age': bool(detector.use_deepface),
        'max_video_size_mb': 1024,
        'supported_formats': list(ALLOWED_EXTENSIONS)
    })

if __name__ == '__main__':
    print("🌐 Server starting at http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)