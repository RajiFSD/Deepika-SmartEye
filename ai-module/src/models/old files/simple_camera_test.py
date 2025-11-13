# simple_camera_test.py
import cv2

def test_common_cameras():
    """Test common IP camera URLs"""
    
    # Common IP camera URLs (replace with your camera's IP)
    common_urls = [
        # RTSP URLs
        'rtsp://admin:admin@192.168.1.100:554/stream1',
        'rtsp://admin:123456@192.168.1.100:554/stream1',
        'rtsp://192.168.1.100:554/live',
        
        # HTTP URLs
        'http://192.168.1.100:8080/video',
        'http://192.168.1.100:4747/video',
        
        # Local cameras
        0, 1, 2  # USB webcams
    ]
    
    working_cameras = []
    
    for source in common_urls:
        print(f"Testing: {source}")
        try:
            cap = cv2.VideoCapture(source)
            
            if cap.isOpened():
                # Try to read a frame
                ret, frame = cap.read()
                
                if ret and frame is not None:
                    print(f"✓ WORKING: {source}")
                    print(f"  Frame size: {frame.shape}")
                    working_cameras.append(source)
                    
                    # Show preview
                    cv2.imshow(f'Camera: {source}', frame)
                    cv2.waitKey(1000)  # Show for 1 second
                    cv2.destroyAllWindows()
                else:
                    print(f"✗ No frame: {source}")
                
                cap.release()
            else:
                print(f"✗ Cannot open: {source}")
                
        except Exception as e:
            print(f"✗ Error with {source}: {e}")
    
    return working_cameras

if __name__ == "__main__":
    print("Testing common camera sources...")
    working = test_common_cameras()
    
    print(f"\nFound {len(working)} working cameras:")
    for cam in working:
        print(f"  - {cam}")