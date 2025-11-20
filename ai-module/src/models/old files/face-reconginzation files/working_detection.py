#!/usr/bin/env python3
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from detection_service_new import DetectionService, process_video_and_save
import argparse
import cv2
import numpy as np

# Fix the DeepFace gender classification method
def fixed_classify_gender_deepface(self, face_img):
    if not self.use_deepface:
        return None
    try:
        analysis = DeepFace.analyze(face_img, actions=['gender'], enforce_detection=False, detector_backend='opencv', prog_bar=False)
        if isinstance(analysis, list):
            analysis = analysis[0]
        
        # Debug print to see what DeepFace returns
        print(f"🎯 DeepFace raw result: {analysis.get('dominant_gender')}, confidence: {analysis.get('gender', {})}")
        
        dominant_gender = analysis.get('dominant_gender')
        gender_data = analysis.get('gender', {})
        
        # Convert DeepFace format to our format
        if dominant_gender == 'Man':
            gender = 'male'
            confidence = float(gender_data.get('Man', 0.99)) / 100.0
        elif dominant_gender == 'Woman':
            gender = 'female' 
            confidence = float(gender_data.get('Woman', 0.99)) / 100.0
        else:
            gender = 'unknown'
            confidence = 0.5
            
        return {'gender': gender, 'confidence': confidence}
    except Exception as e:
        print(f"❌ DeepFace error in fixed method: {e}")
        return None

# Fix the main gender classification method
def fixed_classify_gender(self, frame, person_box, face_boxes_global):
    x1, y1, x2, y2 = person_box
    x1, y1, x2, y2 = max(0, x1), max(0, y1), min(frame.shape[1], x2), min(frame.shape[0], y2)
    
    # Try to find face in the person box
    face_img = None
    appearance = None
    
    # Method 1: Use YOLO face detection if available
    for (fb, fconf) in face_boxes_global:
        fx1, fy1, fx2, fy2 = fb
        # Check if face is within person box
        if (fx1 >= x1 and fx2 <= x2 and fy1 >= y1 and fy2 <= y2):
            face_img = frame[fy1:fy2, fx1:fx2]
            break
    
    # Method 2: Use Haar cascade if no YOLO face found
    if face_img is None or face_img.size == 0:
        try:
            roi = frame[y1:y2, x1:x2]
            if roi.size > 0:
                haar_faces = self.detect_faces_in_roi(roi)
                if haar_faces:
                    hx, hy, hw, hh = max(haar_faces, key=lambda t: t[2]*t[3])
                    fx1c = x1 + hx
                    fy1c = y1 + hy
                    fx2c = fx1c + hw
                    fy2c = fy1c + hh
                    face_img = frame[fy1c:fy2c, fx1c:fx2c]
        except Exception:
            pass
    
    # Method 3: Use entire person ROI as fallback
    if face_img is None or face_img.size == 0:
        face_img = frame[y1:y2, x1:x2]
    
    if face_img is not None and face_img.size > 0:
        # Resize if too small for DeepFace
        h, w = face_img.shape[:2]
        if h < 50 or w < 50:
            face_img = cv2.resize(face_img, (100, 100))
        
        # Compute appearance embedding
        appearance = self.compute_appearance_embedding(face_img)
        
        # Use DeepFace for gender classification
        res = self.classify_gender_deepface(face_img)
        
        if res is None:
            # Fallback to heuristic
            h_roi, w_roi = face_img.shape[:2]
            aspect = h_roi / (w_roi + 1e-6)
            gender = 'male' if aspect > 1.6 else 'female'
            res = {'gender': gender, 'confidence': 0.5}
        
        print(f"✅ Final gender: {res['gender']} (conf: {res['confidence']:.2f})")
        return {
            'gender': res['gender'],
            'gender_conf': res['confidence'],
            'face_box': None,
            'appearance': appearance
        }
    else:
        return {'gender': 'unknown', 'gender_conf': 0.0, 'face_box': None, 'appearance': None}

# Monkey patch the methods
from deepface import DeepFace

DetectionService.classify_gender_deepface = fixed_classify_gender_deepface
DetectionService.classify_gender = fixed_classify_gender

# Disable OpenCV gender model
original_init = DetectionService.__init__

def patched_init(self, models_dir=None):
    original_init(self, models_dir)
    self.gender_net = None
    print("🔧 PATCHED: Using fixed DeepFace gender detection")

DetectionService.__init__ = patched_init

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", required=True)
    parser.add_argument("--output", "-o", required=True) 
    parser.add_argument("--min-frames", "-m", type=int, default=3)
    parser.add_argument("--process-fps", "-r", type=int, default=6)
    parser.add_argument("--max-dim", type=int, default=1280)
    args = parser.parse_args()
    
    print("🚀 Running with FIXED DeepFace gender detection...")
    result = process_video_and_save(args.input, args.output, 
                                  min_frames_for_counting=args.min_frames,
                                  process_fps=args.process_fps, 
                                  max_dim=args.max_dim)
    print("Final result:", result)