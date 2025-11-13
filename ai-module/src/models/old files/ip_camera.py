# find_ip_camera.py
import cv2

def test_camera_sources():
    """Test different camera sources"""
    
    # Common IP camera URLs to try
    test_sources = [
        # RTSP formats (most common)
        'rtsp://admin:admin@192.168.1.100:554/stream1',
        'rtsp://admin:123456@192.168.1.100:554/cam/realmonitor?channel=1&subtype=0',
        'rtsp://192.168.1.100:554/user=admin_password=admin_channel=1_stream=0.sdp',
        
        # HTTP streams
        'http://192.168.1.100:80/video',
        'http://192.168.1.100:8080/video',
        'http://192.168.1.100:4747/video',
        
        # Local camera indices
        0, 1, 2, 3
    ]
    
    for source in test_sources:
        print(f"Testing: {source}")
        cap = cv2.VideoCapture(source)
        
        if cap.isOpened():
            ret, frame = cap.read()
            if ret and frame is not None:
                print(f"✓ SUCCESS: {source}")
                print(f"  Frame size: {frame.shape}")
                cap.release()
                return source
            cap.release()
        print(f"✗ FAILED: {source}")
    
    return None

# Run discovery
working_source = test_camera_sources()
if working_source:
    print(f"\nUse this source: {working_source}")
else:
    print("No working camera source found!")