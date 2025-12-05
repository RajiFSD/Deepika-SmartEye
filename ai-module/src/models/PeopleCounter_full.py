import cv2
import numpy as np
from collections import defaultdict, deque
import sys
sys.stdout.reconfigure(encoding='utf-8')
import os



# ================== CONFIG ==================

# Use your HTTP IP camera:
CAMERA_SOURCE = "http://192.168.31.89:8080/video"

# Other examples:
# CAMERA_SOURCE = 0  # laptop / USB camera
# CAMERA_SOURCE = "rtsp://user:pass@192.168.1.10:554/stream"
# CAMERA_SOURCE = "D:\Web APP\Samrteye-Python\entrance_video.mp4"
# FACE_PROTO = "models/deploy.prototxt"
# FACE_MODEL = "models/res10_300x300_ssd_iter_140000_fp16.caffemodel"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FACE_PROTO  = os.path.join(BASE_DIR, "models", "deploy.prototxt")
FACE_MODEL  = os.path.join(BASE_DIR, "models", "res10_300x300_ssd_iter_140000_fp16.caffemodel")

GENDER_PROTO = os.path.join(BASE_DIR, "models", "deploy_gender.prototxt")
GENDER_MODEL = os.path.join(BASE_DIR, "models", "gender_net.caffemodel")

CONF_FACE = 0.5      # face detection confidence threshold
CONF_GENDER = 0.3    # gender prediction confidence threshold


# ============================================


def create_tracker():
    import cv2

    tracker = None

    # Try legacy CSRT / MOSSE first (if available)
    if hasattr(cv2, "legacy"):
        if hasattr(cv2.legacy, "TrackerCSRT_create"):
            return cv2.legacy.TrackerCSRT_create()
        if hasattr(cv2.legacy, "TrackerMOSSE_create"):
            return cv2.legacy.TrackerMOSSE_create()

    # Try non-legacy CSRT / MOSSE (some builds expose like this)
    if hasattr(cv2, "TrackerCSRT_create"):
        return cv2.TrackerCSRT_create()
    if hasattr(cv2, "TrackerMOSSE_create"):
        return cv2.TrackerMOSSE_create()

    # Fallback to KCF / MIL (usually available even without contrib)
    if hasattr(cv2, "TrackerKCF_create"):
        return cv2.TrackerKCF_create()
    if hasattr(cv2, "TrackerMIL_create"):
        return cv2.TrackerMIL_create()

    # Last chance: legacy KCF/MIL
    if hasattr(cv2, "legacy"):
        if hasattr(cv2.legacy, "TrackerKCF_create"):
            return cv2.legacy.TrackerKCF_create()
        if hasattr(cv2.legacy, "TrackerMIL_create"):
            return cv2.legacy.TrackerMIL_create()

    # If *nothing* found, raise clear error
    raise RuntimeError(
        "No OpenCV object tracker found. "
        "Install opencv-contrib-python or use a build with tracking modules."
    )


