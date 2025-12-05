# ai-module/src/models/object_counter.py
import argparse
import json
import os
from line_counter import run_counter  # import your existing function
import time

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, help="Input video path")
    parser.add_argument("--output", required=False, help="Output annotated video path")
    parser.add_argument("--line-y", type=int, default=300, help="Counting line Y position")
    parser.add_argument("--mode", type=str, default="object", choices=["object", "person"])
    parser.add_argument("--class-id", type=int, default=-1, help="YOLO class id (-1 = all)")
    parser.add_argument("--process-fps", type=float, default=None)
    args = parser.parse_args()

    # call your existing counter; it returns total_count
    start = time.time()
    total_count = run_counter(
        source=args.source,
        mode=args.mode,
        model_name="yolov8n.pt",
        conf_thresh=0.3,
        class_id=args.class_id,
        output_path=args.output,
        process_fps=args.process_fps,
        show_window=False,
        line_y=args.line_y,
    )
    elapsed = time.time() - start

    # minimal JSON for Node
    result = {
        "success": True,
        "totalCount": int(total_count),
        "processingTime": elapsed,
        "outputVideoPath": os.path.abspath(args.output) if args.output else None,
    }

    print(json.dumps(result))

if __name__ == "__main__":
    main()
