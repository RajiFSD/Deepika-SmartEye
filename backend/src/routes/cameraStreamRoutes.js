/**
 * Enhanced Camera API Routes with Streaming Support
 * FIXED: Proper stream tracking and stop functionality
 */

const express = require('express');
const router = express.Router();
const cameraConnectionService = require('../services/cameraConnectionService');
const { Camera } = require('@models');

/**
 * Build RTSP URL from camera configuration
 */
function buildStreamUrl(camera) {
  const { protocol, username, password, ip_address, port, channel, stream_path } = camera;
  
  if (!ip_address) return null;
  
  if (protocol === 'RTSP' || !protocol) {
    const auth = username && password ? `${username}:${password}@` : '';
    const path = stream_path || `/cam/realmonitor?channel=${channel || 1}&subtype=0`;
    return `rtsp://${auth}${ip_address}:${port || 554}${path}`;
  } else if (protocol === 'HTTP') {
    const auth = username && password ? `${username}:${password}@` : '';
    return `http://${auth}${ip_address}:${port || 80}/video.cgi`;
  } else if (protocol === 'RTMP') {
    return `rtmp://${ip_address}:${port || 1935}/live/stream${channel || 1}`;
  }
  
  return camera.stream_url;
}

/**
 * POST /api/camera/stream
 * Start camera stream
 */
router.post('/stream', async (req, res) => {
  try {
    console.log('🎬 POST /api/camera/stream called');
    console.log('📦 Request body:', req.body);

    const { camera_id, ...manualConfig } = req.body;
    let streamUrl;
    let cameraData;
    let streamId;

    if (camera_id) {
      console.log(`🔍 Looking up camera with ID: ${camera_id}`);
      
      cameraData = await Camera.findOne({
        where: { camera_id: camera_id }
      });
      
      if (!cameraData) {
        console.error(`❌ Camera not found: ${camera_id}`);
        return res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
      }
      
      console.log(`✅ Camera found: ${cameraData.camera_name}`);
      console.log(`📹 Camera stream_url: ${cameraData.stream_url}`);
      
      if (!cameraData.is_active) {
        console.error(`❌ Camera is not active: ${camera_id}`);
        return res.status(400).json({
          success: false,
          message: 'Camera is not active'
        });
      }

      streamUrl = cameraData.stream_url || buildStreamUrl(cameraData);
      
      if (!streamUrl) {
        console.error(`❌ No valid stream URL for camera: ${camera_id}`);
        return res.status(400).json({
          success: false,
          message: 'Camera has no valid stream URL'
        });
      }

      streamId = `camera_${camera_id}`;
    } else {
      console.log('🔧 Using manual configuration');
      if (!manualConfig.ip_address) {
        return res.status(400).json({
          success: false,
          message: 'Camera IP address or camera_id is required'
        });
      }
      streamUrl = buildStreamUrl(manualConfig);
      streamId = `${manualConfig.ip_address}_${manualConfig.port || 554}`;
    }

    // Check if already streaming
    if (cameraConnectionService.isStreaming(streamId)) {
      console.log(`✅ Stream already active: ${streamId}`);
      return res.json({
        success: true,
        message: 'Stream already active',
        streamUrl: `/camera/video/${streamId}`,
        streamId: streamId,
        cameraStreamUrl: streamUrl,
        snapshotUrl: `/camera/snapshot/${streamId}`
      });
    }

    console.log(`🚀 Starting stream service for: ${streamId}`);

    // Update camera status to connecting
    if (cameraData) {
      await cameraData.update({ connection_status: 'connecting' });
      console.log(`📊 Updated camera status to connecting`);
    }

    // Start the stream
    const processingFps = cameraData?.processing_fps || manualConfig.processing_fps || 1;
    const resolution = cameraData?.resolution || manualConfig.resolution || '1920x1080';

    console.log(`⚙️ Stream settings: fps=${processingFps}, resolution=${resolution}`);

    const result = await cameraConnectionService.startStream(streamId, streamUrl, {
      fps: processingFps,
      resolution: resolution,
      onFrame: (frameData, camId) => {
        // Store frame for HTTP streaming
        global.cameraFrames = global.cameraFrames || new Map();
        global.cameraFrames.set(camId, frameData);
        
        // Log first frame
        if (!global[`firstFrame_${camId}`]) {
          console.log(`🎞️ First frame received for ${camId}, size: ${frameData.length} bytes`);
          global[`firstFrame_${camId}`] = true;
        }
      },
      onError: async (error) => {
        console.error(`❌ Stream error for ${streamId}:`, error);
        if (cameraData) {
          await cameraData.update({ 
            connection_status: 'error',
            last_error_message: error.message
          });
        }
      }
    });

    console.log(`📊 Start stream result:`, result);

    if (result.success) {
      if (cameraData) {
        await cameraData.update({ 
          connection_status: 'connected',
          last_connected_at: new Date()
        });
        console.log(`✅ Camera status updated to connected`);
      }

      res.json({
        success: true,
        message: result.streamType === 'http' ? 'HTTP/MJPEG stream started' : 'Stream started successfully',
        streamUrl: `/camera/video/${streamId}`,
        streamId: streamId,
        snapshotUrl: `/camera/snapshot/${streamId}`,
        cameraStreamUrl: streamUrl,
        streamType: result.streamType,
        camera: cameraData ? {
          camera_id: cameraData.camera_id,
          camera_name: cameraData.camera_name,
          camera_code: cameraData.camera_code
        } : null
      });
    } else {
      console.error(`❌ Failed to start stream: ${result.message}`);
      if (cameraData) {
        await cameraData.update({ 
          connection_status: 'error',
          last_error_message: 'Failed to start stream'
        });
      }
      res.status(400).json({
        success: false,
        message: result.message || 'Failed to start stream'
      });
    }

  } catch (error) {
    console.error('❌ Start stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error starting stream'
    });
  }
});