class PeopleCounter:
    def __init__(self):
        print("✅ Loading face & gender models...")
        # self.face_net = cv2.dnn.readNetFromCaffe(FACE_PROTO, FACE_MODEL)
        # self.gender_net = cv2.dnn.readNetFromCaffe(GENDER_PROTO, GENDER_MODEL)
        # self.gender_net = cv2.dnn.readNet(GENDER_MODEL)

        print("✅ Skipping face & gender models for live counting...")
        self.face_net = None
        self.gender_net = None

        self.GENDER_LIST = ["Male", "Female"]

        # Tracking and IDs
        self.trackers = {}           # id -> tracker
        self.object_gender = {}      # id -> "Male"/"Female"/"Unknown"
        self.history = defaultdict(lambda: deque(maxlen=30))  # id -> last center_y positions
        self.next_id = 1

        # Counts
        self.entered = {"Male": 0, "Female": 0}
        self.exited = {"Male": 0, "Female": 0}

        # Horizontal line for counting (set after first frame)
        self.line_y = None

        # Labor uniform color ranges in HSV
        self.labor_colors = {
            "blue":   (np.array([100, 150,   0], np.uint8), np.array([140, 255, 255], np.uint8)),
            "orange": (np.array([10,  100, 100], np.uint8), np.array([25,  255, 255], np.uint8)),
            "gray":   (np.array([0,     0,  50], np.uint8), np.array([180,  50, 200], np.uint8)),
        }

    # ------------- Detection -----------------

    def detect_faces(self, frame):
        """
        Run face detection on a frame and return (x, y, w, h) for each face.
        """
        h, w = frame.shape[:2]
        blob = cv2.dnn.blobFromImage(
            cv2.resize(frame, (300, 300)),
            1.0,
            (300, 300),
            (104.0, 177.0, 123.0)
        )
        self.face_net.setInput(blob)
        detections = self.face_net.forward()

        faces = []
        for i in range(detections.shape[2]):
            confidence = detections[0, 0, i, 2]
            if confidence > CONF_FACE:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                x1, y1, x2, y2 = box.astype(int)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w - 1, x2), min(h - 1, y2)
                faces.append((x1, y1, x2 - x1, y2 - y1))
        return faces


    def predict_gender(self, face_roi):       
        """        Predict gender for a given face ROI.        Returns (gender, confidence).
        """
        if face_roi is None or face_roi.size == 0:
            return "Unknown", 0.0

        blob = cv2.dnn.blobFromImage(
            cv2.resize(face_roi, (224, 224)),
            1.0 / 255.0,
            (224, 224),
            (0, 0, 0),
            swapRB=True,
            crop=False
        )
        self.gender_net.setInput(blob)
        preds = self.gender_net.forward()

        gender_id = preds[0].argmax()
        confidence = preds[0][gender_id]

        gender = "Male" if gender_id == 1 else "Female"

        return gender, float(confidence) 


        


    # ------------- Uniform detection -----------------

    def is_labor_uniform(self, frame, bbox):
        """
        Check if person wears a labor uniform (blue/orange/gray) based on upper body colors.
        bbox: (x1, y1, x2, y2) in frame coordinates
        """
        x1, y1, x2, y2 = bbox
        h, w = frame.shape[:2]

        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(w - 1, x2)
        y2 = min(h - 1, y2)

        if x2 <= x1 or y2 <= y1:
            return False

        # Approx upper body region: from y1 to middle of bbox
        mid_y = y1 + (y2 - y1) // 2
        upper_body = frame[y1:mid_y, x1:x2]

        if upper_body.size == 0:
            return False

        hsv = cv2.cvtColor(upper_body, cv2.COLOR_BGR2HSV)

        for (lower, upper) in self.labor_colors.values():
            mask = cv2.inRange(hsv, lower, upper)
            ratio = np.sum(mask > 0) / float(mask.size)
            if ratio > 0.3:  # 30% of upper body has that color
                return True

        return False

    # ------------- Tracking -----------------

    def update_tracking(self, frame, faces):
        """
        Update trackers and add new ones for unmatched face detections.
        Returns dict: obj_id -> (x1, y1, x2, y2)
        """
        current_objects = {}

        # Update existing trackers
        for obj_id in list(self.trackers.keys()):
            tracker = self.trackers[obj_id]
            ok, bbox = tracker.update(frame)
            if not ok:
                # lost tracking
                del self.trackers[obj_id]
                if obj_id in self.object_gender:
                    del self.object_gender[obj_id]
                continue

            x, y, w, h = [int(v) for v in bbox]
            x1, y1, x2, y2 = x, y, x + w, y + h
            current_objects[obj_id] = (x1, y1, x2, y2)

        # Associate detections with existing trackers using IoU
        used_faces = set()
        for obj_id, (tx1, ty1, tx2, ty2) in current_objects.items():
            best_iou = 0.0
            best_face_idx = -1
            for i, (fx, fy, fw, fh) in enumerate(faces):
                if i in used_faces:
                    continue
                fx1, fy1, fx2, fy2 = fx, fy, fx + fw, fy + fh

                # IoU
                ix1 = max(tx1, fx1)
                iy1 = max(ty1, fy1)
                ix2 = min(tx2, fx2)
                iy2 = min(ty2, fy2)
                iw = max(0, ix2 - ix1)
                ih = max(0, iy2 - iy1)
                inter = iw * ih
                if inter == 0:
                    continue
                area_t = (tx2 - tx1) * (ty2 - ty1)
                area_f = (fx2 - fx1) * (fy2 - fy1)
                iou = inter / float(area_t + area_f - inter)
                if iou > best_iou:
                    best_iou = iou
                    best_face_idx = i

            if best_face_idx != -1 and best_iou > 0.3:
                used_faces.add(best_face_idx)

        # Add trackers for new faces (not matched to existing trackers)
        for i, (x, y, w, h) in enumerate(faces):
            if i in used_faces:
                continue
            tracker = create_tracker()
            tracker.init(frame, (x, y, w, h))
            obj_id = self.next_id
            self.next_id += 1

            self.trackers[obj_id] = tracker
            x1, y1, x2, y2 = x, y, x + w, y + h
            current_objects[obj_id] = (x1, y1, x2, y2)

            # Predict gender once for this object
            face_roi = frame[y1:y2, x1:x2]
            gender, conf = self.predict_gender(face_roi)
            if conf >= CONF_GENDER:
                self.object_gender[obj_id] = gender
            else:
                self.object_gender[obj_id] = "Unknown"

        return current_objects

    # ------------- Counting -----------------

    def update_counts(self, frame, objects):
        """
        Update enter/exit counts based on line crossing.
        """
        h, w = frame.shape[:2]
        if self.line_y is None:
            self.line_y = h // 2  # middle of the frame

        for obj_id, (x1, y1, x2, y2) in objects.items():
            cy = (y1 + y2) // 2
            hist = self.history[obj_id]
            hist.append(cy)

            if len(hist) < 2:
                continue

            prev_y = hist[-2]
            curr_y = hist[-1]

            # Get gender and skip unknown/labor
            gender = self.object_gender.get(obj_id, "Unknown")
            if gender not in ("Male", "Female"):
                gender = "Male"   # or "Unknown"

            # Skip labor uniforms
            if self.is_labor_uniform(frame, (x1, y1, x2, y2)):
                continue

            # DOWN crossing (enter)
            if prev_y < self.line_y <= curr_y:
                self.entered[gender] += 1
                print(f"ENTER: {gender} (ID {obj_id})")

            # UP crossing (exit)
            elif prev_y > self.line_y >= curr_y:
                self.exited[gender] += 1
                print(f"EXIT:  {gender} (ID {obj_id})")

    # ------------- Drawing -----------------

    def draw(self, frame, objects):
        h, w = frame.shape[:2]
        if self.line_y is None:
            self.line_y = h // 2

        # Counting line
        cv2.line(frame, (0, self.line_y), (w, self.line_y), (0, 255, 0), 2)
        cv2.putText(frame, "COUNT LINE", (10, self.line_y - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # Draw tracked objects
        for obj_id, (x1, y1, x2, y2) in objects.items():
            gender = self.object_gender.get(obj_id, "Unknown")
            color = (0, 255, 0) if gender == "Male" else (255, 0, 255)
            if gender == "Unknown":
                color = (0, 255, 255)

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"ID {obj_id}: {gender}"
            cv2.putText(frame, label, (x1, max(0, y1 - 10)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # Stats
        y0 = 30
        cv2.putText(
            frame,
            f"ENTERED  M: {self.entered['Male']}  F: {self.entered['Female']}",
            (10, y0),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6,
            (255, 255, 255), 2
        )
        cv2.putText(
            frame,
            f"EXITED   M: {self.exited['Male']}  F: {self.exited['Female']}",
            (10, y0 + 30),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6,
            (255, 255, 255), 2
        )
        cv2.putText(
            frame,
            f"INSIDE   M: {max(0, self.entered['Male'] - self.exited['Male'])}  "
            f"F: {max(0, self.entered['Female'] - self.exited['Female'])}",
            (10, y0 + 60),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6,
            (0, 255, 255), 2
        )

        return frame

    # ------------- Main per-frame processing -----------------

    def process(self, frame):
        # Resize for speed & more stable line position
        frame = cv2.resize(frame, (800, 600))

        faces = self.detect_faces(frame)
        objects = self.update_tracking(frame, faces)
        self.update_counts(frame, objects)
        out = self.draw(frame, objects)
        return out

    def get_live_objects(self):
        result = []
        for obj_id, data in self.objects.items():
            x, y, w, h = data["bbox"]
            gender = data.get("gender", "Unknown")
            conf = data.get("confidence", 0)

            result.append({
                "id": obj_id,
                "gender": gender,
                "confidence": conf,
                "bbox": [x, y, w, h],
                "direction": data.get("direction", None)
            })
        return result


def main():
    print(cv2.__version__)
    print(hasattr(cv2, "legacy"))
    tracker = cv2.legacy.TrackerCSRT_create()
    print(tracker)
    print(f"Opening camera source: {CAMERA_SOURCE}")
    cap = cv2.VideoCapture(CAMERA_SOURCE)

    # ----- SAVE OUTPUT VIDEO -----
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")  # or 'XVID'
    out_writer = cv2.VideoWriter(
        "output_saved.mp4",   # filename
        fourcc,
        20.0,                 # FPS
        (800, 600)            # frame size (same as processed)
    )
    print("💾 Saving output to: output_saved.mp4")


    if not cap.isOpened():
        print("❌ Could not open video source")
        return

    counter = PeopleCounter()
    print("✅ People counter started")
    print("Press 'q' to quit, 'r' to reset counts")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ No frame received, ending.")
            break

        processed = counter.process(frame)
        out_writer.write(processed)
        cv2.imshow("People Counter + Gender + Tracking", processed)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break
        elif key == ord("r"):
            counter.entered = {"Male": 0, "Female": 0}
            counter.exited = {"Male": 0, "Female": 0}
            counter.history.clear()
            print("Counts reset")

    cap.release()
    cv2.destroyAllWindows()
    out_writer.release()
    print("Video saved successfully")

    print("\n=== FINAL STATS ===")
    print(f"Entered  - Male: {counter.entered['Male']}, Female: {counter.entered['Female']}")
    print(f"Exited   - Male: {counter.exited['Male']}, Female: {counter.exited['Female']}")
    print(f"Inside   - Male: {max(0, counter.entered['Male'] - counter.exited['Male'])}, "
          f"Female: {max(0, counter.entered['Female'] - counter.exited['Female'])}")


if __name__ == "__main__":
    main()