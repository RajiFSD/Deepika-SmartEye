"""
Modern Product Counter using YOLOv8
Requires: pip install ultralytics opencv-python
"""
from ultralytics import YOLO
import cv2
import numpy as np

class ModernProductCounter:
    def __init__(self, model_name='yolov8n.pt'):
        """
        Initialize with YOLOv8 model
        model_name: 'yolov8n.pt' (nano - fastest), 'yolov8s.pt' (small), 'yolov8m.pt' (medium)
        """
        print(f"Loading {model_name}...")
        self.model = YOLO(model_name)
        
        # Product classes to detect (COCO dataset classes)
        self.product_classes = [
            'bottle', 'cup', 'bowl', 'wine glass', 'fork', 'knife', 
            'spoon', 'banana', 'apple', 'sandwich', 'orange', 'broccoli',
            'carrot', 'hot dog', 'pizza', 'donut', 'cake'
        ]
        
    def count_products(self, frame, confidence_threshold=0.5):
        """Detect and count products in frame"""
        results = self.model(frame, verbose=False)
        
        products = []
        for result in results:
            boxes = result.boxes
            
            for box in boxes:
                # Get box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                
                # Filter by confidence and class
                if confidence >= confidence_threshold and class_name in self.product_classes:
                    products.append({
                        'bbox': (x1, y1, x2, y2),
                        'confidence': confidence,
                        'class': class_name
                    })
        
        return products
    
    def draw_detections(self, frame, products):
        """Draw bounding boxes and labels"""
        for i, product in enumerate(products):
            x1, y1, x2, y2 = product['bbox']
            confidence = product['confidence']
            class_name = product['class']
            
            # Draw rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            # Draw label background
            label = f"{i+1}. {class_name} {confidence:.2f}"
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w, y1), (0, 255, 0), -1)
            
            # Draw label text
            cv2.putText(frame, label, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        return frame
    
    def run(self, video_source=0):
        """Run product counter"""
        cap = cv2.VideoCapture(video_source)
        
        if not cap.isOpened():
            print(f"Error: Cannot open video source {video_source}")
            return
        
        print("\nControls:")
        print("  'q' - Quit")
        print("  'p' - Pause/Resume")
        print("  's' - Save screenshot")
        
        paused = False
        frame_count = 0
        
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    print("End of video or cannot read frame")
                    break
                
                frame_count += 1
                
                # Detect products
                products = self.count_products(frame)
                
                # Draw detections
                frame = self.draw_detections(frame, products)
                
                # Draw info panel
                info_text = [
                    f"Products: {len(products)}",
                    f"Frame: {frame_count}",
                    f"FPS: {cap.get(cv2.CAP_PROP_FPS):.1f}"
                ]
                
                y_offset = 30
                for text in info_text:
                    cv2.putText(frame, text, (10, y_offset),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    y_offset += 30
            
            # Display frame
            cv2.imshow('Product Counter - YOLOv8', frame)
            
            # Handle keyboard
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                break
            elif key == ord('p'):
                paused = not paused
                status = "PAUSED" if paused else "RESUMED"
                print(f"{status}")
            elif key == ord('s'):
                filename = f"screenshot_{frame_count}.jpg"
                cv2.imwrite(filename, frame)
                print(f"Saved: {filename}")
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    # Initialize counter
    counter = ModernProductCounter(model_name='yolov8n.pt')
    
    # Run with webcam
    counter.run(video_source=0)
    
    # Or use video file:
    # counter.run(video_source='products.mp4')