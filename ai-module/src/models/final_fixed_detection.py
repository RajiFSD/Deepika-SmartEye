#!/usr/bin/env python3
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

from detection_service_new import DetectionService, process_video_and_save
import argparse
import cv2
import numpy as np

# Ultra-simple DeepFace wrapper
def ultra_simple_deepface_gender(self, face_img):
    try:
        # Minimal call without any optional parameters that might cause issues
        analysis = DeepFace.analyze(face_img, actions=['gender'], enforce_detection=False)
        
        if isinstance(analysis, list):
            analysis = analysis[0]
        
        dominant_gender = analysis.get('dominant_gender', 'unknown')
        
        # Simple conversion
        if dominant_gender == 'Man':
            return {'gender': 'male', 'confidence': 0.9}
        elif dominant_gender == 'Woman':
            return {'gender': 'female', 'confidence': 0.9}
        else:
            return {'gender': 'unknown', 'confidence': 0.5}
            
    except Exception as e:
        print(f"❌ Ultra-simple DeepFace failed: {e}")
        return None

# Replace just the deepface method, keep the rest of original logic
from deepface import DeepFace
DetectionService.classify_gender_deepface = ultra_simple_deepface_gender

# Disable OpenCV gender model
original_init = DetectionService.__init__

def patched_init(self, models_dir=None):
    original_init(self, models_dir)
    self.gender_net = None
    print("🔧 PATCHED: Using ultra-simple DeepFace")

DetectionService.__init__ = patched_init

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", required=True)
    parser.add_argument("--output", "-o", required=True) 
    parser.add_argument("--min-frames", "-m", type=int, default=3)
    parser.add_argument("--process-fps", "-r", type=int, default=6)
    parser.add_argument("--max-dim", type=int, default=1280)
    args = parser.parse_args()
    
    print("🚀 Running with ULTRA-SIMPLE DeepFace...")
    result = process_video_and_save(args.input, args.output, 
                                  min_frames_for_counting=args.min_frames,
                                  process_fps=args.process_fps, 
                                  max_dim=args.max_dim)
    print("Final result:", result)