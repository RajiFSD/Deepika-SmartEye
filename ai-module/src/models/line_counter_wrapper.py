import argparse, json, time, os, sys
from line_counter import run_counter

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--line-type", type=str, default="horizontal", choices=["horizontal", "vertical"])
    parser.add_argument("--line-pos", type=int, default=300)
    parser.add_argument("--class-id", type=int, default=-1)
    parser.add_argument("--mode", type=str, default="object")
    parser.add_argument("--process-fps", type=float, default=None)
    parser.add_argument("--conf", type=float, default=0.3)
    args = parser.parse_args()

    # Log to stderr
    print(f"🎯 Line Counter Configuration:", file=sys.stderr)
    print(f"   Type: {args.line_type}", file=sys.stderr)
    print(f"   Position: {args.line_pos}", file=sys.stderr)
    print(f"   Mode: {args.mode}", file=sys.stderr)
    print(f"   Class ID: {args.class_id}", file=sys.stderr)
    print(f"   Confidence: {args.conf}", file=sys.stderr)

    start = time.time()

    # Redirect stdout to stderr temporarily
    original_stdout = sys.stdout
    sys.stdout = sys.stderr

    try:
        total = run_counter(
            source=args.source,
            mode=args.mode,
            model_name="yolov8n.pt",
            class_id=args.class_id,
            conf_thresh=args.conf,
            output_path=args.output,
            show_window=False,
            process_fps=args.process_fps,
            line_type=args.line_type,
            line_position=args.line_pos
        )
    finally:
        sys.stdout = original_stdout

    result = {
        "success": True,
        "total_counted": int(total) if total else 0,
        "processing_time": time.time() - start,
        "frames_processed": 0,
        "images_captured": 0,
        "outputVideoPath": os.path.abspath(args.output),
        "line_type": args.line_type,
        "line_position": args.line_pos
    }

    # Print ONLY JSON to stdout
    print(json.dumps(result))

if __name__ == "__main__":
    main()