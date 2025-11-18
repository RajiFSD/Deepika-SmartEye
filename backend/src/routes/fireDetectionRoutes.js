// routes/fireDetectionRoutes.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { Camera } = require('@models');

const fireAlertController = require("../controllers/fireAlert.controller");
const fireAlertService = require("../services/fireAlert.service");

// In-memory stores (only for active detection processes)
const activeDetections = new Map();

// ============================================
// PYTHON PROCESS COMMUNICATION ROUTES
// ============================================

/**
 * RECEIVE FIRE ALERT FROM PYTHON PROCESS
 * POST /api/fire-detection/alert
 */
router.post('/alert', async (req, res) => {
  try {
    const { camera_id, user_id, tenant_id, branch_id, timestamp, confidence, 
            snapshot_path, snapshot_base64, bounding_boxes, status } = req.body;

    console.log(`🔥 Fire alert received for camera ${camera_id}: ${(confidence * 100).toFixed(0)}%`);

    await fireAlertService.createAlert({
      camera_id,  
      user_id,  
      tenant_id,
      branch_id,    
      alert_timestamp: new Date(timestamp),
      confidence,
      snapshot_path,
      snapshot_base64,
      bounding_boxes,
      fire_type: "flame",
      severity: "high",
      status: "active"
    });

    res.json({ success: true, message: 'Alert saved successfully' });

  } catch (error) {
    console.error('Alert handler error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * RECEIVE HEARTBEAT FROM PYTHON PROCESS
 * POST /api/fire-detection/heartbeat
 */
router.post('/heartbeat', (req, res) => {
  const { camera_id, timestamp, frames_processed, status } = req.body;
  
  const detection = activeDetections.get(camera_id?.toString());
  if (detection) {
    detection.lastHeartbeat = new Date();
    detection.framesProcessed = frames_processed;
    detection.status = status;
  }

  res.json({ success: true });
});

// ============================================
// DETECTION CONTROL ROUTES
// ============================================

/**
 * START FIRE DETECTION
 * POST /api/fire-detection/start
 */
router.post('/start', async (req, res) => {
  try {
    const { camera_id, user_id, tenant_id, branch_id, sensitivity, min_confidence } = req.body;

    if (!camera_id) {
      return res.status(400).json({ success: false, message: 'camera_id is required' });
    }

    const cameraIdStr = camera_id.toString();

    // Check if already running
    if (activeDetections.has(cameraIdStr)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Detection already running for this camera' 
      });
    }

    // Get camera details
    const camera = await Camera.findByPk(camera_id);
    if (!camera) {
      return res.status(404).json({ success: false, message: 'Camera not found' });
    }

    // Build stream URL
    const streamUrl = camera.stream_url || buildStreamUrl(camera);
    if (!streamUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Camera has no valid stream URL configured' 
      });
    }

    console.log(`🔥 Starting fire detection for camera ${camera_id}: ${camera.camera_name}`);

    // Python script path
    const pythonScript = path.join(__dirname, '../../../ai-module/src/models/fire_detection_continuous.py');
    
    // Check if script exists
    try {
      await fs.access(pythonScript);
    } catch {
      return res.status(500).json({
        success: false,
        message: 'Fire detection script not found. Please ensure AI module is installed.'
      });
    }

    // API URL for callbacks
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api';

    // Spawn Python process
    const pythonProcess = spawn('python', [
      pythonScript,
      '--stream-url', streamUrl,
      '--camera-id', cameraIdStr,
      '--user-id', user_id.toString(),
      '--tenant-id', tenant_id.toString(),
      '--branch-id', branch_id.toString(),
      '--api-url', apiUrl,
      '--sensitivity', (sensitivity || 60).toString(),
      '--min-confidence', (min_confidence || 70).toString(),
      '--output-dir', path.join(__dirname, '../../../alerts')
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    // Store process
    activeDetections.set(cameraIdStr, {
      process: pythonProcess,
      startTime: new Date(),
      lastHeartbeat: new Date(),
      camera: camera.camera_name,
      settings: { sensitivity, min_confidence },
      status: 'starting',
      framesProcessed: 0
    });

    // Handle output
    pythonProcess.stdout.on('data', (data) => {
      console.log(`[Camera ${camera_id}] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Camera ${camera_id}] Error: ${data.toString().trim()}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[Camera ${camera_id}] Process exited with code ${code}`);
      activeDetections.delete(cameraIdStr);
    });

    pythonProcess.on('error', (error) => {
      console.error(`[Camera ${camera_id}] Process error:`, error);
      activeDetections.delete(cameraIdStr);
    });

    res.json({
      success: true,
      message: 'Fire detection started',
      camera_id,
      camera_name: camera.camera_name,
      settings: { sensitivity, min_confidence }
    });

  } catch (error) {
    console.error('Start detection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * STOP FIRE DETECTION
 * POST /api/fire-detection/stop/:cameraId
 */
router.post('/stop/:cameraId', async (req, res) => {
  try {
    const cameraId = req.params.cameraId.toString();
    
    const detection = activeDetections.get(cameraId);
    if (!detection) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active detection for this camera' 
      });
    }

    // Kill process
    try {
      detection.process.kill('SIGTERM');
      setTimeout(() => {
        if (!detection.process.killed) {
          detection.process.kill('SIGKILL');
        }
      }, 2000);
    } catch (killError) {
      console.error('Error killing process:', killError);
    }

    activeDetections.delete(cameraId);

    res.json({
      success: true,
      message: 'Fire detection stopped',
      camera_id: cameraId
    });

  } catch (error) {
    console.error('Stop detection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET DETECTION STATUS
 * GET /api/fire-detection/status/:cameraId
 */
router.get('/status/:cameraId', (req, res) => {
  const cameraId = req.params.cameraId.toString();
  const detection = activeDetections.get(cameraId);

  if (!detection) {
    return res.json({
      success: true,
      is_active: false,
      camera_id: cameraId
    });
  }

  // Check if heartbeat is recent (within 30 seconds)
  const heartbeatAge = (Date.now() - detection.lastHeartbeat.getTime()) / 1000;
  const isHealthy = heartbeatAge < 30;

  res.json({
    success: true,
    is_active: true,
    camera_id: cameraId,
    camera_name: detection.camera,
    start_time: detection.startTime,
    last_heartbeat: detection.lastHeartbeat,
    heartbeat_age_seconds: Math.floor(heartbeatAge),
    is_healthy: isHealthy,
    frames_processed: detection.framesProcessed,
    settings: detection.settings,
    uptime_seconds: Math.floor((Date.now() - detection.startTime.getTime()) / 1000)
  });
});

// ============================================
// DATABASE QUERY ROUTES (Use Controllers)
// ============================================

/**
 * GET FIRE ALERTS
 * GET /api/fire-detection
 */
router.get('/', fireAlertController.getAlerts);

/**
 * GET STATISTICS FROM DATABASE
 * GET /api/fire-detection/stats
 */
router.get('/stats', fireAlertController.getStats);

/**
 * GET HOURLY ANALYTICS
 * GET /api/fire-detection/analytics/hourly
 */
router.get('/analytics/hourly', fireAlertController.getHourlyAnalytics);

/**
 * GET ALERT DETAILS
 * GET /api/fire-detection/:alertId
 */
router.get('/:alertId', fireAlertController.getAlertDetails);

/**
 * RESOLVE ALERT
 * POST /api/fire-detection/:alertId/resolve
 */
router.post('/:alertId/resolve', fireAlertController.resolveAlert);

/**
 * MARK AS FALSE POSITIVE
 * POST /api/fire-detection/:alertId/false-positive
 */
router.post('/:alertId/false-positive', fireAlertController.markFalsePositive);

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildStreamUrl(camera) {
  if (!camera) return '';
  if (camera.stream_url) return camera.stream_url;
  if (camera.ip_address) {
    const port = camera.port || '8080';
    return `http://${camera.ip_address}:${port}/video`;
  }
  return '';
}

module.exports = router;