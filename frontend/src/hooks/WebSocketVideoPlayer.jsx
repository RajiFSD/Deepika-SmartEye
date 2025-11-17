// WebSocket-based video player for RTSP streams
// Install: npm install jsmpeg-player

import React, { useEffect, useRef } from 'react';
import JSMpeg from 'jsmpeg-player';

const WebSocketVideoPlayer = ({ cameraId, wsUrl }) => {
  const canvasRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !wsUrl) return;

    // Create JSMpeg player
    playerRef.current = new JSMpeg.Player(wsUrl, {
      canvas: canvasRef.current,
      autoplay: true,
      audio: false,
      loop: true,
      disableGl: false, // Use WebGL for better performance
      preserveDrawingBuffer: false,
      progressive: true,
      throttled: true,
      videoBufferSize: 512 * 1024, // 512 KB
      onVideoDecode: (decoder, time) => {
        // Optional: Handle video decode events
      },
      onError: (error) => {
        console.error('JSMpeg player error:', error);
      }
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [wsUrl, cameraId]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-contain"
      style={{ display: 'block' }}
    />
  );
};

export default WebSocketVideoPlayer;

// Usage in FireDetectionPage:
/*
import WebSocketVideoPlayer from './WebSocketVideoPlayer';

// In your render:
<WebSocketVideoPlayer 
  cameraId={selectedCamera.id}
  wsUrl={`ws://your-server:9999/stream/${selectedCamera.id}`}
/>
*/