import cv2
import numpy as np
from ultralytics import YOLO

class YOLOPeopleCounter:
    def __init__(self, model_path="yolov8n.pt", line_position_ratio=0.5):
        self.model = YOLO(model_path)
        self.line_position_ratio = line_position_ratio
        self.line_position = None
        self.tracked_objects = {}
        self.object_id_counter = 0
        self.total_count_up = 0
        self.total_count_down = 0

    def process_video(self, video_path):
        cap = cv2.VideoCapture(video_path)

        if not cap.isOpened():
            print("[ERROR] Cannot open video file.")
            return

        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            frame = cv2.resize(frame, (960, 540))

            if self.line_position is None:
                height, width, _ = frame.shape
                self.line_position = int(height * self.line_position_ratio)

            detections = self.detect_people(frame)
            self.update_tracks(detections)
            self.count_crossings()
            self.draw_results(frame)

            cv2.imshow("YOLOv8 People Counter", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()

    def detect_people(self, frame):
        results = self.model(frame, verbose=False)
        detections = []

        for box in results[0].boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = self.model.names[cls_id]

            if label == 'person' and conf > 0.5:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                centroid = (int((x1 + x2) / 2), int((y1 + y2) / 2))
                detections.append({
                    "bbox": [x1, y1, x2, y2],
                    "centroid": centroid
                })
        return detections

    def update_tracks(self, detections, distance_threshold=50):
        new_tracks = {}
        for det in detections:
            centroid = det["centroid"]
            matched_id = None

            # Match with existing tracked objects
            for obj_id, obj_data in self.tracked_objects.items():
                prev_centroid = obj_data["centroid"]
                distance = np.linalg.norm(np.array(centroid) - np.array(prev_centroid))
                if distance < distance_threshold:
                    matched_id = obj_id
                    break

            if matched_id is not None:
                new_tracks[matched_id] = {
                    "centroid": centroid,
                    "previous_centroid": self.tracked_objects[matched_id]["centroid"],
                    "counted": self.tracked_objects[matched_id]["counted"]
                }
            else:
                self.object_id_counter += 1
                new_tracks[self.object_id_counter] = {
                    "centroid": centroid,
                    "previous_centroid": centroid,
                    "counted": False
                }

        self.tracked_objects = new_tracks

    def count_crossings(self):
        for obj_id, obj_data in self.tracked_objects.items():
            prev_y = obj_data["previous_centroid"][1]
            current_y = obj_data["centroid"][1]

            if not obj_data["counted"]:
                # Crossing from bottom to top
                if prev_y > self.line_position and current_y < self.line_position:
                    self.total_count_up += 1
                    obj_data["counted"] = True
                # Crossing from top to bottom
                elif prev_y < self.line_position and current_y > self.line_position:
                    self.total_count_down += 1
                    obj_data["counted"] = True

    def draw_results(self, frame):
        # Draw line
        cv2.line(frame, (0, self.line_position), (frame.shape[1], self.line_position), (0, 255, 255), 2)

        # Draw boxes and centroids
        for obj_id, obj_data in self.tracked_objects.items():
            cx, cy = obj_data["centroid"]
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)
            cv2.putText(frame, f"ID {obj_id}", (cx - 10, cy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)

        # Draw count info
        cv2.putText(frame, f"UP: {self.total_count_up}", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
        cv2.putText(frame, f"DOWN: {self.total_count_down}", (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

# ---------------- MAIN ----------------
if __name__ == "__main__":
    video_path = "people_walk.mp4"  # change this to your video file
    counter = YOLOPeopleCounter(model_path="yolov8n.pt", line_position_ratio=0.6)
    counter.process_video(video_path)
