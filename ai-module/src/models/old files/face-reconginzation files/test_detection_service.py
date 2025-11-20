"""
test_detection_service.py
Quick diagnostic script to test your detection service
"""

import requests
import json

# Configuration
DETECTION_SERVICE_URL = "http://localhost:5000"
NODE_BACKEND_URL = "http://localhost:3000"

def test_detection_service_direct():
    """Test the Python detection service directly"""
    print("\n" + "="*60)
    print("TEST 1: Direct Detection Service Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{DETECTION_SERVICE_URL}/api/detection/health", timeout=5)
        print(f"✅ Status Code: {response.status_code}")
        print(f"✅ Response: {json.dumps(response.json(), indent=2)}")
        return True
    except requests.exceptions.ConnectionRefusedError:
        print("❌ Connection Refused - Detection service is NOT running")
        print("   → Start it with: python detection_service_yolov8.py")
        return False
    except requests.exceptions.Timeout:
        print("❌ Timeout - Service is not responding")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_node_backend():
    """Test the Node.js backend health"""
    print("\n" + "="*60)
    print("TEST 2: Node.js Backend Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{NODE_BACKEND_URL}/api/upload-analysis/detection/health", timeout=5)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 503:
            print("\n⚠️  Node.js backend cannot reach Python detection service!")
            print("   Possible issues:")
            print("   1. Detection service not running on port 5000")
            print("   2. Firewall blocking localhost:5000")
            print("   3. Wrong DETECTION_SERVICE_URL in your .env")
            return False
        return True
    except requests.exceptions.ConnectionRefusedError:
        print("❌ Node.js backend is NOT running")
        print("   → Start it with: npm start or node server.js")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_capabilities():
    """Test detection capabilities"""
    print("\n" + "="*60)
    print("TEST 3: Detection Capabilities")
    print("="*60)
    
    try:
        response = requests.get(f"{DETECTION_SERVICE_URL}/api/detection/capabilities", timeout=5)
        if response.status_code == 200:
            caps = response.json()
            print(f"✅ Person Detection: {caps.get('person_detection')}")
            print(f"✅ Face Detection: {caps.get('face_detection')}")
            print(f"✅ Gender Detection: {caps.get('gender_detection')}")
            print(f"✅ Supports Age: {caps.get('supports_age')}")
            return True
        else:
            print(f"❌ Failed with status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def check_ports():
    """Check if required ports are available"""
    print("\n" + "="*60)
    print("TEST 4: Port Availability Check")
    print("="*60)
    
    import socket
    
    def is_port_in_use(port):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    # Check port 5000 (Python detection service)
    if is_port_in_use(5000):
        print("✅ Port 5000: IN USE (Detection service running)")
    else:
        print("❌ Port 5000: FREE (Detection service NOT running)")
    
    # Check port 3000 (Node.js backend)
    if is_port_in_use(3000):
        print("✅ Port 3000: IN USE (Node.js backend running)")
    else:
        print("❌ Port 3000: FREE (Node.js backend NOT running)")


def print_summary(results):
    """Print test summary"""
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    all_passed = all(results)
    
    if all_passed:
        print("✅ ALL TESTS PASSED - Your services are working!")
    else:
        print("❌ SOME TESTS FAILED - See issues above")
        print("\n📋 Quick Fix Checklist:")
        if not results[0]:
            print("  1. Start Python detection service: python detection_service_yolov8.py")
        if not results[1]:
            print("  2. Check Node.js backend is running")
            print("  3. Verify DETECTION_SERVICE_URL in .env is: http://localhost:5000")
        print("  4. Check firewall/antivirus blocking ports 3000 or 5000")
        print("  5. Try accessing http://localhost:5000/api/detection/health in browser")


def main():
    print("="*60)
    print("🔍 DETECTION SERVICE DIAGNOSTIC TOOL")
    print("="*60)
    print("This will test your detection service setup...")
    
    results = []
    
    # Run tests
    results.append(test_detection_service_direct())
    results.append(test_node_backend())
    
    # Only run additional tests if basic connection works
    if results[0]:
        results.append(test_capabilities())
    else:
        results.append(False)
    
    check_ports()
    
    # Print summary
    print_summary(results)
    
    print("\n" + "="*60)
    print("💡 Next Steps:")
    print("="*60)
    if all(results):
        print("Everything looks good! Your detection service should work.")
        print("Try uploading a video or starting a camera stream in your app.")
    else:
        print("Fix the issues above, then run this script again to verify.")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()