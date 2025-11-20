# detection_service_fixed.py
"""
Gender Detection Service - Fixed for compatibility
Works with or without DeepFace/TensorFlow
"""

import cv2
import numpy as np
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import tempfile
import sys

# Try to import DeepFace, but continue without it
DEEPFACE_AVAILABLE = False
try:
    # Suppress TensorFlow warnings
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    import warnings
    warnings.filterwarnings('ignore')
    
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace loaded successfully")
except Exception as e:
    print(f"⚠️ DeepFace not available: {e}")
    print("   Continuing with basic detection (HOG + OpenCV)")

class GenderDetectionService:
    def __init__(self):
        """Initialize detection with available models"""
        print("🔧 Initializing Gender Detection Service...")
        
        # Person detection using HOG (always available)
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        print("✅ HOG person detector loaded")
        
        # Face detection (OpenCV - always available)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        print("✅ Face detector loaded")
        
        # Gender model (OpenCV DNN - optional)
        self.gender_net = None
        self.load_gender_model()
        
        self.use_deepface = DEEPFACE_AVAILABLE
        self.gender_list = ['male', 'female']
        
        print(f"🎯 Detection mode: {'DeepFace (Advanced)' if self.use_deepface else 'OpenCV (Basic)'}")
    
    def load_gender_model(self):
        """Try to load OpenCV gender model"""
        try:
            model_dir = os.path.join(os.path.dirname(__file__), 'models')
            model_path = os.path.join(model_dir, 'gender_net.caffemodel')
            config_path = os.path.join(model_dir, 'gender_deploy.prototxt')
            
            if os.path.exists(model_path) and os.path.exists(config_path):
                self.gender_net = cv2.dnn.readNet(model_path, config_path)
                print("✅ OpenCV gender model loaded")
                return True
            else:
                print("⚠️ OpenCV gender model not found")
                print(f"   Place models in: {model_dir}")
                return False
        except Exception as e:
            print(f"⚠️ Could not load gender model: {e}")
            return False
    
    def detect_people_hog(self, frame):
        """Detect people using HOG"""
        try:
            boxes, weights = self.hog.detectMultiScale(
                frame,
                winStride=(8, 8),
                padding=(16, 16),
                scale=1.05,
                hitThreshold=0.5
            )
            
            results = []
            for i, (x, y, w, h) in enumerate(boxes):
                if weights[i] > 0.5:
                    results.append(([x, y, w, h], float(weights[i])))
            
            return results
        except Exception as e:
            print(f"HOG detection error: {e}")
            return []
    
    def detect_faces_in_roi(self, roi):
        """Detect faces in person ROI"""
        try:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30)
            )
            return faces
        except Exception as e:
            print(f"Face detection error: {e}")
            return []
    
    def classify_gender_deepface(self, face_roi):
        """Classify gender using DeepFace"""
        if not self.use_deepface:
            return None
        
        try:
            # Ensure minimum size
            if face_roi.shape[0] < 48 or face_roi.shape[1] < 48:
                face_roi = cv2.resize(face_roi, (48, 48))
            
            analysis = DeepFace.analyze(
                face_roi,
                actions=['gender', 'age'],
                enforce_detection=False,
                detector_backend='opencv',
                silent=True
            )
            
            if isinstance(analysis, list):
                analysis = analysis[0]
            
            gender = 'male' if analysis.get('dominant_gender') == 'Man' else 'female'
            confidence = analysis.get('gender', {}).get('Man' if gender == 'male' else 'Woman', 0.5)
            age = analysis.get('age', None)
            
            return {
                'gender': gender,
                'confidence': float(confidence) / 100.0 if confidence > 1 else float(confidence),
                'age': age
            }
            
        except Exception as e:
            print(f"DeepFace error: {e}")
            return None
    
    def classify_gender_opencv(self, face_roi):
        """Classify gender using OpenCV DNN model"""
        if self.gender_net is None:
            return None
        
        try:
            blob = cv2.dnn.blobFromImage(
                face_roi,
                1.0,
                (227, 227),
                (78.4263377603, 87.7689143744, 114.895847746),
                swapRB=False
            )
            
            self.gender_net.setInput(blob)
            gender_preds = self.gender_net.forward()
            
            gender_idx = gender_preds[0].argmax()
            confidence = float(gender_preds[0][gender_idx])
            
            return {
                'gender': self.gender_list[gender_idx],
                'confidence': confidence,
                'age': None
            }
            
        except Exception as e:
            print(f"OpenCV gender classification error: {e}")
            return None
    
    def classify_gender_heuristic(self, person_roi):
        """Fallback: Simple heuristic gender classification"""
        height, width = person_roi.shape[:2]
        aspect_ratio = height / width if width > 0 else 1.0
        
        # Very basic heuristic (not accurate)
        # Taller/narrower tends to be classified as male
        if aspect_ratio > 2.2:
            return {
                'gender': 'male',
                'confidence': 0.55,
                'age': None
            }
        else:
            return {
                'gender': 'female',
                'confidence': 0.55,
                'age': None
            }
    
    def detect_and_classify(self, frame):
        """Main detection pipeline"""
        detections = []
        
        # Detect people
        people = self.detect_people_hog(frame)
        print(f"🔍 Detected {len(people)} people")
        
        for (box, person_confidence) in people:
            x, y, w, h = box
            
            # Extract person ROI
            person_roi = frame[max(0, y):min(frame.shape[0], y+h),
                              max(0, x):min(frame.shape[1], x+w)]
            
            if person_roi.size == 0:
                continue
            
            # Detect face in person ROI
            faces = self.detect_faces_in_roi(person_roi)
            
            gender_info = None
            
            if len(faces) > 0:
                # Get largest face
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                face_roi = person_roi[fy:fy+fh, fx:fx+fw]
                
                # Try DeepFace first
                if self.use_deepface:
                    gender_info = self.classify_gender_deepface(face_roi)
                
                # Try OpenCV model if DeepFace failed
                if gender_info is None and self.gender_net is not None:
                    gender_info = self.classify_gender_opencv(face_roi)
            
            # Fallback to heuristic if no face or classification failed
            if gender_info is None:
                gender_info = self.classify_gender_heuristic(person_roi)
            
            detection = {
                'bbox': {
                    'x': int(max(0, x)),
                    'y': int(max(0, y)),
                    'width': int(w),
                    'height': int(h)
                },
                'gender': gender_info['gender'],
                'confidence_score': gender_info['confidence'],
                'person_confidence': person_confidence,
                'metadata': {
                    'age': gender_info.get('age'),
                    'has_face': len(faces) > 0,
                    'detection_method': 'deepface' if self.use_deepface and gender_info.get('age') else 'opencv' if self.gender_net else 'heuristic'
                }
            }
            
            detections.append(detection)
        
        return detections
    
    def process_frame(self, frame, camera_id=None):
        """Process single frame"""
        if frame is None or frame.size == 0:
            return {'success': False, 'message': 'Invalid frame'}
        
        # Resize if too large
        max_dimension = 1280
        height, width = frame.shape[:2]
        
        if max(height, width) > max_dimension:
            scale = max_dimension / max(height, width)
            new_width = int(width * scale)
            new_height = int(height * scale)
            frame = cv2.resize(frame, (new_width, new_height))
        
        detections = self.detect_and_classify(frame)
        
        # Add metadata
        for i, det in enumerate(detections):
            det['detection_id'] = f"det_{camera_id}_{int(datetime.now().timestamp())}_{i}"
            det['detection_time'] = datetime.now().isoformat()
            det['camera_id'] = camera_id
        
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
        """Process entire video"""
        print(f"🎬 Processing video: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {'success': False, 'message': 'Cannot open video file'}
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        print(f"📹 Video: {total_frames} frames, {fps:.2f} FPS, {duration:.2f}s")
        
        all_detections = []
        frame_count = 0
        male_count = 0
        female_count = 0
        
        # Process every Nth frame
        process_every_n_frames = max(1, int(fps / 2))  # 2 FPS processing
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % process_every_n_frames == 0:
                timestamp = str(timedelta(seconds=frame_count/fps)) if fps > 0 else "00:00:00"
                
                detections = self.detect_and_classify(frame)
                
                for i, det in enumerate(detections):
                    detection_record = {
                        'detection_id': f"det_{job_id}_{frame_count}_{i}",
                        'person_id': f"person_{len(all_detections)}",
                        'gender': det['gender'],
                        'direction': 'IN',
                        'detection_time': timestamp,
                        'frame_number': frame_count,
                        'confidence_score': det['confidence_score'],
                        'metadata': {
                            'bbox': det['bbox'],
                            'person_confidence': det['person_confidence'],
                            'age': det['metadata'].get('age'),
                            'has_face': det['metadata'].get('has_face'),
                            'detection_method': det['metadata'].get('detection_method'),
                            'model_version': 'HOG_OpenCV_v1'
                        }
                    }
                    
                    all_detections.append(detection_record)
                    
                    if det['gender'] == 'male':
                        male_count += 1
                    elif det['gender'] == 'female':
                        female_count += 1
                
                # Progress update
                if frame_count % (int(5 * fps)) == 0 and fps > 0:
                    progress = (frame_count / total_frames) * 100
                    print(f"Progress: {progress:.1f}% - Detections: {len(all_detections)} (M:{male_count}, F:{female_count})")
            
            frame_count += 1
        
        cap.release()
        
        print(f"✅ Complete: {len(all_detections)} detections (M:{male_count}, F:{female_count})")
        
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
                'detection_method': 'deepface' if self.use_deepface else 'opencv'
            }
        }


