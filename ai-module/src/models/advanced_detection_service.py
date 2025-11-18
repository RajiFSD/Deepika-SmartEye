# advanced_detection_service.py
"""
Advanced People Counter with Gender Detection using DeepFace
More accurate than basic OpenCV, but requires more resources
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

# Import DeepFace for better face analysis
try:
    from deepface import DeepFace
    DEEPFACE_AVAILABLE = True
    print("✅ DeepFace loaded successfully")
except ImportError:
    DEEPFACE_AVAILABLE = False
    print("⚠️ DeepFace not available. Install with: pip install deepface")

class AdvancedGenderDetectionService:
    def __init__(self):
        """Initialize advanced detection with DeepFace"""
        # Person detection using YOLO (faster and more accurate than HOG)
        self.person_detector = None
        self.load_person_detector()
        
        # Backup: HOG detector
        self.hog = cv2.HOGDescriptor()
        self.hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        self.use_deepface = DEEPFACE_AVAILABLE
        
    def load_person_detector(self):
        """Load YOLO person detector"""
        try:
            # Download YOLO weights if not exists
            weights_path = 'models/yolov3.weights'
            config_path = 'models/yolov3.cfg'
            
            if os.path.exists(weights_path) and os.path.exists(config_path):
                self.person_detector = cv2.dnn.readNet(weights_path, config_path)
                print("✅ YOLO person detector loaded")
            else:
                print("⚠️ YOLO not found. Using HOG detector.")
                print("Download YOLO from: https://pjreddie.com/darknet/yolo/")
        except Exception as e:
            print(f"⚠️ Error loading YOLO: {e}")
    
    def detect_people_yolo(self, frame):
        """Detect people using YOLO"""
        if self.person_detector is None:
            return []
        
        height, width = frame.shape[:2]
        
        # Create blob from image
        blob = cv2.dnn.blobFromImage(
            frame, 1/255.0, (416, 416), swapRB=True, crop=False
        )
        
        self.person_detector.setInput(blob)
        layer_names = self.person_detector.getLayerNames()
        output_layers = [layer_names[i - 1] for i in self.person_detector.getUnconnectedOutLayers()]
        outputs = self.person_detector.forward(output_layers)
        
        boxes = []
        confidences = []
        
        for output in outputs:
            for detection in output:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                # Class 0 is 'person' in COCO dataset
                if class_id == 0 and confidence > 0.5:
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    
                    x = int(center_x - w / 2)
                    y = int(center_y - h / 2)
                    
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
        
        # Non-maximum suppression
        if len(boxes) > 0:
            indices = cv2.dnn.NMSBoxes(boxes, confidences, 0.5, 0.4)
            if len(indices) > 0:
                return [(boxes[i], confidences[i]) for i in indices.flatten()]
        
        return []
    
    def detect_people_hog(self, frame):
        """Fallback: Detect people using HOG"""
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
    
    def analyze_face_deepface(self, face_roi):
        """
        Use DeepFace for comprehensive face analysis
        Returns: gender, age, emotion, race
        """
        if not self.use_deepface:
            return None
        
        try:
            # DeepFace analysis
            analysis = DeepFace.analyze(
                face_roi,
                actions=['gender', 'age', 'emotion'],
                enforce_detection=False,
                detector_backend='opencv'
            )
            
            # Handle both single result and list of results
            if isinstance(analysis, list):
                analysis = analysis[0]
            
            return {
                'gender': 'male' if analysis['dominant_gender'] == 'Man' else 'female',
                'gender_confidence': analysis['gender']['Man'] if analysis['dominant_gender'] == 'Man' else analysis['gender']['Woman'],
                'age': analysis['age'],
                'emotion': analysis['dominant_emotion'],
                'emotion_confidence': max(analysis['emotion'].values())
            }
            
        except Exception as e:
            print(f"DeepFace analysis error: {e}")
            return None
    
    def detect_and_classify(self, frame):
        """Main detection pipeline"""
        detections = []
        
        # Detect people
        if self.person_detector:
            people = self.detect_people_yolo(frame)
        else:
            people = self.detect_people_hog(frame)
        
        print(f"🔍 Detected {len(people)} people in frame")
        
        for (box, confidence) in people:
            x, y, w, h = box
            
            # Extract person ROI
            person_roi = frame[max(0, y):min(frame.shape[0], y+h), 
                              max(0, x):min(frame.shape[1], x+w)]
            
            if person_roi.size == 0:
                continue
            
            # Try to detect and analyze face
            gender_info = None
            
            if self.use_deepface:
                # Try DeepFace analysis
                gender_info = self.analyze_face_deepface(person_roi)
            
            # Fallback to basic classification if DeepFace fails
            if gender_info is None:
                gender_info = self.basic_gender_classification(person_roi)
            
            detection = {
                'bbox': {
                    'x': int(max(0, x)),
                    'y': int(max(0, y)),
                    'width': int(w),
                    'height': int(h)
                },
                'gender': gender_info.get('gender', 'unknown'),
                'confidence_score': float(gender_info.get('gender_confidence', 0.5)),
                'person_confidence': float(confidence),
                'metadata': {
                    'age': gender_info.get('age'),
                    'emotion': gender_info.get('emotion'),
                    'emotion_confidence': gender_info.get('emotion_confidence'),
                    'detection_method': 'deepface' if self.use_deepface and 'age' in gender_info else 'basic'
                }
            }
            
            detections.append(detection)
        
        return detections
    
    def basic_gender_classification(self, roi):
        """Basic fallback gender classification"""
        # Simple heuristic based on aspect ratio and colors
        height, width = roi.shape[:2]
        aspect_ratio = height / width if width > 0 else 1.0
        
        # Convert to HSV for color analysis
        hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
        
        # Very basic heuristic (not accurate, just for fallback)
        if aspect_ratio > 2.2:
            gender = 'male'
            confidence = 0.55
        else:
            gender = 'female'
            confidence = 0.55
        
        return {
            'gender': gender,
            'gender_confidence': confidence
        }
    
    def process_frame(self, frame, camera_id=None):
        """Process single frame"""
        if frame is None or frame.size == 0:
            return {'success': False, 'message': 'Invalid frame'}
        
        # Resize frame if too large (for speed)
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
        
        return {
            'success': True,
            'detections': detections,
            'count': len(detections),
            'male_count': len([d for d in detections if d['gender'] == 'male']),
            'female_count': len([d for d in detections if d['gender'] == 'female']),
            'timestamp': datetime.now().isoformat()
        }
    
    def process_video(self, video_path, job_id=None, progress_callback=None):
        """Process video with progress tracking"""
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
        process_every_n_frames = max(1, int(fps / 2))
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process selected frames
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
                            'emotion': det['metadata'].get('emotion'),
                            'detection_method': det['metadata'].get('detection_method'),
                            'model_version': 'YOLO_DeepFace_v1' if self.use_deepface else 'HOG_Basic_v1'
                        }
                    }
                    
                    all_detections.append(detection_record)
                    
                    if det['gender'] == 'male':
                        male_count += 1
                    elif det['gender'] == 'female':
                        female_count += 1
                
                # Progress callback
                if progress_callback:
                    progress = (frame_count / total_frames) * 100
                    progress_callback(progress, frame_count, total_frames)
                
                # Console progress
                if frame_count % (int(5 * fps)) == 0 and fps > 0:
                    progress = (frame_count / total_frames) * 100
                    print(f"Progress: {progress:.1f}% - "
                          f"Detections: {len(all_detections)} (M:{male_count}, F:{female_count})")
            
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
                'detection_method': 'deepface' if self.use_deepface else 'basic'
            }
        }


# Flask Application
app = Flask(__name__)
CORS(app)

detector = AdvancedGenderDetectionService()

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
        
        job_id = f"job_{int(datetime.now().timestamp())}"
        result = detector.process_video(filepath, job_id)
        
        os.remove(filepath)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error: {e}")
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
        print(f"Error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/detection/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'Advanced Gender Detection Service',
        'deepface_available': DEEPFACE_AVAILABLE,
        'yolo_available': detector.person_detector is not None
    })

@app.route('/api/detection/capabilities', methods=['GET'])
def get_capabilities():
    """Get service capabilities"""
    return jsonify({
        'person_detection': 'YOLO' if detector.person_detector else 'HOG',
        'gender_detection': 'DeepFace' if DEEPFACE_AVAILABLE else 'Basic',
        'supports_age': DEEPFACE_AVAILABLE,
        'supports_emotion': DEEPFACE_AVAILABLE,
        'max_video_size_mb': 500,
        'supported_formats': list(ALLOWED_EXTENSIONS)
    })

if __name__ == '__main__':
    print("🚀 Starting Advanced Gender Detection Service...")
    print(f"📦 DeepFace: {'✅ Loaded' if DEEPFACE_AVAILABLE else '❌ Not available'}")
    print(f"📦 YOLO: {'✅ Loaded' if detector.person_detector else '❌ Not available'}")
    
    os.makedirs('models', exist_ok=True)
    
    print("✅ Service ready!")
    print("🌐 http://localhost:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)