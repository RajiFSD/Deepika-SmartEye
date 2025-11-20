import cv2

print("Testing IP camera...")
print("Press 'q' to quit")

# Connect to IP camera stream
stream_url = "http://192.168.31.89:8080/video"
cap = cv2.VideoCapture(stream_url)

print(f"Connecting to {stream_url}...")

if not cap.isOpened():
    print("Error: Could not connect to IP camera!")
    print("Make sure:")
    print("1. Your phone/camera app is running")
    print("2. You're on the same WiFi network")
    print(f"3. {stream_url} is accessible in browser")
    exit()

print("IP Camera connected successfully!")

while True:
    ret, frame = cap.read()
    
    if not ret:
        print("Error: Can't receive frame")
        break
    
    # Add text
    cv2.putText(frame, "Camera Working! Press 'q' to quit", 
                (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 
                0.7, (0, 255, 0), 2)
    
    # Display
    cv2.imshow('Camera Test', frame)
    
    # Quit on 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Test complete!")