# Flask Application
app = Flask(__name__)
CORS(app)

# Initialize detector
print("\n" + "="*60)
print("🚀 Initializing Detection Service...")
print("="*60 + "\n")

detector = GenderDetectionService()

print("\n" + "="*60)
print("✅ Detection Service Ready!")
print("="*60 + "\n")

UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mov', 'mkv', 'webm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/detection/process-video', methods=['POST'])
def process_video():
    """Process uploaded video"""
    if 'video' not in request.files:
        return jsonify({'success': False, 'message': 'No video file'}), 400
    
    file = request.files['video']
    
    if not file or file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Invalid file type'}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        print(f"\n📥 Received video: {filename}")
        
        job_id = f"job_{int(datetime.now().timestamp())}"
        result = detector.process_video(filepath, job_id)
        
        # Clean up
        try:
            os.remove(filepath)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/detection/detect-frame', methods=['POST'])
def detect_frame():
    """Detect in single frame"""
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
        print(f"❌ Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/detection/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'Gender Detection Service',
        'deepface_available': DEEPFACE_AVAILABLE,
        'opencv_model_available': detector.gender_net is not None,
        'detection_mode': 'deepface' if DEEPFACE_AVAILABLE else 'opencv' if detector.gender_net else 'heuristic'
    })

@app.route('/api/detection/capabilities', methods=['GET'])
def get_capabilities():
    """Get capabilities"""
    return jsonify({
        'person_detection': 'HOG',
        'gender_detection': 'DeepFace' if DEEPFACE_AVAILABLE else 'OpenCV' if detector.gender_net else 'Heuristic',
        'supports_age': DEEPFACE_AVAILABLE,
        'supports_emotion': False,
        'max_video_size_mb': 500,
        'supported_formats': list(ALLOWED_EXTENSIONS)
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🌐 Starting Flask Server...")
    print("="*60)
    print(f"\n📍 Server: http://localhost:5000")
    print(f"🔍 Detection Mode: {'DeepFace' if DEEPFACE_AVAILABLE else 'OpenCV'}")
    print(f"📊 Endpoints:")
    print(f"   POST /api/detection/process-video")
    print(f"   POST /api/detection/detect-frame")
    print(f"   GET  /api/detection/health")
    print(f"   GET  /api/detection/capabilities")
    print("\n" + "="*60 + "\n")
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)