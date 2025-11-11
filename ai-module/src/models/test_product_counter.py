"""
Test script for Product Counter
Verifies installation and basic functionality
"""
import sys
import os

def test_imports():
    """Test if all required packages are installed"""
    print("Testing imports...")
    
    try:
        import cv2
        print(f"✓ OpenCV version: {cv2.__version__}")
    except ImportError as e:
        print(f"✗ OpenCV not installed: {e}")
        return False
    
    try:
        from ultralytics import YOLO
        print("✓ Ultralytics YOLO installed")
    except ImportError as e:
        print(f"✗ Ultralytics not installed: {e}")
        return False
    
    try:
        import numpy as np
        print(f"✓ NumPy version: {np.__version__}")
    except ImportError as e:
        print(f"✗ NumPy not installed: {e}")
        return False
    
    try:
        import torch
        print(f"✓ PyTorch version: {torch.__version__}")
        print(f"  CUDA available: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"  CUDA version: {torch.version.cuda}")
    except ImportError as e:
        print(f"✗ PyTorch not installed: {e}")
        return False
    
    return True

def test_yolo_model():
    """Test YOLO model loading"""
    print("\nTesting YOLO model...")
    
    try:
        from ultralytics import YOLO
        
        model = YOLO('yolov8n.pt')
        print("✓ YOLOv8n model loaded successfully")
        print(f"  Model names: {list(model.names.values())[:10]}...")
        return True
    except Exception as e:
        print(f"✗ Failed to load YOLO model: {e}")
        print("  Model will be auto-downloaded on first run")
        return False

def test_product_counter():
    """Test ProductCounter class"""
    print("\nTesting ProductCounter class...")
    
    try:
        # Add parent directory to path
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from product_counter import ProductCounter
        
        counter = ProductCounter()
        print("✓ ProductCounter initialized")
        print(f"  Confidence threshold: {counter.confidence_threshold}")
        print(f"  Product classes: {len(counter.product_classes)} classes")
        print(f"  Sample classes: {list(counter.product_classes.values())[:5]}")
        
        return True
    except Exception as e:
        print(f"✗ Failed to initialize ProductCounter: {e}")
        return False

def test_camera():
    """Test camera access"""
    print("\nTesting camera access...")
    
    try:
        import cv2
        
        cap = cv2.VideoCapture(0)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                print("✓ Camera accessible")
                print(f"  Resolution: {frame.shape[1]}x{frame.shape[0]}")
                cap.release()
                return True
            else:
                print("✗ Cannot read from camera")
        else:
            print("✗ Cannot open camera (this is OK if no camera connected)")
        
        cap.release()
        return False
    except Exception as e:
        print(f"✗ Camera test failed: {e}")
        return False

def create_test_image():
    """Create a simple test image"""
    print("\nCreating test image...")
    
    try:
        import cv2
        import numpy as np
        
        # Create test image with some shapes
        img = np.ones((480, 640, 3), dtype=np.uint8) * 255
        
        # Draw some rectangles (simulating products)
        cv2.rectangle(img, (100, 100), (200, 200), (255, 0, 0), -1)
        cv2.rectangle(img, (300, 150), (400, 250), (0, 255, 0), -1)
        cv2.rectangle(img, (450, 200), (550, 300), (0, 0, 255), -1)
        
        cv2.imwrite('test_image.jpg', img)
        print("✓ Test image created: test_image.jpg")
        return True
    except Exception as e:
        print(f"✗ Failed to create test image: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("Product Counter - Installation Test")
    print("=" * 60)
    
    results = {
        'imports': test_imports(),
        'yolo_model': test_yolo_model(),
        'product_counter': test_product_counter(),
        'camera': test_camera(),
        'test_image': create_test_image()
    }
    
    print("\n" + "=" * 60)
    print("Test Summary:")
    print("=" * 60)
    
    for test_name, passed in results.items():
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{test_name:20s}: {status}")
    
    all_critical_passed = all([
        results['imports'],
        results['product_counter']
    ])
    
    print("\n" + "=" * 60)
    if all_critical_passed:
        print("✓ All critical tests passed!")
        print("\nYou can now run:")
        print("  python product_counter.py video <video_file> --output result.mp4")
        print("  python product_counter.py image test_image.jpg --output result.jpg")
    else:
        print("✗ Some critical tests failed.")
        print("\nPlease install missing dependencies:")
        print("  pip install -r requirements.txt")
    print("=" * 60)

if __name__ == '__main__':
    main()