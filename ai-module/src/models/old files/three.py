import cv2
import numpy as np

class BackgroundSubtractionCounter:
    def __init__(self):
        # Create background subtractor
        self.bg_subtractor = cv2.createBackgroundSubtractorMOG2(detectShadows=True)
        
    def count_products_bg_subtraction(self, video_source=0):
        """Count products using background subtraction"""
        cap = cv2.VideoCapture(video_source)
        
        # Let background model stabilize
        for i in range(30):
            ret, frame = cap.read()
            if ret:
                self.bg_subtractor.apply(frame)
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Apply background subtraction
            fg_mask = self.bg_subtractor.apply(frame)
            
            # Remove noise
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_CLOSE, kernel)
            fg_mask = cv2.morphologyEx(fg_mask, cv2.MORPH_OPEN, kernel)
            
            # Find contours
            contours, _ = cv2.findContours(fg_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filter contours by area
            valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
            
            # Draw contours and count
            for i, contour in enumerate(valid_contours):
                x, y, w, h = cv2.boundingRect(contour)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, f'Item {i+1}', (x, y-10), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
            # Display count
            count = len(valid_contours)
            cv2.putText(frame, f'Count: {count}', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            
            cv2.imshow('Original', frame)
            cv2.imshow('Foreground Mask', fg_mask)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

# Usage
bg_counter = BackgroundSubtractionCounter()
bg_counter.count_products_bg_subtraction()