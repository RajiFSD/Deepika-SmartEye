import cv2
import numpy as np

class SmokeDetector:
    def __init__(self):
        # Store previous frames for motion detection
        self.prev_frames = []
        self.max_frames = 5
        
        # Adjustable parameters
        self.min_area = 2000  # Minimum area to consider
        self.motion_threshold = 30  # Motion sensitivity
        self.smoke_confidence_threshold = 0.6  # How sure we need to be
        
    def detect_smoke(self, frame):
        """
        Improved smoke detection using color, motion, and texture
        """
        # Convert to different color spaces
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        # 1. COLOR DETECTION - More restrictive range
        # Smoke is grayish-white with low saturation
        lower_smoke = np.array([0, 0, 180])  # High brightness
        upper_smoke = np.array([180, 40, 255])  # Very low saturation
        
        color_mask = cv2.inRange(hsv, lower_smoke, upper_smoke)
        
        # 2. MOTION DETECTION
        motion_mask = np.zeros_like(gray)
        
        if len(self.prev_frames) >= 2:
            # Compare with previous frames
            frame_diff = cv2.absdiff(self.prev_frames[-1], gray)
            _, motion_mask = cv2.threshold(frame_diff, self.motion_threshold, 255, cv2.THRESH_BINARY)
            
            # Smoke moves and changes shape
            motion_mask = cv2.dilate(motion_mask, np.ones((5, 5), np.uint8), iterations=2)
        
        # 3. COMBINE COLOR AND MOTION
        # Smoke must be both the right color AND moving
        combined_mask = cv2.bitwise_and(color_mask, motion_mask)
        
        # Clean up noise
        kernel = np.ones((7, 7), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        
        # Store current frame for next iteration
        self.prev_frames.append(gray)
        if len(self.prev_frames) > self.max_frames:
            self.prev_frames.pop(0)
        
        # Find contours
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Analyze contours
        smoke_detected = False
        confidence = 0.0
        detection_boxes = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > self.min_area:
                # Get contour properties
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = float(w) / h if h > 0 else 0
                
                # Smoke characteristics:
                # - Irregular shape (not too rectangular)
                # - Moderate aspect ratio (not a thin line)
                # - Has some density
                
                hull = cv2.convexHull(contour)
                hull_area = cv2.contourArea(hull)
                solidity = float(area) / hull_area if hull_area > 0 else 0
                
                # Calculate confidence based on features
                feature_score = 0
                
                # Irregular shape (smoke is not solid)
                if 0.3 < solidity < 0.8:
                    feature_score += 0.3
                
                # Reasonable aspect ratio
                if 0.5 < aspect_ratio < 2.5:
                    feature_score += 0.3
                
                # Size appropriate
                if 2000 < area < 50000:
                    feature_score += 0.2
                
                # Has motion (already filtered by combined mask)
                feature_score += 0.2
                
                if feature_score > self.smoke_confidence_threshold:
                    smoke_detected = True
                    confidence = max(confidence, feature_score)
                    detection_boxes.append((x, y, w, h, feature_score))
        
        return combined_mask, smoke_detected, confidence, detection_boxes

# Main detection loop
detector = SmokeDetector()
stream_url = "http://192.168.31.89:8080/video"
cap = cv2.VideoCapture(stream_url)

print("Connecting to IP camera...")
print("Adjusting sensitivity...")
print("Wait a few seconds for motion detection to initialize...")
print("\nPress 'q' to quit")
print("Press 's' to increase sensitivity")
print("Press 'd' to decrease sensitivity")

# Check if stream opened successfully
if not cap.isOpened():
    print("Error: Could not connect to IP camera!")
    print(f"Make sure {stream_url} is accessible")
    exit()

frame_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        print("Lost connection to camera")
        break
    
    frame_count += 1
    
    # Detect smoke
    mask, detected, confidence, boxes = detector.detect_smoke(frame)
    
    # Draw detection boxes
    for (x, y, w, h, score) in boxes:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 2)
        cv2.putText(frame, f"Confidence: {score:.0%}", (x, y-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
    
    # Display status
    if detected:
        status = f"SMOKE DETECTED! ({confidence:.0%})"
        color = (0, 0, 255)
    else:
        status = "Monitoring... (No smoke)"
        color = (0, 255, 0)
    
    cv2.putText(frame, status, (10, 30), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    # Show settings
    cv2.putText(frame, f"Min Area: {detector.min_area}", (10, 60), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(frame, f"Motion Threshold: {detector.motion_threshold}", (10, 80), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    # Initialization message
    if frame_count < 10:
        cv2.putText(frame, "Initializing motion detection...", (10, frame.shape[0] - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
    
    # Show frames
    cv2.imshow('Smoke Detection', frame)
    cv2.imshow('Detection Mask', mask)
    
    # Key controls
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('s'):  # Increase sensitivity
        detector.min_area = max(500, detector.min_area - 500)
        detector.smoke_confidence_threshold = max(0.3, detector.smoke_confidence_threshold - 0.1)
        print(f"Sensitivity increased: min_area={detector.min_area}, threshold={detector.smoke_confidence_threshold:.1f}")
    elif key == ord('d'):  # Decrease sensitivity
        detector.min_area = min(10000, detector.min_area + 500)
        detector.smoke_confidence_threshold = min(0.9, detector.smoke_confidence_threshold + 0.1)
        print(f"Sensitivity decreased: min_area={detector.min_area}, threshold={detector.smoke_confidence_threshold:.1f}")

cap.release()
cv2.destroyAllWindows()
print("Detection stopped")