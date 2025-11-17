/**
 * Enhanced Camera API Routes with Streaming Support
 * Fixed: Database query syntax and connection handling
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
      
      // FIX: Use proper where clause with object
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
      console.log(`🔌 Camera is_active: ${cameraData.is_active}`);
      
      if (!cameraData.is_active) {
        console.error(`❌ Camera is not active: ${camera_id}`);
        return res.status(400).json({
          success: false,
          message: 'Camera is not active'
        });
      }

      // Use stream_url from database if available, otherwise build it
      streamUrl = cameraData.stream_url || buildStreamUrl(cameraData);
      
      console.log(`🎥 Final stream URL: ${streamUrl}`);
      
      if (!streamUrl) {
        console.error(`❌ No valid stream URL for camera: ${camera_id}`);
        return res.status(400).json({
          success: false,
          message: 'Camera has no valid stream URL. Please set stream_url or ip_address in camera settings.'
        });
      }

      streamId = `camera_${camera_id}`;
      console.log(`🆔 Stream ID: ${streamId}`);
    } else {
      // Start stream with manual config
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
    const resolution = cameraData?.resolution || manualConfig.resolution || '1280x720';

    console.log(`⚙️ Stream settings: fps=${processingFps}, resolution=${resolution}`);

    const result = await cameraConnectionService.startStream(streamId, streamUrl, {
      fps: processingFps,
      resolution: resolution,
      onFrame: (frameData, camId) => {
        // Store frame for HTTP streaming
        global.cameraFrames = global.cameraFrames || new Map();
        global.cameraFrames.set(camId, frameData);
        
        // Log first frame
        if (!global.firstFrameLogged) {
          console.log(`🎞️ First frame received for ${camId}, size: ${frameData.length} bytes`);
          global.firstFrameLogged = true;
        }
        
        // Update last connected time periodically
        if (cameraData && Math.random() < 0.01) { // 1% of frames
          cameraData.update({ 
            connection_status: 'connected',
            last_connected_at: new Date()
          }).catch(console.error);
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
      // Update camera status to connected
      if (cameraData) {
        await cameraData.update({ 
          connection_status: 'connected',
          last_connected_at: new Date()
        });
        console.log(`✅ Camera status updated to connected`);
      }

      res.json({
        success: true,
        message: 'Stream started successfully',
        streamUrl: `/camera/video/${streamId}`,
        streamId: streamId,
        snapshotUrl: `/camera/snapshot/${streamId}`,
        cameraStreamUrl: streamUrl,
        streamType: result.streamType,
        camera: cameraData ? {
          camera_id: cameraData.camera_id,
          camera_name: cameraData.camera_name,
          camera_code: cameraData.camera_code,
          resolution: cameraData.resolution,
          fps: cameraData.processing_fps
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
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: error.message || 'Error starting stream'
    });
  }
});

/**
 * GET /api/camera/video/:streamId
 * Get video stream feed (MJPEG)
 */
router.get('/video/:streamId', (req, res) => {
  const { streamId } = req.params;

  console.log(`📹 Client requesting video stream: ${streamId}`);

  if (!cameraConnectionService.isStreaming(streamId)) {
    console.error(`❌ Stream not found or not active: ${streamId}`);
    return res.status(404).json({
      success: false,
      message: 'Stream not found or not active. Please start the stream first.'
    });
  }

  const streamInfo = cameraConnectionService.getStreamInfo(streamId);
  console.log(`✅ Stream info:`, streamInfo);

  // Set headers for MJPEG stream
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*'
  });

  // Initialize frame storage
  global.cameraFrames = global.cameraFrames || new Map();

  let frameCount = 0;

  // Send frames to client
  const intervalId = setInterval(() => {
    const frameData = global.cameraFrames.get(streamId);
    
    if (frameData && frameData.length > 0) {
      try {
        res.write('--frame\r\n');
        res.write('Content-Type: image/jpeg\r\n');
        res.write(`Content-Length: ${frameData.length}\r\n\r\n`);
        res.write(frameData);
        res.write('\r\n');
        
        frameCount++;
        if (frameCount % 30 === 0) {
          console.log(`📊 Sent ${frameCount} frames to client for ${streamId}`);
        }
      } catch (error) {
        console.error('❌ Error writing frame:', error);
        clearInterval(intervalId);
        res.end();
      }
    } else {
      // No frame available yet
      if (frameCount === 0) {
        console.log(`⏳ Waiting for first frame for ${streamId}...`);
      }
    }
  }, 100); // 10 FPS for viewing

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    console.log(`🔌 Client disconnected from stream: ${streamId} (sent ${frameCount} frames)`);
  });

  req.on('error', (error) => {
    clearInterval(intervalId);
    console.error(`❌ Client connection error for ${streamId}:`, error);
  });
});

/**
 * POST /api/camera/stop/:streamId
 * Stop camera stream
 */
router.post('/stop/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    const result = cameraConnectionService.stopStream(streamId);
    
    // Clean up frame data
    if (global.cameraFrames) {
      global.cameraFrames.delete(streamId);
    }
    
    // Update camera status if it's a DB camera
    if (streamId.startsWith('camera_')) {
      const cameraId = streamId.replace('camera_', '');
      const camera = await Camera.findOne({
        where: { camera_id: cameraId }  // Fixed: proper object syntax
      });
      if (camera) {
        await camera.update({ connection_status: 'disconnected' });
      }
    }
    
    res.json(result);

  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error stopping stream'
    });
  }
});

/**
 * GET /api/camera/snapshot/:streamId
 * Get a single frame snapshot
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
    
    // Get camera details for active streams
    const streamDetails = await Promise.all(
      activeStreams.map(async (streamId) => {
        if (streamId.startsWith('camera_')) {
          const cameraId = streamId.replace('camera_', '');
          const camera = await Camera.findOne({
            where: { camera_id: cameraId },  // Fixed: proper object syntax
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

/**
 * GET /api/test-ffmpeg
 * Test FFmpeg availability
 */
router.get('/test-ffmpeg', (req, res) => {
  const { spawn } = require('child_process');
  const ffmpeg = spawn('ffmpeg', ['-version']);
  
  let output = '';
  ffmpeg.stdout.on('data', (data) => {
    output += data.toString();
  });
  
  ffmpeg.on('close', (code) => {
    if (code === 0) {
      res.json({ 
        success: true, 
        message: 'FFmpeg is available',
        version: output.split('\n')[0]
      });
    } else {
      res.json({ 
        success: false, 
        message: 'FFmpeg check failed'
      });
    }
  });
  
  ffmpeg.on('error', (error) => {
    res.status(500).json({ 
      success: false, 
      message: 'FFmpeg not found: ' + error.message 
    });
  });
});

module.exports = router;