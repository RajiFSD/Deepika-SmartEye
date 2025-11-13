ProductionProductCounterimport cv2
import numpy as np
import json
import datetime
from pathlib import Path

class ProductionProductCounter:
    def __init__(self, config_file='config.json'):
        self.load_config(config_file)
        self.setup_logging()
        
    def load_config(self, config_file):
        """Load configuration from JSON file"""
        default_config = {
            "min_area": 1000,
            "max_area": 50000,
            "threshold": 127,
            "blur_kernel": 5,
            "video_source": 0,
            "save_results": True,
            "output_dir": "results"
        }
        
        if Path(config_file).exists():
            with open(config_file, 'r') as f:
                self.config = json.load(f)
        else:
            self.config = default_config
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
    
    def setup_logging(self):
        """Setup result logging"""
        self.results = []
        Path(self.config['output_dir']).mkdir(exist_ok=True)
    
    def log_count(self, count, timestamp):
        """Log counting results"""
        result = {
            'timestamp': timestamp.isoformat(),
            'count': count
        }
        self.results.append(result)
        
        if self.config['save_results']:
            with open(f"{self.config['output_dir']}/counts.json", 'w') as f:
                json.dump(self.results, f, indent=2)
    
    def process_frame(self, frame):
        """Process single frame and return count"""
        # Convert to grayscale
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # Apply blur
        blurred = cv2.GaussianBlur(gray, 
                                  (self.config['blur_kernel'], self.config['blur_kernel']), 0)
        
        # Threshold
        _, thresh = cv2.threshold(blurred, self.config['threshold'], 255, cv2.THRESH_BINARY)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter by area
        valid_contours = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if self.config['min_area'] < area < self.config['max_area']:
                valid_contours.append(contour)
        
        return valid_contours, thresh
    
    def run_counting(self):
        """Main counting loop"""
        cap = cv2.VideoCapture(self.config['video_source'])
        
        print("Press 'q' to quit, 's' to save current count, 'r' to reset")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process frame
            contours, thresh = self.process_frame(frame)
            count = len(contours)
            
            # Draw results
            for i, contour in enumerate(contours):
                x, y, w, h = cv2.boundingRect(contour)
                cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)
                cv2.putText(frame, f'{i+1}', (x + w//2, y + h//2), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 0), 2)
            
            # Display info
            cv2.putText(frame, f'Count: {count}', (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            cv2.putText(frame, f'Time: {datetime.datetime.now().strftime("%H:%M:%S")}', 
                       (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            cv2.imshow('Product Counter', frame)
            cv2.imshow('Processed', thresh)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('s'):
                self.log_count(count, datetime.datetime.now())
                print(f"Saved count: {count}")
            elif key == ord('r'):
                self.results.clear()
                print("Results reset")
        
        cap.release()
        cv2.destroyAllWindows()
        
        return self.results

# Usage
if __name__ == "__main__":
    counter = ProductionProductCounter()
    results = counter.run_counting()
    print(f"Final results: {len(results)} measurements saved")