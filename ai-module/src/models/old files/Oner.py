"""
Simple Product Counter using OpenCV
No machine learning required - works with color/shape detection
"""
import cv2
import numpy as np
from datetime import datetime

class SimpleProductCounter:
    def __init__(self):
        self.count_history = []
        
    def detect_products_by_color(self, frame, color_lower, color_upper):
        """Detect products by color range (HSV)"""
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, color_lower, color_upper)
        
        # Clean up mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter by area
        valid_products = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if 500 < area < 50000:  # Adjust based on your product size
                valid_products.append(contour)
        
        return valid_products, mask
    
    def detect_products_by_edges(self, frame):
        """Detect products using edge detection"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        # Dilate edges to close gaps
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        dilated = cv2.dilate(edges, kernel, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter by area and aspect ratio
        valid_products = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area > 1000:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h
                if 0.2 < aspect_ratio < 5:  # Filter out weird shapes
                    valid_products.append(contour)
        
        return valid_products, edges
    
    def run(self, video_source=0, method='color'):
        """
        Run product counter
        method: 'color' or 'edges'
        """
        cap = cv2.VideoCapture(video_source)
        
        # Color detection settings (adjust for your products)
        # Example: Blue products
        color_lower = np.array([100, 50, 50])   # Lower HSV
        color_upper = np.array([130, 255, 255]) # Upper HSV
        
        print("Controls:")
        print("  'q' - Quit")
        print("  's' - Save count")
        print("  'c' - Toggle color/edge detection")
        print("  '+' - Increase threshold")
        print("  '-' - Decrease threshold")
        
        current_method = method
        threshold_adjust = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                print("Cannot read from camera/video")
                break
            
            # Detect based on method
            if current_method == 'color':
                # Adjust color range dynamically
                lower = color_lower + threshold_adjust
                upper = color_upper + threshold_adjust
                products, debug_img = self.detect_products_by_color(frame, lower, upper)
            else:
                products, debug_img = self.detect_products_by_edges(frame)
            
            count = len(products)
            
            # Draw bounding boxes and numbers
            for i, contour in enumerate(products):
                x, y, w, h = cv2.boundingRect(contour)
                
                # Draw rectangle
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                
                # Add number
                center_x = x + w // 2
                center_y = y + h // 2
                cv2.circle(frame, (center_x, center_y), 20, (0, 255, 0), -1)
                cv2.putText(frame, str(i + 1), (center_x - 10, center_y + 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
            
            # Display info
            info_bg = frame.copy()
            cv2.rectangle(info_bg, (0, 0), (300, 120), (0, 0, 0), -1)
            cv2.addWeighted(info_bg, 0.5, frame, 0.5, 0, frame)
            
            cv2.putText(frame, f'Count: {count}', (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            cv2.putText(frame, f'Method: {current_method}', (10, 60),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(frame, f'Time: {datetime.now().strftime("%H:%M:%S")}', (10, 90),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(frame, f'Threshold: {threshold_adjust}', (10, 115),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            
            # Show windows
            cv2.imshow('Product Counter', frame)
            cv2.imshow('Detection Debug', debug_img)
            
            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                break
            elif key == ord('s'):
                self.count_history.append({
                    'count': count,
                    'time': datetime.now().isoformat(),
                    'method': current_method
                })
                print(f"Saved: {count} products at {datetime.now().strftime('%H:%M:%S')}")
            elif key == ord('c'):
                current_method = 'edges' if current_method == 'color' else 'color'
                print(f"Switched to {current_method} detection")
            elif key == ord('+') or key == ord('='):
                threshold_adjust += 5
                print(f"Threshold: {threshold_adjust}")
            elif key == ord('-') or key == ord('_'):
                threshold_adjust -= 5
                print(f"Threshold: {threshold_adjust}")
        
        cap.release()
        cv2.destroyAllWindows()
        
        # Print summary
        print("\n=== Counting Summary ===")
        for i, record in enumerate(self.count_history, 1):
            print(f"{i}. Count: {record['count']}, Time: {record['time']}")
        
        return self.count_history

# Usage Examples
if __name__ == "__main__":
    counter = SimpleProductCounter()
    
    # Use webcam (0) or video file path
    counter.run(video_source=0, method='edges')
    
    # For specific colored products (e.g., bottles):
    # counter.run(video_source='products.mp4', method='color')