import cv2
import numpy as np

# Pretrained gender model
gender_net = cv2.dnn.readNetFromCaffe(
    "deploy_gender.prototxt",
    "gender_net.caffemodel"
)
gender_list = ["Male", "Female"]

# Use OpenCV DNN Face Detector (much better than Haar)
face_proto = "deploy.prototxt"
face_model = "res10_300x300_ssd_iter_140000_fp16.caffemodel"

face_net = cv2.dnn.readNetFromCaffe(face_proto, face_model)

# Load video
cap = cv2.VideoCapture("video3.mp4")

male_count = 0
female_count = 0

unique_faces = []  # store face embeddings
face_id = 0

def get_face_embedding(face_img):
    # Resize + flatten = simple embedding (not perfect, but works)
    resized = cv2.resize(face_img, (32, 32))
    return resized.flatten()

def is_same_face(e1, e2, threshold=3000):
    dist = np.linalg.norm(e1 - e2)
    return dist < threshold

frame_skip = 10
frame_num = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    frame_num += 1
    if frame_num % frame_skip != 0:
        continue

    h, w = frame.shape[:2]

    # Detect faces using DNN
    blob = cv2.dnn.blobFromImage(frame, 1.0, (300,300), (104,117,123))
    face_net.setInput(blob)
    detections = face_net.forward()

    for i in range(0, detections.shape[2]):
        confidence = detections[0,0,i,2]
        if confidence < 0.6:
            continue
        
        box = detections[0,0,i,3:7] * np.array([w,h,w,h])
        x1,y1,x2,y2 = box.astype(int)

        face_img = frame[y1:y2, x1:x2]
        if face_img.size == 0:
            continue

        # Compute simple embedding
        emb = get_face_embedding(face_img)

        # Check uniqueness
        is_new = True
        for saved_emb in unique_faces:
            if is_same_face(emb, saved_emb):
                is_new = False
                break

        if not is_new:
            continue

        unique_faces.append(emb)

        # Gender classification
        face_blob = cv2.dnn.blobFromImage(face_img, 1.0, (227,227),
                                          (78.426, 87.769, 114.896),
                                          swapRB=False)
        gender_net.setInput(face_blob)
        preds = gender_net.forward()
        gender = gender_list[preds[0].argmax()]

        if gender == "Male":
            male_count += 1
        else:
            female_count += 1

cap.release()

print("--------- RESULT ---------")
print("Unique Males:  ", male_count)
print("Unique Females:", female_count)
