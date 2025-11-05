/**
 * Enhanced Camera API Routes with Streaming Support
 * Place this in: backend/routes/cameraStreamRoutes.js
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
 * POST /api/camera/test
 * Test camera connection
 */
router.post('/test', async (req, res) => {
  try {
    const { camera_id, ...manualConfig } = req.body;
    let streamUrl;
    let cameraData;

    if (camera_id) {
      // Test existing camera from database
      cameraData = await Camera.findByPk(camera_id);
      if (!cameraData) {
        return res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
      }
      streamUrl = buildStreamUrl(cameraData);
    } else {
      // Test with manual configuration
      if (!manualConfig.ip_address) {
        return res.status(400).json({
          success: false,
          message: 'Camera IP address or camera_id is required'
        });
      }
      streamUrl = buildStreamUrl(manualConfig);
    }

    if (!streamUrl) {
      return res.status(400).json({
        success: false,
        message: 'Invalid camera configuration - cannot build stream URL'
      });
    }

    console.log('🔍 Testing camera connection:', streamUrl.replace(/:[^:@]*@/, ':***@'));
    
    const result = await cameraConnectionService.testConnection(streamUrl, 15000);
    
    // Update camera connection status if it's a DB camera
    if (camera_id && cameraData) {
      await cameraData.updateConnectionStatus('connected');
    }

    res.json({
      success: true,
      message: 'Camera connection successful',
      details: result
    });

  } catch (error) {
    console.error('❌ Camera test error:', error);
    
    // Update camera status to error if it's a DB camera
    if (req.body.camera_id) {
      try {
        const camera = await Camera.findByPk(req.body.camera_id);
        if (camera) {
          await camera.updateConnectionStatus('error', error.message);
        }
      } catch (dbError) {
        console.error('Error updating camera status:', dbError);
      }
    }
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to connect to camera. Check IP, credentials, and network.'
    });
  }
});

/**
 * POST /api/camera/stream
 * Start camera stream
 */