/**
 * GET /api/camera/video/:streamId
 * MJPEG stream endpoint
 */
router.get('/video/:streamId', (req, res) => {
  const { streamId } = req.params;
  console.log(`📹 Client requesting video stream: ${streamId}`);

  if (!cameraConnectionService.isStreaming(streamId)) {
    console.error(`❌ Stream not active: ${streamId}`);
    return res.status(404).json({
      success: false,
      message: 'Stream not active. Start the stream first.'
    });
  }

  console.log(`✅ Stream is active, starting MJPEG response for: ${streamId}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Connection': 'keep-alive'
  });

  let frameCount = 0;

  const intervalId = setInterval(() => {
    let frame = cameraConnectionService.getLatestFrame(streamId);
    
    if (!frame) {
      frame = global.cameraFrames?.get(streamId);
    }

    if (!frame || frame.length === 0) {
      return;
    }

    try {
      res.write('--frame\r\n');
      res.write('Content-Type: image/jpeg\r\n');
      res.write(`Content-Length: ${frame.length}\r\n\r\n`);
      res.write(frame);
      res.write('\r\n');
      
      frameCount++;
      if (frameCount === 1) {
        console.log(`✅ First frame sent to client for ${streamId}`);
      }
    } catch (err) {
      console.error('❌ Error writing frame:', err.message);
      clearInterval(intervalId);
      try { res.end(); } catch (_) {}
    }
  }, 100);

  req.on('close', () => {
    clearInterval(intervalId);
    console.log(`🔌 Client disconnected from stream: ${streamId}`);
  });

  req.on('error', (error) => {
    clearInterval(intervalId);
    console.error(`❌ Client connection error for ${streamId}:`, error.message);
  });
});

/**
 * POST /api/camera/stop/:streamId
 * FIXED: Proper stream stopping
 */
router.post('/stop/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    console.log(`🛑 POST /api/camera/stop/${streamId} called`);
    
    // Check if stream exists
    const isActive = cameraConnectionService.isStreaming(streamId);
    console.log(`🛑 Stream ${streamId} is ${isActive ? 'active' : 'not active'}`);
    
    if (!isActive) {
      // Stream not active, but that's okay - return success
      console.log(`⚠️ Stream ${streamId} not found, but returning success`);
      
      // Clean up global frames anyway
      if (global.cameraFrames) {
        global.cameraFrames.delete(streamId);
      }
      
      // Update camera status if it's a camera stream
      if (streamId.startsWith('camera_')) {
        const cameraId = streamId.replace('camera_', '');
        const camera = await Camera.findByPk(cameraId);
        if (camera) {
          await camera.update({ connection_status: 'disconnected' });
          console.log(`✅ Updated camera ${cameraId} status to disconnected`);
        }
      }
      
      return res.json({
        success: true,
        message: 'Stream already stopped or not found'
      });
    }
    
    // Stream is active, stop it
    const result = cameraConnectionService.stopStream(streamId);
    console.log(`🛑 Stop stream result:`, result);
    
    // Clean up global frames
    if (global.cameraFrames) {
      global.cameraFrames.delete(streamId);
      delete global[`firstFrame_${streamId}`];
    }
    
    // Update camera status
    if (streamId.startsWith('camera_')) {
      const cameraId = streamId.replace('camera_', '');
      const camera = await Camera.findByPk(cameraId);
      if (camera) {
        await camera.update({ connection_status: 'disconnected' });
        console.log(`✅ Updated camera ${cameraId} status to disconnected`);
      }
    }
    
    res.json({
      success: true,
      message: 'Stream stopped successfully',
      streamId
    });

  } catch (error) {
    console.error('❌ Stop stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error stopping stream'
    });
  }
});

/**
 * GET /api/camera/snapshot/:streamId
 */
router.get('/snapshot/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    
    if (!cameraConnectionService.isStreaming(streamId)) {
      return res.status(404).json({
        success: false,
        message: 'Stream not found or not active'
      });
    }

    global.cameraFrames = global.cameraFrames || new Map();
    const frameData = global.cameraFrames.get(streamId);

    if (frameData) {
      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': frameData.length,
        'Cache-Control': 'no-cache'
      });
      res.end(frameData);
    } else {
      res.status(404).json({
        success: false,
        message: 'No frame available'
      });
    }

  } catch (error) {
    console.error('Snapshot error:', error);
    res.status(500).json({
      success: false,
      message: 'Error capturing snapshot'
    });
  }
});

/**
 * GET /api/camera/active
 * Get all active streams
 */
router.get('/active', async (req, res) => {
  try {
    const activeStreams = cameraConnectionService.getActiveStreams();
    
    const streamDetails = await Promise.all(
      activeStreams.map(async (streamId) => {
        if (streamId.startsWith('camera_')) {
          const cameraId = streamId.replace('camera_', '');
          const camera = await Camera.findOne({
            where: { camera_id: cameraId },
            attributes: ['camera_id', 'camera_name', 'camera_code', 'ip_address']
          });
          return {
            streamId,
            camera: camera ? camera.toJSON() : null
          };
        }
        return { streamId, camera: null };
      })
    );

    res.json({
      success: true,
      count: activeStreams.length,
      streams: streamDetails
    });
  } catch (error) {
    console.error('Get active streams error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting active streams'
    });
  }
});

module.exports = router;