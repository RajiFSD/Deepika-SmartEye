import React, { useState, useEffect, useRef } from 'react';
import { Flame, AlertTriangle, Camera } from 'lucide-react';

export default function LiveFireDetectionOverlay({ streamUrl, cameraId, isDetecting }) {
  const [currentAlert, setCurrentAlert] = useState(null);
  const [alertBlink, setAlertBlink] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const videoRef = useRef(null);
  const checkInterval = useRef(null);

  // Poll for alerts every 2 seconds when detecting
  useEffect(() => {
    if (!isDetecting || !cameraId) {
      setCurrentAlert(null);
      return;
    }

    const checkForAlerts = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
        const response = await fetch(
          `${apiUrl}/fire-detection?camera_id=${cameraId}&limit=1`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data.length > 0) {
            const latestAlert = data.data[0];
            
            // Only show if it's a recent unresolved alert (within last 30 seconds)
            const alertTime = new Date(latestAlert.timestamp).getTime();
            const now = Date.now();
            const ageSeconds = (now - alertTime) / 1000;
            
            if (ageSeconds < 30 && latestAlert.status === 'active') {
              setCurrentAlert(latestAlert);
            } else {
              setCurrentAlert(null);
            }
          } else {
            setCurrentAlert(null);
          }
        }
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    };

    // Check immediately
    checkForAlerts();

    // Check every 2 seconds
    checkInterval.current = setInterval(checkForAlerts, 2000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [isDetecting, cameraId]);

  // Blink effect for alert banner
  useEffect(() => {
    if (!currentAlert) return;

    const blinkInterval = setInterval(() => {
      setAlertBlink(prev => !prev);
    }, 500);

    return () => clearInterval(blinkInterval);
  }, [currentAlert]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Stream */}
      {streamUrl ? (
        <img
          ref={videoRef}
          src={streamUrl}
          alt="Live camera stream"
          className="w-full h-full object-contain"
          draggable={false}
          onError={() => {
            console.error('Failed to load stream:', streamUrl);
            setStreamError(true);
          }}
          onLoad={() => {
            setStreamError(false);
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full text-gray-400">
          <div className="text-center">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No stream available</p>
          </div>
        </div>
      )}

      {/* Stream Error Overlay */}
      {streamError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-center text-white">
            <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Failed to load camera stream</p>
            <p className="text-xs text-gray-400 mt-1">Check camera connection</p>
          </div>
        </div>
      )}

      {/* Fire Detection Overlay */}
      {currentAlert && (
        <>
          {/* Red pulsing border */}
          <div 
            className={`absolute inset-0 border-8 border-red-600 pointer-events-none transition-opacity duration-300 ${
              alertBlink ? 'opacity-100' : 'opacity-40'
            }`}
          />

          {/* Top banner - FIRE DETECTED */}
          <div className="absolute top-0 left-0 right-0 bg-red-600 text-white px-6 py-3 flex items-center justify-between shadow-lg z-10">
            <div className="flex items-center gap-3">
              <Flame className={`w-6 h-6 ${alertBlink ? 'animate-pulse' : ''}`} />
              <div>
                <div className="font-bold text-lg">
                  FIRE DETECTED - {Math.round(currentAlert.confidence * 100)}%
                </div>
                <div className="text-sm opacity-90">
                  {new Date(currentAlert.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <AlertTriangle className={`w-8 h-8 ${alertBlink ? 'animate-bounce' : ''}`} />
          </div>

          {/* Detection boxes visualization */}
          {currentAlert.bounding_boxes && currentAlert.bounding_boxes.length > 0 && (
            <>
              {currentAlert.bounding_boxes.map((bbox, idx) => {
                // bbox format: [x, y, width, height]
                // These need to be scaled to the video dimensions
                // For now, we'll show them as percentage positions
                const [x, y, w, h] = bbox;
                
                return (
                  <div
                    key={idx}
                    className="absolute border-4 border-red-500 bg-red-500 bg-opacity-10 pointer-events-none"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${w}px`,
                      height: `${h}px`,
                    }}
                  >
                    <div className="absolute -top-8 left-0 bg-red-600 text-white px-2 py-1 text-xs font-bold rounded whitespace-nowrap">
                      FIRE {Math.round(currentAlert.confidence * 100)}%
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Center warning icon for emphasis */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`bg-red-600 bg-opacity-80 rounded-full p-8 ${alertBlink ? 'scale-110' : 'scale-100'} transition-transform duration-300`}>
              <Flame className="w-16 h-16 text-white" />
            </div>
          </div>
        </>
      )}

      {/* Detection Status Indicator (when no alert) */}
      {isDetecting && !currentAlert && !streamError && (
        <div className="absolute top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg">
          <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
          Monitoring
        </div>
      )}

      {/* Idle state indicator */}
      {!isDetecting && !streamError && streamUrl && (
        <div className="absolute top-4 right-4 bg-gray-600 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-lg opacity-75">
          <span className="inline-block w-2 h-2 bg-white rounded-full" />
          Idle
        </div>
      )}
    </div>
  );
}