"""
Camera Stream Connectivity Tester
Test if a camera stream is accessible before starting fire detection
"""

import cv2
import sys
import time
import requests
from urllib.parse import urlparse

def test_http_stream(url):
    """Test if HTTP/MJPEG stream is accessible"""
    print(f"\n[HTTP TEST] Testing HTTP stream: {url}")
    
    try:
        response = requests.get(url, timeout=10, stream=True)
        print(f"  ✓ HTTP Status: {response.status_code}")
        print(f"  ✓ Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        
        if response.status_code == 200:
            print(f"  ✓ HTTP stream is accessible")
            return True
        else:
            print(f"  ✗ HTTP error: {response.status_code}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"  ✗ Timeout: Server did not respond within 10 seconds")
        return False
    except requests.exceptions.ConnectionError:
        print(f"  ✗ Connection Error: Cannot reach the server")
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def test_opencv_stream(url):
    """Test if OpenCV can open and read from the stream"""
    print(f"\n[OPENCV TEST] Testing OpenCV stream capture: {url}")
    
    print(f"  → Opening stream...")
    cap = cv2.VideoCapture(url)
    
    # Set timeouts
    cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 10000)
    cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 10000)
    
    if not cap.isOpened():
        print(f"  ✗ Failed to open stream")
        return False
    
    print(f"  ✓ Stream opened successfully")
    
    # Try to read frames
    print(f"  → Reading test frames...")
    success_count = 0
    
    for i in range(5):
        ret, frame = cap.read()
        if ret and frame is not None:
            success_count += 1
            print(f"  ✓ Frame {i+1}: {frame.shape[1]}x{frame.shape[0]} pixels")
        else:
            print(f"  ✗ Frame {i+1}: Failed to read")
        time.sleep(0.2)
    
    cap.release()
    
    if success_count >= 3:
        print(f"  ✓ Successfully read {success_count}/5 frames")
        return True
    else:
        print(f"  ✗ Only read {success_count}/5 frames")
        return False

def diagnose_camera(stream_url):
    """Run full diagnostics on camera stream"""
    print("="*70)
    print("CAMERA STREAM DIAGNOSTIC TEST")
    print("="*70)
    print(f"\nStream URL: {stream_url}")
    
    parsed = urlparse(stream_url)
    print(f"Protocol: {parsed.scheme}")
    print(f"Host: {parsed.hostname}")
    print(f"Port: {parsed.port or 'default'}")
    print(f"Path: {parsed.path}")
    
    results = {
        'http_test': False,
        'opencv_test': False
    }
    
    # Test 1: HTTP Connectivity (for HTTP streams)
    if parsed.scheme in ['http', 'https']:
        results['http_test'] = test_http_stream(stream_url)
    else:
        print(f"\n[SKIP] HTTP test (not an HTTP stream)")
        results['http_test'] = None
    
    # Test 2: OpenCV Stream Capture
    results['opencv_test'] = test_opencv_stream(stream_url)
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    if results['http_test'] is not None:
        status = "✓ PASS" if results['http_test'] else "✗ FAIL"
        print(f"HTTP Connectivity: {status}")
    
    status = "✓ PASS" if results['opencv_test'] else "✗ FAIL"
    print(f"OpenCV Capture:    {status}")
    
    print("="*70)
    
    if results['opencv_test']:
        print("\n✓ CAMERA IS READY FOR FIRE DETECTION")
        print("  You can now start fire detection with this camera.")
        return 0
    else:
        print("\n✗ CAMERA IS NOT ACCESSIBLE")
        print("\nTroubleshooting steps:")
        print("  1. Verify camera is powered on")
        print("  2. Check camera IP address and port")
        print("  3. Test stream URL in VLC Media Player or web browser")
        print("  4. Check firewall settings")
        print("  5. Ensure camera supports the stream format (MJPEG/RTSP)")
        
        if parsed.scheme == 'rtsp':
            print("\nRTSP Tips:")
            print("  - Try using VLC to test: vlc " + stream_url)
            print("  - Check if camera requires authentication")
            print("  - Try TCP transport: rtsp://...")
        
        return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python test_camera_stream.py <stream_url>")
        print("\nExamples:")
        print("  python test_camera_stream.py http://192.168.1.100:8080/video")
        print("  python test_camera_stream.py rtsp://192.168.1.100:554/stream")
        sys.exit(1)
    
    stream_url = sys.argv[1]
    sys.exit(diagnose_camera(stream_url))