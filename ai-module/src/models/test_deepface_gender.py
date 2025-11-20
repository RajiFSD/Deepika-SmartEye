# test_deepface_gender.py
from deepface import DeepFace
import cv2

# Load a test image
img = cv2.imread("test_face.jpg")  # Use any image with a face

# Test DeepFace
result = DeepFace.analyze(img, actions=['gender'], enforce_detection=False)
print("Gender:", result[0]['dominant_gender'])
print("Full result:", result)