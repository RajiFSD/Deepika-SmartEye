#!/usr/bin/env python3
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import cv2
from deepface import DeepFace
import numpy as np

def test_deepface_gender():
    print("🧪 Testing DeepFace gender detection...")
    
    # Test with a simple image or your video
    cap = cv2.VideoCapture("input.mp4")
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        print("❌ Could not read video frame")
        return
    
    # Try DeepFace directly
    try:
        print("🔍 Running DeepFace.analyze...")
        results = DeepFace.analyze(frame, actions=['gender'], enforce_detection=False, detector_backend='opencv')
        print("✅ DeepFace results:", results)
        
        if isinstance(results, list):
            for i, result in enumerate(results):
                print(f"Result {i}: {result}")
        else:
            print(f"Single result: {results}")
            
    except Exception as e:
        print(f"❌ DeepFace error: {e}")
        print("Trying with smaller image...")
        
        # Try with a resized image
        small_frame = cv2.resize(frame, (640, 360))
        try:
            results = DeepFace.analyze(small_frame, actions=['gender'], enforce_detection=False, detector_backend='opencv')
            print("✅ DeepFace results (resized):", results)
        except Exception as e2:
            print(f"❌ DeepFace error even with resized: {e2}")

if __name__ == "__main__":
    test_deepface_gender()