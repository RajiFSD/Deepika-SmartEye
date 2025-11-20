#!/usr/bin/env python3
import os
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Import the original module but patch the gender model issue
from detection_service_new import DetectionService, process_video_and_save
import argparse

# Patch the DetectionService to disable OpenCV gender model
original_init = DetectionService.__init__

def patched_init(self, models_dir=None):
    original_init(self, models_dir)
    
    # Force disable OpenCV gender model due to compatibility issues
    self.gender_net = None
    print("🔧 PATCHED: OpenCV gender model disabled, using DeepFace only")
    
DetectionService.__init__ = patched_init

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", "-i", required=True)
    parser.add_argument("--output", "-o", required=True) 
    parser.add_argument("--min-frames", "-m", type=int, default=3)
    parser.add_argument("--process-fps", "-r", type=int, default=6)
    parser.add_argument("--max-dim", type=int, default=1280)
    args = parser.parse_args()
    
    print("🚀 Running with DeepFace-only gender detection...")
    result = process_video_and_save(args.input, args.output, 
                                  min_frames_for_counting=args.min_frames,
                                  process_fps=args.process_fps, 
                                  max_dim=args.max_dim)
    print("Final result:", result)