router.post('/stream', async (req, res) => {
  try {
    const { camera_id, ...manualConfig } = req.body;
    let streamUrl;
    let cameraData;
    let streamId;

    if (camera_id) {
      // Start stream from database camera
      cameraData = await Camera.findByPk(camera_id);
      if (!cameraData) {
        return res.status(404).json({
          success: false,
          message: 'Camera not found'
        });
      }
      
      if (!cameraData.is_active) {
        return res.status(400).json({
          success: false,
          message: 'Camera is not active'
        });
      }

      streamUrl = buildStreamUrl(cameraData);
      streamId = `camera_${camera_id}`;
    } else {
      // Start stream with manual config
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
      return res.json({
        success: true,
        message: 'Stream already active',
        streamUrl: `/api/camera/video/${streamId}`,
        streamId: streamId,
        snapshotUrl: `/api/camera/snapshot/${streamId}`
      });
    }

    // Update camera status to connecting
    if (cameraData) {
      await cameraData.updateConnectionStatus('connecting');
    }

    // Start the stream
    const processingFps = cameraData?.processing_fps || manualConfig.processing_fps || 1;
    const resolution = cameraData?.resolution || manualConfig.resolution || '1280x720';

    const result = await cameraConnectionService.startStream(streamId, streamUrl, {
      fps: processingFps,
      resolution: resolution,
      onFrame: (frameData, camId) => {
        // Store frame for HTTP streaming
        global.cameraFrames = global.cameraFrames || new Map();
        global.cameraFrames.set(camId, frameData);
        
        // Update last connected time periodically
        if (cameraData && Math.random() < 0.01) { // 1% of frames
          cameraData.updateConnectionStatus('connected').catch(console.error);
        }
      },
      onError: async (error) => {
        console.error(`❌ Stream error for ${streamId}:`, error);
        if (cameraData) {
          await cameraData.updateConnectionStatus('error', error.message);
        }
      }
    });

    if (result.success) {
      // Update camera status to connected
      if (cameraData) {
        await cameraData.updateConnectionStatus('connected');
      }

      res.json({
        success: true,
        message: 'Stream started successfully',
        streamUrl: `/api/camera/video/${streamId}`,
        streamId: streamId,
        snapshotUrl: `/api/camera/snapshot/${streamId}`,
        camera: cameraData ? {
          camera_id: cameraData.camera_id,
          camera_name: cameraData.camera_name,
          camera_code: cameraData.camera_code,
          resolution: cameraData.resolution,
          fps: cameraData.processing_fps
        } : null
      });
    } else {
      if (cameraData) {
        await cameraData.updateConnectionStatus('error', 'Failed to start stream');
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
 * Get video stream feed (MJPEG)
 */
router.get('/video/:streamId', (req, res) => {
  const { streamId } = req.params;

  if (!cameraConnectionService.isStreaming(streamId)) {
    return res.status(404).json({
      success: false,
      message: 'Stream not found or not active'
    });
  }

  // Set headers for MJPEG stream
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Pragma': 'no-cache'
  });

  // Initialize frame storage
  global.cameraFrames = global.cameraFrames || new Map();

  // Send frames to client
  const intervalId = setInterval(() => {
    const frameData = global.cameraFrames.get(streamId);
    
    if (frameData) {
      try {
        res.write('--frame\r\n');
        res.write('Content-Type: image/jpeg\r\n');
        res.write(`Content-Length: ${frameData.length}\r\n\r\n`);
        res.write(frameData);
        res.write('\r\n');
      } catch (error) {
        console.error('Error writing frame:', error);
        clearInterval(intervalId);
      }
    }
  }, 100); // 10 FPS for viewing

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(intervalId);
    console.log('🔌 Client disconnected from stream:', streamId);
  });
});

/**
 * POST /api/camera/stop
 * POST /api/camera/stop/:streamId
 * Stop camera stream
 */
router.post('/stop/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;

    if (streamId) {
      const result = cameraConnectionService.stopStream(streamId);
      
      // Clean up frame data
      if (global.cameraFrames) {
        global.cameraFrames.delete(streamId);
      }
      
      // Update camera status if it's a DB camera
      if (streamId.startsWith('camera_')) {
        const cameraId = streamId.replace('camera_', '');
        const camera = await Camera.findByPk(cameraId);
        if (camera) {
          await camera.updateConnectionStatus('disconnected');
        }
      }
      
      res.json(result);
    } else {
      // Stop all streams
      const activeStreams = cameraConnectionService.getActiveStreams();
      
      // Update all camera statuses
      for (const sid of activeStreams) {
        if (sid.startsWith('camera_')) {
          const cameraId = sid.replace('camera_', '');
          const camera = await Camera.findByPk(cameraId);
          if (camera) {
            await camera.updateConnectionStatus('disconnected');
          }
        }
      }
      
      cameraConnectionService.stopAllStreams();
      
      if (global.cameraFrames) {
        global.cameraFrames.clear();
      }
      
      res.json({
        success: true,
        message: 'All streams stopped'
      });
    }

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
 * GET /api/camera/info/:streamId
 * Get stream information
 */
router.get('/info/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    
    const isStreaming = cameraConnectionService.isStreaming(streamId);
    
    let cameraInfo = null;
    if (streamId.startsWith('camera_')) {
      const cameraId = streamId.replace('camera_', '');
      const camera = await Camera.findByPk(cameraId);
      if (camera) {
        cameraInfo = {
          camera_id: camera.camera_id,
          camera_name: camera.camera_name,
          ip_address: camera.ip_address,
          resolution: camera.resolution,
          fps: camera.fps,
          connection_status: camera.connection_status,
          last_connected_at: camera.last_connected_at
        };
      }
    }

    res.json({
      success: true,
      streamId,
      isStreaming,
      camera: cameraInfo,
      allActiveStreams: cameraConnectionService.getActiveStreams()
    });

  } catch (error) {
    console.error('Stream info error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting stream info'
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
          const camera = await Camera.findByPk(cameraId, {
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
 * POST /api/camera/:id/start-stream
 * Start stream for a specific camera by ID
 */
router.post('/:id/start-stream', async (req, res) => {
  try {
    const camera = await Camera.findByPk(req.params.id);
    
    if (!camera) {
      return res.status(404).json({
        success: false,
        message: 'Camera not found'
      });
    }

    if (!camera.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Camera is not active'
      });
    }

    // Use the existing stream endpoint logic
    req.body.camera_id = camera.camera_id;
    return router.handle(req, res);

  } catch (error) {
    console.error('Start camera stream error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/camera/formats
 * Get supported camera URL formats
 */
router.get('/formats', (req, res) => {
  try {
    const formats = cameraConnectionService.getSupportedFormats();
    res.json({
      success: true,
      formats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting formats'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'running',
    active_streams: cameraConnectionService.getActiveStreams().length,
    timestamp: Date.now()
  });
});

module.exports = router;