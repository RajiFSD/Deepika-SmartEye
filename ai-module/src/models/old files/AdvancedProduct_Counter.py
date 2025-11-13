import cv2
import numpy as np
import torch

class AdvancedProductCounter:
    def __init__(self, model_path=None):
        # Load YOLOv5 model (you can train custom model for your products)
        if model_path:
            self.model = torch.hub.load('ultralytics/yolov5', 'custom', path=model_path)
        else:
            # Use pre-trained model for general object detection
            self.model = torch.hub.load('ultralytics/yolov5', 'yolov5s')
        
        self.product_classes = ['bottle', 'cup', 'bowl', 'box']  # Customize for your products
        
    def detect_and_count(self, frame):
        """Detect products using YOLO and count them"""
        results = self.model(frame)
        
        # Parse results - Fixed syntax error
        detections = results.pandas().xyxy[0]
        
        # Filter for product classes
        product_detections = detections[detections['name'].isin(self.product_classes)]
        
        count = len(product_detections)
        
        # Draw bounding boxes
        for idx, detection in product_detections.iterrows():
            x1, y1, x2, y2 = int(detection['xmin']), int(detection['ymin']), int(detection['xmax']), int(detection['ymax'])
            confidence = detection['confidence']
            class_name = detection['name']
            
            # Draw rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Add label
            label = f'{class_name}: {confidence:.2f}'
            cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        return frame, count
    
    def count_from_video(self, video_path=0):
        """Count products from video feed"""
        cap = cv2.VideoCapture(video_path)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Detect and count
            processed_frame, count = self.detect_and_count(frame)
            
            # Display count
            cv2.putText(processed_frame, f'Products: {count}', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            cv2.imshow('Advanced Product Counter', processed_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

# Usage
if __name__ == "__main__":
    advanced_counter = AdvancedProductCounter()
    advanced_counter.count_from_video()