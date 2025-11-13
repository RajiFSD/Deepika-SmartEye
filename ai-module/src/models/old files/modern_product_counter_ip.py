# modern_product_counter_ip.py
from ultralytics import YOLO
import cv2
import numpy as np

class ModernProductCounter:
    def __init__(self, model_name='yolov8n.pt'):
        print(f"Loading {model_name}...")
        self.model = YOLO(model_name)
        
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
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = self.model.names[class_id]
                
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
            
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            label = f"{i+1}. {class_name} {confidence:.2f}"
            (label_w, label_h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x1, y1 - label_h - 10), (x1 + label_w, y1), (0, 255, 0), -1)
            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        return frame
    
    def connect_ip_camera(self, ip_config):
        """Connect to IP camera with configuration"""
        cap = cv2.VideoCapture(ip_config['url'])
        
        # Set camera properties
        if 'fps' in ip_config:
            cap.set(cv2.CAP_PROP_FPS, ip_config['fps'])
        if 'width' in ip_config and 'height' in ip_config:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, ip_config['width'])
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, ip_config['height'])
        
        return cap
    
    def run_with_ip_camera(self, ip_config):
        """Run with IP camera configuration"""
        print(f"Connecting to IP camera: {ip_config['url']}")
        cap = self.connect_ip_camera(ip_config)
        
        if not cap.isOpened():
            print(f"Error: Cannot connect to IP camera")
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
                    print("Failed to read frame from IP camera")
                    break
                
                frame_count += 1
                products = self.count_products(frame)
                frame = self.draw_detections(frame, products)
                
                # Draw info panel
                info_text = [
                    f"Products: {len(products)}",
                    f"Frame: {frame_count}",
                    f"IP Cam: {ip_config.get('name', 'Unknown')}"
                ]
                
                y_offset = 30
                for text in info_text:
                    cv2.putText(frame, text, (10, y_offset),
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    y_offset += 30
            
            cv2.imshow('Product Counter - IP Camera', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('p'):
                paused = not paused
            elif key == ord('s'):
                filename = f"ip_camera_screenshot_{frame_count}.jpg"
                cv2.imwrite(filename, frame)
                print(f"Saved: {filename}")
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    counter = ModernProductCounter(model_name='yolov8n.pt')
    
    # Common IP camera configurations
    ip_configs = [
        {
            'name': 'Generic RTSP Camera',
            'url': 'rtsp://admin:admin@192.168.1.100:554/stream1',
            'width': 1920,
            'height': 1080,
            'fps': 30
        },
        {
            'name': 'HTTP Camera',
            'url': 'http://192.168.1.100:8080/video',
            'width': 1280,
            'height': 720
        }
    ]
    
    # Try each configuration
    for config in ip_configs:
        print(f"Trying: {config['name']}")
        counter.run_with_ip_camera(config)