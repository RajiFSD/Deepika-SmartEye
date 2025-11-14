import cv2
import numpy as np

class FireDetector:
    def __init__(self):
        # Store previous frames for motion/flicker detection
        self.prev_frames = []
        self.max_frames = 10
        
        # Adjustable parameters
        self.min_area = 1500  # Minimum fire area to detect
        self.flicker_threshold = 25  # Flickering sensitivity
        self.confidence_threshold = 0.5  # Detection confidence needed
        
    def detect_fire(self, frame):
        """
        Detect fire using color, motion, and flickering patterns
        """
        # Convert to different color spaces
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        blur = cv2.GaussianBlur(frame, (21, 21), 0)
        hsv_blur = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)
        
        # 1. FIRE COLOR DETECTION
        # Fire has orange-red-yellow colors
        # HSV ranges for fire colors
        
        # Lower range - Red/Orange
        lower_fire1 = np.array([0, 50, 100])
        upper_fire1 = np.array([35, 255, 255])
        
        # Upper range - Yellow
        lower_fire2 = np.array([35, 50, 100])
        upper_fire2 = np.array([65, 255, 255])
        
        # Create masks for both ranges
        mask1 = cv2.inRange(hsv_blur, lower_fire1, upper_fire1)
        mask2 = cv2.inRange(hsv_blur, lower_fire2, upper_fire2)
        
        # Combine masks
        fire_mask = cv2.bitwise_or(mask1, mask2)
        
        # 2. BRIGHTNESS CHECK
        # Fire is usually bright
        _, bright_mask = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
        fire_mask = cv2.bitwise_and(fire_mask, bright_mask)
        
        # 3. MOTION/FLICKER DETECTION
        motion_mask = np.zeros_like(gray)
        
        if len(self.prev_frames) >= 3:
            # Fire flickers - compare multiple frames
            frame_diff1 = cv2.absdiff(self.prev_frames[-1], gray)
            frame_diff2 = cv2.absdiff(self.prev_frames[-2], gray)
            
            # Combine differences to detect flickering
            combined_diff = cv2.bitwise_or(frame_diff1, frame_diff2)
            _, motion_mask = cv2.threshold(combined_diff, self.flicker_threshold, 255, cv2.THRESH_BINARY)
            
            # Dilate to capture flickering area
            motion_mask = cv2.dilate(motion_mask, np.ones((5, 5), np.uint8), iterations=2)
        
        # 4. COMBINE COLOR AND MOTION
        # Fire must be the right color AND flickering
        combined_mask = cv2.bitwise_and(fire_mask, motion_mask)
        
        # Clean up noise
        kernel = np.ones((5, 5), np.uint8)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
        combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
        
        # Store current frame
        self.prev_frames.append(gray)
        if len(self.prev_frames) > self.max_frames:
            self.prev_frames.pop(0)
        
        # Find contours
        contours, _ = cv2.findContours(combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Analyze contours
        fire_detected = False
        confidence = 0.0
        detection_boxes = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if area > self.min_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Calculate fire characteristics
                aspect_ratio = float(w) / h if h > 0 else 0
                
                # Get region of interest
                roi = frame[y:y+h, x:x+w]
                
                # Calculate average color in BGR
                mean_color = cv2.mean(roi)[:3]
                
                # Fire scoring
                feature_score = 0
                
                # 1. Color check - Fire is red/orange/yellow
                # Red channel should be high, blue should be lower
                if mean_color[2] > mean_color[0]:  # Red > Blue
                    feature_score += 0.3
                
                # 2. Size check
                if 1500 < area < 100000:
                    feature_score += 0.2
                
                # 3. Shape - Fire tends to be taller than wide (flames go up)
                if aspect_ratio < 1.5:
                    feature_score += 0.2
                
                # 4. Motion/flicker (already in combined mask)
                feature_score += 0.3
                
                if feature_score > self.confidence_threshold:
                    fire_detected = True
                    confidence = max(confidence, feature_score)
                    detection_boxes.append((x, y, w, h, feature_score))
        
        return fire_mask, combined_mask, fire_detected, confidence, detection_boxes

# Main detection loop
detector = FireDetector()
stream_url = "http://192.168.31.89:8080/video"
cap = cv2.VideoCapture(stream_url)

print("="*50)
print("FIRE DETECTION SYSTEM")
print("="*50)
print("Connecting to IP camera...")
print("Wait a few seconds for motion detection to initialize...")
print("\nControls:")
print("  'q' - Quit")
print("  's' - Increase sensitivity")
print("  'd' - Decrease sensitivity")
print("="*50)

# Check if stream opened successfully
if not cap.isOpened():
    print("Error: Could not connect to IP camera!")
    print(f"Make sure {stream_url} is accessible")
    exit()

frame_count = 0
alarm_triggered = False

while True:
    ret, frame = cap.read()
    if not ret:
        print("Lost connection to camera")
        break
    
    frame_count += 1
    
    # Detect fire
    fire_mask, combined_mask, detected, confidence, boxes = detector.detect_fire(frame)
    
    # Draw detection boxes
    for (x, y, w, h, score) in boxes:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 0, 255), 3)
        cv2.putText(frame, f"FIRE: {score:.0%}", (x, y-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        # Draw flame icon area
        cv2.circle(frame, (x + w//2, y + h//2), 10, (0, 0, 255), -1)
    
    # Display status
    if detected:
        status = f"!!! FIRE DETECTED !!! ({confidence:.0%})"
        color = (0, 0, 255)
        
        # Visual alarm
        if not alarm_triggered:
            alarm_triggered = True
            print(f"\n{'!'*50}")
            print(f"ALERT: FIRE DETECTED AT FRAME {frame_count}")
            print(f"Confidence: {confidence:.0%}")
            print(f"{'!'*50}\n")
        
        # Flash the border
        if frame_count % 10 < 5:
            cv2.rectangle(frame, (0, 0), (frame.shape[1]-1, frame.shape[0]-1), (0, 0, 255), 10)
    else:
        status = "Monitoring... (No fire detected)"
        color = (0, 255, 0)
        alarm_triggered = False
    
    cv2.putText(frame, status, (10, 40), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
    
    # Show settings
    cv2.putText(frame, f"Min Area: {detector.min_area}", (10, 70), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(frame, f"Flicker: {detector.flicker_threshold}", (10, 90), 
               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    # Initialization message
    if frame_count < 10:
        cv2.putText(frame, "Initializing...", (10, frame.shape[0] - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
    
    # Show frames
    cv2.imshow('Fire Detection', frame)
    cv2.imshow('Fire Color Mask', fire_mask)
    cv2.imshow('Fire + Motion Mask', combined_mask)
    
    # Key controls
    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('s'):  # Increase sensitivity
        detector.min_area = max(500, detector.min_area - 300)
        detector.confidence_threshold = max(0.3, detector.confidence_threshold - 0.1)
        detector.flicker_threshold = max(10, detector.flicker_threshold - 5)
        print(f"Sensitivity increased: area={detector.min_area}, conf={detector.confidence_threshold:.1f}, flicker={detector.flicker_threshold}")
    elif key == ord('d'):  # Decrease sensitivity
        detector.min_area = min(5000, detector.min_area + 300)
        detector.confidence_threshold = min(0.9, detector.confidence_threshold + 0.1)
        detector.flicker_threshold = min(50, detector.flicker_threshold + 5)
        print(f"Sensitivity decreased: area={detector.min_area}, conf={detector.confidence_threshold:.1f}, flicker={detector.flicker_threshold}")

cap.release()
cv2.destroyAllWindows()
print("\nFire detection stopped")