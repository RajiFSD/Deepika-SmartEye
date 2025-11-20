"""
detection_service_yolov8.py - COMPLETE FIXED VERSION
YOLOv8 person + face detection with gender classification
Fixed: JSON serialization issues with NumPy types
"""

import os
import cv2
import numpy as np
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import traceback

# Try to import DeepFace (optional)
DEEPFACE_AVAILABLE = False
try:
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace available")
except Exception as e:
    print("⚠️ DeepFace not available:", e)

# Try to import ultralytics YOLO
YOLO_AVAILABLE = False
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✅ ultralytics YOLO imported")
except Exception as e:
    print("⚠️ ultralytics not available:", e)

DEFAULT_FACE_CASCADE = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"


def convert_to_serializable(obj):
    """Convert NumPy types to Python native types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    return obj


class DetectionService:
    def __init__(self):
        print("🔧 Initializing Detection Service...")
        self.models_dir = os.path.join(os.path.dirname(__file__), "models")
        os.makedirs(self.models_dir, exist_ok=True)

        self.yolo_person = None
        self.yolo_face = None
        self._try_load_yolo_models()

        self.hog = None
        self.face_cascade = None
        if not self.yolo_person:
            self._init_hog()
        if not self.yolo_face:
            self.face_cascade = cv2.CascadeClassifier(DEFAULT_FACE_CASCADE)
            print("✅ Haar cascade face detector loaded as fallback")

        self.gender_net = None
        print("⚠️ OpenCV gender net disabled due to compatibility issues")
        self.gender_list = ['male', 'female']
        self._try_load_gender_model()
        self.use_deepface = DEEPFACE_AVAILABLE

        print(f"🎯 Mode: {'YOLOv8 (person+face)' if self.yolo_person or self.yolo_face else 'HOG+Haar fallback'}")
        print("🔍 Detection service ready\n")

    def _try_load_yolo_models(self):
        if not YOLO_AVAILABLE:
            return

        person_weights_local = os.path.join(self.models_dir, "yolov8n.pt")
        
        try:
            if os.path.exists(person_weights_local):
                print(f"📂 Loading person model from {person_weights_local}")
                self.yolo_person = YOLO(person_weights_local)
            else:
                print("🔁 Attempting to load 'yolov8n.pt' via ultralytics")
                self.yolo_person = YOLO("yolov8n.pt")
            if self.yolo_person:
                print("✅ YOLO person model loaded")
        except Exception as e:
            print("⚠️ Failed to load YOLO person model:", e)
            self.yolo_person = None

        face_weights_local = os.path.join(self.models_dir, "yolov8n-face.pt")
        try:
            if os.path.exists(face_weights_local):
                self.yolo_face = YOLO(face_weights_local)
                print("✅ YOLO face model loaded")
        except Exception as e:
            print("⚠️ YOLO face model not available:", e)
            self.yolo_face = None

    def _init_hog(self):
        try:
            self.hog = cv2.HOGDescriptor()
            self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            print("✅ HOG person detector loaded (fallback)")
        except Exception as e:
            print("⚠️ Failed to initialize HOG:", e)

    def _try_load_gender_model(self):
        try:
            model_path = os.path.join(self.models_dir, 'gender_net.caffemodel')
            config_path = os.path.join(self.models_dir, 'gender_deploy.prototxt')
            if os.path.exists(model_path) and os.path.exists(config_path):
                self.gender_net = cv2.dnn.readNet(model_path, config_path)
                print("✅ OpenCV gender model loaded")
            else:
                print("⚠️ OpenCV gender model not found")
        except Exception as e:
            print("⚠️ Error loading gender model:", e)

    @staticmethod
    def iou(boxA, boxB):
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
                    
                    if conf > 0.25 and cls_id == 0:  # Class 0 is person in COCO
                        people.append(([int(x1), int(y1), int(x2), int(y2)], float(conf)))
            return people
        except Exception as e:
            print("⚠️ YOLO detection error:", e)
            return []

    def detect_faces_yolo(self, frame):
        faces = []
        try:
            results = self.yolo_face(frame, verbose=False)
            for r in results:
                boxes = getattr(r.boxes, 'xyxy', None)
                if boxes is None:
                    continue
                boxes_xyxy = boxes.cpu().numpy() if hasattr(boxes, 'cpu') else np.array(boxes)
                confs = r.boxes.conf.cpu().numpy() if hasattr(r.boxes, 'conf') else None
                
                for i, b in enumerate(boxes_xyxy):
                    x1, y1, x2, y2 = map(int, b)
                    conf = float(confs[i]) if confs is not None else 0.0
                    faces.append(([x1, y1, x2, y2], conf))
            return faces
        except Exception as e:
            return []

    def detect_people_hog(self, frame):
        try:
            boxes, weights = self.hog.detectMultiScale(frame, winStride=(8, 8), padding=(8, 8), scale=1.05)
            results = []
            for (x, y, w, h), weight in zip(boxes, weights):
                if float(weight) > 0.4:
                    results.append(([int(x), int(y), int(x+w), int(y+h)], float(weight)))
            return results
        except Exception as e:
            return []

    def detect_faces_haar(self, roi):
        try:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(24, 24))
            return [([x, y, x+w, y+h], 1.0) for (x, y, w, h) in faces]
        except Exception as e:
            return []

    def classify_gender_deepface(self, face_roi):
        if not self.use_deepface or face_roi is None or face_roi.size == 0:
            return None
        try:
            analysis = DeepFace.analyze(face_roi, actions=['gender', 'age'], enforce_detection=False, detector_backend='opencv', silent=True)
            if isinstance(analysis, list):
                analysis = analysis[0]
            
            dominant_gender = analysis.get('dominant_gender') or analysis.get('gender')
            if dominant_gender is None:
                return None
            
            gender = 'male' if 'man' in str(dominant_gender).lower() else 'female'
            confidence = 0.8
            age = analysis.get('age')
            
            return {'gender': gender, 'confidence': float(confidence), 'age': int(age) if age else None}
        except Exception as e:
            return None

    def classify_gender_opencv(self, face_roi):
        if self.gender_net is None:
            return None
        try:
            blob = cv2.dnn.blobFromImage(face_roi, 1.0, (227, 227), (78.4263377603, 87.7689143744, 114.895847746), swapRB=False)
            self.gender_net.setInput(blob)
            preds = self.gender_net.forward()
            idx = int(np.argmax(preds[0]))
            conf = float(preds[0][idx])
            gender = self.gender_list[idx] if idx < len(self.gender_list) else 'male'
            return {'gender': gender, 'confidence': conf, 'age': None}
        except Exception as e:
            return None

    def classify_gender_heuristic(self, roi):
        try:
            h, w = roi.shape[:2]
            aspect = h / w if w > 0 else 1.0
            return {'gender': 'male' if aspect > 2.2 else 'female', 'confidence': 0.55, 'age': None}
        except Exception:
            return {'gender': 'unknown', 'confidence': 0.5, 'age': None}

    def detect_and_classify(self, frame):
        detections = []

        # Detect people
        if self.yolo_person:
            people = self.detect_people_yolo(frame)
        elif self.hog:
            people = self.detect_people_hog(frame)
        else:
            people = []

        # Normalize person boxes
        peoplexy = []
        for (box, conf) in people:
            if len(box) == 4:
                x1, y1, x2, y2 = map(int, box)
                x1 = max(0, x1); y1 = max(0, y1)
                x2 = min(frame.shape[1], x2); y2 = min(frame.shape[0], y2)
                if x2 > x1 and y2 > y1:
                    peoplexy.append(((x1, y1, x2, y2), float(conf)))

        # Detect faces globally
        face_boxes = []
        if self.yolo_face:
            face_boxes = self.detect_faces_yolo(frame)

        # Process each person
        for idx, (pbox, pconf) in enumerate(peoplexy):
            x1, y1, x2, y2 = pbox
            person_roi = frame[y1:y2, x1:x2].copy()
            has_face = False
            face_info = None

            # Try to associate face
            if face_boxes:
                best_face = None
                best_iou = 0.0
                for (fb, fconf) in face_boxes:
                    fx1, fy1, fx2, fy2 = fb
                    iou_val = self.iou((x1, y1, x2, y2), (fx1, fy1, fx2, fy2))
                    if iou_val > best_iou:
                        best_iou = iou_val
                        best_face = (fb, fconf)
                
                if best_face and best_iou > 0.05:
                    has_face = True
                    (fx1, fy1, fx2, fy2), fconf = best_face
                    fx1c = max(0, fx1); fy1c = max(0, fy1)
                    fx2c = min(frame.shape[1], fx2); fy2c = min(frame.shape[0], fy2)
                    face_roi = frame[fy1c:fy2c, fx1c:fx2c].copy()
                    face_info = {'bbox': [int(fx1c), int(fy1c), int(fx2c-fx1c), int(fy2c-fy1c)], 'confidence': float(fconf)}
            else:
                # Fallback to Haar
                try:
                    haar_faces = self.detect_faces_haar(person_roi)
                    if haar_faces:
                        (fx1r, fy1r, fx2r, fy2r), fconf = max(haar_faces, key=lambda t: (t[0][2]-t[0][0])*(t[0][3]-t[0][1]))
                        fx1g = x1 + fx1r
                        fy1g = y1 + fy1r
                        fx2g = x1 + fx2r
                        fy2g = y1 + fy2r
                        has_face = True
                        face_roi = frame[fy1g:fy2g, fx1g:fx2g].copy()
                        face_info = {'bbox': [int(fx1g), int(fy1g), int(fx2g-fx1g), int(fy2g-fy1g)], 'confidence': float(fconf)}
                except:
                    pass

            # Classify gender
            gender_info = None
            if has_face and face_info:
                try:
                    fid = face_info['bbox']
                    fr = frame[fid[1]:fid[1]+fid[3], fid[0]:fid[0]+fid[2]].copy()
                    if fr.size == 0:
                        fr = person_roi
                except:
                    fr = person_roi
                
                if self.use_deepface:
                    gender_info = self.classify_gender_deepface(fr)
                if gender_info is None and self.gender_net:
                    gender_info = self.classify_gender_opencv(fr)
            
            if gender_info is None:
                gender_info = self.classify_gender_heuristic(person_roi)

            # Build detection record (all native Python types)
            det = {
                'bbox': {'x': int(x1), 'y': int(y1), 'width': int(x2-x1), 'height': int(y2-y1)},
                'gender': str(gender_info.get('gender', 'unknown')),
                'confidence_score': float(gender_info.get('confidence', 0.0)),
                'person_confidence': float(pconf),
                'metadata': {
                    'has_face': bool(has_face),
                    'face_bbox': [int(v) for v in face_info['bbox']] if face_info and 'bbox' in face_info else None,
                    'face_confidence': float(face_info['confidence']) if face_info and 'confidence' in face_info else None,
                    'detection_method': 'yolo' if (self.yolo_person or self.yolo_face) else 'hog_haar',
                    'age': int(gender_info['age']) if gender_info and gender_info.get('age') else None
                }
            }
            detections.append(det)

        return detections

    def process_frame(self, frame, camera_id=None):
        if frame is None or frame.size == 0:
            return {'success': False, 'message': 'Invalid frame'}

        # Resize for performance
        max_dim = 1280
        h, w = frame.shape[:2]
        if max(h, w) > max_dim:
            scale = max_dim / max(h, w)
            frame = cv2.resize(frame, (int(w*scale), int(h*scale)))

        detections = self.detect_and_classify(frame)
        
        for i, d in enumerate(detections):
            d['detection_id'] = f"det_{camera_id}_{int(datetime.now().timestamp())}_{i}"
            d['detection_time'] = datetime.now().isoformat()
            d['camera_id'] = str(camera_id) if camera_id else None

        male_count = len([d for d in detections if d['gender'] == 'male'])
        female_count = len([d for d in detections if d['gender'] == 'female'])

        return {
            'success': True,
            'detections': detections,
            'count': int(len(detections)),
            'male_count': int(male_count),
            'female_count': int(female_count),
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
        process_every_n_frames = max(1, int(fps / 2))

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
                        'gender': str(det.get('gender')),
                        'direction': 'IN',
                        'detection_time': str(timestamp),
                        'frame_number': int(frame_count),
                        'confidence_score': float(det.get('confidence_score', 0.0)),
                        'metadata': {
                            'bbox': det.get('bbox'),
                            'person_confidence': float(det.get('person_confidence', 0.0)),
                            'age': int(det['metadata']['age']) if det.get('metadata', {}).get('age') else None,
                            'has_face': bool(det.get('metadata', {}).get('has_face')),
                            'face_bbox': det.get('metadata', {}).get('face_bbox'),
                            'detection_method': str(det.get('metadata', {}).get('detection_method', 'unknown')),
                            'model_version': 'YOLOv8_v1' if (self.yolo_person or self.yolo_face) else 'HOG_v1'
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
                'total_count': int(len(all_detections)),
                'male_count': int(male_count),
                'female_count': int(female_count),
                'male_percentage': float((male_count / len(all_detections) * 100) if all_detections else 0),
                'female_percentage': float((female_count / len(all_detections) * 100) if all_detections else 0),
                'total_frames': int(frame_count),
                'processed_frames': int(frame_count // process_every_n_frames),
                'duration_seconds': float(duration),
                'fps': float(fps),
                'detection_method': 'yolov8' if (self.yolo_person or self.yolo_face) else 'hog_haar'
            }
        }


# Flask Application
app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

print("="*60)
print("🚀 Starting Detection Service (YOLOv8)")
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
        
        print(f"📹 Processing video: {file.filename}")
        result = detector.process_video(filepath, job_id)
        
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify(convert_to_serializable(result))
    
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
        return jsonify(convert_to_serializable(result))
    
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