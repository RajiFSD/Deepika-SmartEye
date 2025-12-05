import cv2
import requests
import time
import json
import signal
import sys
import websocket
import numpy as np

from PeopleCounter import PeopleCounter

running = True

def stop_handler(signum, frame):
    global running
    running = False

signal.signal(signal.SIGINT, stop_handler)
signal.signal(signal.SIGTERM, stop_handler)

def get_frame(frame_url):
    try:
        r = requests.get(frame_url, timeout=1)
        if r.status_code != 200:
            return None
        jpg = np.frombuffer(r.content, np.uint8)
        frame = cv2.imdecode(jpg, cv2.IMREAD_COLOR)
        return frame
    except:
        return None

def main():
    if len(sys.argv) < 4:
        print("Usage: python people_count_ws.py <frame_url> <ws_url> <direction>")
        return

    frame_url = sys.argv[1]
    ws_url = sys.argv[2]
    direction = sys.argv[3]

    ws = websocket.WebSocket()
    ws.connect(ws_url)

    counter = PeopleCounter(direction_mode=direction)

    global running
    while running:
        frame = get_frame(frame_url)
        if frame is None:
            continue

        counter.process(frame)

        data = {
            "inside": counter.inside,
            "entered_male": counter.entered_male,
            "entered_female": counter.entered_female,
            "exited_male": counter.exited_male,
            "exited_female": counter.exited_female,
            "objects": counter.get_live_objects(),
            "timestamp": time.time()
        }

        ws.send(json.dumps(data))

        time.sleep(0.05)  # 20 FPS max

    ws.close()

if __name__ == "__main__":
    main()