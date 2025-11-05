"""
Camera Streaming Backend API
Handles IP camera connections and video streaming using Flask and OpenCV
"""
from urllib.parse import quote

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
import cv2
import threading
import time

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Store active camera streams
active_streams = {}
stream_lock = threading.Lock()

class CameraStream:
    """Manages individual camera stream"""

    def __init__(self, camera_config):
        self.camera_config = camera_config
        self.stream = None
        self.is_active = False
        self.last_frame = None
        self.lock = threading.Lock()

    def build_rtsp_url(self):
        """Build RTSP URL from camera configuration"""
        ip = self.camera_config.get('ip')
        port = self.camera_config.get('port', '554')
        username = self.camera_config.get('username', 'admin') or ''
        password = self.camera_config.get('password', '') or ''
        u = quote(username, safe='')
        p = quote(password, safe='')
        channel = self.camera_config.get('channel', '1')

        # Format example: Hikvision main stream 101 / sub 102
        # We'll try several common vendor paths
        if username and password:
            rtsp_url = f"rtsp://{u}:{p}@{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0"
        else:
            rtsp_url = f"rtsp://{ip}:{port}/cam/realmonitor?channel={channel}&subtype=0"

        # Alternative formats to try
        self.alt_urls = [
            rtsp_url,
            f"rtsp://{u}:{p}@{ip}:{port}/stream{channel}",
            f"rtsp://{u}:{p}@{ip}:{port}/live/ch{channel}",
            f"rtsp://{u}:{p}@{ip}:{port}/Streaming/Channels/{channel}01",
            f"http://{ip}:{port}/video.cgi?resolution=VGA",
        ]
        return rtsp_url

    def connect(self):
        """Connect to camera stream"""
        _ = self.build_rtsp_url()
        for url in self.alt_urls:
            try:
                print(f"Attempting to connect: {url}")
                self.stream = cv2.VideoCapture(url)
                # Reduce latency
                self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 3)
                ret, frame = self.stream.read()
                if ret and frame is not None:
                    print(f"Successfully connected: {url}")
                    self.is_active = True
                    self.last_frame = frame
                    return True
                else:
                    self.stream.release()
            except Exception as e:
                print(f"Failed to connect with {url}: {str(e)}")
                continue
        print("Failed to connect to camera with all URL formats")
        return False

    def get_frame(self):
        if not self.is_active or self.stream is None:
            return None
        try:
            ret, frame = self.stream.read()
            if ret and frame is not None:
                with self.lock:
                    self.last_frame = frame
                return frame
            # Attempt reconnect; return last frame if available
            print("Frame read failed, attempting to reconnect…")
            self.disconnect()
            self.connect()
            return self.last_frame
        except Exception as e:
            print(f"Error getting frame: {str(e)}")
            return self.last_frame

    def disconnect(self):
        self.is_active = False
        if self.stream is not None:
            self.stream.release()
            self.stream = None
        print("Camera stream disconnected")


def generate_frames(stream_id):
    camera_stream = active_streams.get(stream_id)
    if not camera_stream:
        return
    while camera_stream.is_active:
        frame = camera_stream.get_frame()
        if frame is not None:
            try:
                ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except Exception as e:
                print(f"Error encoding frame: {str(e)}")
                time.sleep(0.1)
        else:
            time.sleep(0.1)


@app.post('/api/camera/test')
def test_camera():
    try:
        camera_config = request.get_json(silent=True) or {}
        if not camera_config.get('ip'):
            return jsonify({'success': False, 'message': 'Missing field: ip'}), 400
        test_stream = CameraStream(camera_config)
        success = test_stream.connect()
        if success:
            test_stream.disconnect()
            return jsonify({'success': True, 'message': 'Camera connection successful'})
        return jsonify({'success': False, 'message': 'Failed to connect to camera. Check IP, credentials, and network.'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.post('/api/camera/stream')
def start_stream():
    try:
        camera_config = request.get_json(silent=True) or {}
        # Fallback to query params if body empty (not recommended, but supported)
        if not camera_config:
            camera_config = {
                'ip': request.args.get('ip'),
                'port': request.args.get('port', '554'),
                'username': request.args.get('username', 'admin'),
                'password': request.args.get('password', ''),
                'protocol': request.args.get('protocol', 'rtsp'),
                'channel': request.args.get('channel', '1'),
            }
        # Validation (clear 400s instead of KeyError)
        required = ['ip', 'port']
        missing = [k for k in required if not camera_config.get(k)]
        if missing:
            return jsonify({'success': False, 'message': f'Missing fields: {", ".join(missing)}'}), 400

        stream_id = f"{camera_config['ip']}_{camera_config['port']}"
        with stream_lock:
            if stream_id in active_streams:
                return jsonify({
                    'success': True,
                    'message': 'Stream already active',
                    'streamUrl': f'/api/camera/video/{stream_id}',
                    'streamId': stream_id,
                })
            camera_stream = CameraStream(camera_config)
            if camera_stream.connect():
                active_streams[stream_id] = camera_stream
                return jsonify({
                    'success': True,
                    'message': 'Stream started successfully',
                    'streamUrl': f'/api/camera/video/{stream_id}',
                    'streamId': stream_id,
                })
            return jsonify({'success': False, 'message': 'Failed to connect to camera'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.get('/api/camera/video/<stream_id>')
def video_feed(stream_id):
    if stream_id not in active_streams:
        return jsonify({'error': 'Stream not found'}), 404
    resp = Response(generate_frames(stream_id), mimetype='multipart/x-mixed-replace; boundary=frame')
    # Helpful for <img src> in browsers behind proxies/CDNs
    resp.headers['Cache-Control'] = 'no-store'
    return resp


@app.post('/api/camera/stop')
@app.post('/api/camera/stop/<stream_id>')
def stop_stream(stream_id=None):
    try:
        if stream_id:
            with stream_lock:
                if stream_id in active_streams:
                    active_streams[stream_id].disconnect()
                    del active_streams[stream_id]
        else:
            with stream_lock:
                for sid, stream in list(active_streams.items()):
                    stream.disconnect()
                active_streams.clear()
        return jsonify({'success': True, 'message': 'Stream stopped'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'}), 500


@app.get('/api/cameras/list')
def list_cameras():
    # Placeholder sample
    cameras = [
        {
            'id': 'cam_001',
            'name': 'Main Entrance',
            'ip': '192.168.1.64',
            'port': '554',
            'username': 'admin',
            'protocol': 'rtsp',
            'channel': '1',
            'location': 'Building A',
        }
    ]
    return jsonify({'success': True, 'cameras': cameras})


@app.get('/api/camera/snapshot/<stream_id>')
def get_snapshot(stream_id):
    if stream_id not in active_streams:
        return jsonify({'error': 'Stream not found'}), 404
    camera_stream = active_streams[stream_id]
    frame = camera_stream.get_frame()
    if frame is not None:
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if ret:
            return Response(buffer.tobytes(), mimetype='image/jpeg')
    return jsonify({'error': 'No frame available'}), 404


@app.get('/api/health')
def health_check():
    return jsonify({'status': 'running', 'active_streams': len(active_streams), 'timestamp': time.time()})


if __name__ == '__main__':
    print("Starting Camera Streaming Server…")
    print("Server running on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)