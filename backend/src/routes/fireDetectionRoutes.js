// routes/fireDetectionRoutes.js
const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

// Configure multer for file uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// In-memory store for active detection processes (use Redis in production)
const activeDetections = new Map();

/**
 * START FIRE DETECTION
 * POST /api/fire-detection/start
 */
router.post('/start', async (req, res) => {
  try {
    const { camera_id, sensitivity, min_confidence, alert_sound, email_alert } = req.body;

    if (!camera_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'camera_id is required' 
      });
    }

    // Check if detection already running for this camera
    if (activeDetections.has(camera_id)) {
      return res.status(409).json({ 
        success: false, 
        message: 'Detection already running for this camera' 
      });
    }

    // Get camera details from database
    // const camera = await db.query('SELECT * FROM cameras WHERE id = ?', [camera_id]);
    // For now, using mock data
    const streamUrl = `http://192.168.31.89:8080/video`; // Replace with actual camera stream

    // Spawn Python fire detection process
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../../ai-module/src/models/fire_detection.py'),
      '--stream-url', streamUrl,
      '--camera-id', camera_id,
      '--sensitivity', sensitivity || 60,
      '--min-confidence', min_confidence || 70,
      '--output-dir', path.join(__dirname, '../alerts'),
      '--alert-sound', alert_sound ? 'true' : 'false'
    ]);

    // Store process reference
    activeDetections.set(camera_id, {
      process: pythonProcess,
      startTime: new Date(),
      settings: { sensitivity, min_confidence, alert_sound, email_alert }
    });

    // Handle Python process output
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Camera ${camera_id}] ${output}`);

      // Parse fire detection events
      try {
        const event = JSON.parse(output);
        if (event.type === 'fire_detected') {
          handleFireAlert(camera_id, event);
        }
      } catch (e) {
        // Not JSON, just log output
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`[Camera ${camera_id}] Error: ${data}`);
    });

    pythonProcess.on('close', (code) => {
      console.log(`[Camera ${camera_id}] Detection stopped with code ${code}`);
      activeDetections.delete(camera_id);
    });

    res.json({
      success: true,
      message: 'Fire detection started',
      camera_id,
      settings: { sensitivity, min_confidence }
    });

  } catch (error) {
    console.error('Start detection error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * STOP FIRE DETECTION
 * POST /api/fire-detection/stop/:cameraId
 */
router.post('/stop/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;

    const detection = activeDetections.get(cameraId);
    if (!detection) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active detection for this camera' 
      });
    }

    // Kill Python process
    detection.process.kill('SIGTERM');
    activeDetections.delete(cameraId);

    res.json({
      success: true,
      message: 'Fire detection stopped',
      camera_id: cameraId
    });

  } catch (error) {
    console.error('Stop detection error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * GET DETECTION STATUS
 * GET /api/fire-detection/status/:cameraId
 */
router.get('/status/:cameraId', (req, res) => {
  const { cameraId } = req.params;
  const detection = activeDetections.get(cameraId);

  if (!detection) {
    return res.json({
      success: true,
      is_active: false,
      camera_id: cameraId
    });
  }

  res.json({
    success: true,
    is_active: true,
    camera_id: cameraId,
    start_time: detection.startTime,
    settings: detection.settings,
    uptime_seconds: Math.floor((Date.now() - detection.startTime) / 1000)
  });
});

/**
 * GET FIRE ALERTS
 * GET /api/fire-alerts
 */
router.get('/fire-alerts', async (req, res) => {
  try {
    const { camera_id, status, from_date, to_date, limit = 50 } = req.query;

    // Build SQL query
    let query = 'SELECT * FROM fire_alerts WHERE 1=1';
    const params = [];

    if (camera_id) {
      query += ' AND camera_id = ?';
      params.push(camera_id);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (from_date) {
      query += ' AND timestamp >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND timestamp <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(limit));

    // Execute query (pseudo-code, adjust for your DB)
    // const alerts = await db.query(query, params);

    // Mock response
    const alerts = [
      {
        id: 1,
        camera_id: 'cam_1',
        camera_name: 'Main Entrance',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        confidence: 0.92,
        status: 'resolved',
        resolved_at: new Date(Date.now() - 60000).toISOString(),
        snapshot_path: '/alerts/snapshot_1.jpg'
      },
      {
        id: 2,
        camera_id: 'cam_2',
        camera_name: 'Warehouse',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        confidence: 0.85,
        status: 'active',
        snapshot_path: '/alerts/snapshot_2.jpg'
      }
    ];

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * GET DETECTION STATISTICS
 * GET /api/fire-detection/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    // Query statistics from database
    // const stats = await db.query('SELECT ...');

    // Mock response
    const stats = {
      total_alerts: 45,
      active_alerts: 2,
      resolved_alerts: 38,
      false_positives: 5,
      avg_confidence: 87.5,
      alerts_today: 8,
      cameras_monitored: 3,
      active_detections: activeDetections.size
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * GET HOURLY ANALYTICS
 * GET /api/fire-detection/analytics/hourly
 */
router.get('/analytics/hourly', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Query hourly data from database
    // const data = await db.query('SELECT ...');

    // Mock response
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      alerts: Math.floor(Math.random() * 5),
      false_alerts: Math.floor(Math.random() * 2),
      avg_confidence: 80 + Math.random() * 15
    }));

    res.json({
      success: true,
      data: hourlyData,
      date: targetDate
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * RESOLVE FIRE ALERT
 * POST /api/fire-alerts/:alertId/resolve
 */
router.post('/fire-alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { notes } = req.body;

    // Update database
    // await db.query('UPDATE fire_alerts SET status = ?, resolved_at = ?, notes = ? WHERE id = ?',
    //   ['resolved', new Date(), notes, alertId]);

    res.json({
      success: true,
      message: 'Alert resolved',
      alert_id: alertId
    });

  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * MARK AS FALSE POSITIVE
 * POST /api/fire-alerts/:alertId/false-positive
 */
router.post('/fire-alerts/:alertId/false-positive', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason } = req.body;

    // Update database
    // await db.query('UPDATE fire_alerts SET status = ?, resolved_at = ?, false_positive_reason = ? WHERE id = ?',
    //   ['false_positive', new Date(), reason, alertId]);

    res.json({
      success: true,
      message: 'Alert marked as false positive',
      alert_id: alertId
    });

  } catch (error) {
    console.error('Mark false positive error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * TEST FIRE DETECTION ON IMAGE
 * POST /api/fire-detection/test
 */
router.post('/test', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    const imagePath = req.file.path;

    // Run Python detection on image
    const pythonProcess = spawn('python', [
      path.join(__dirname, '../../../ai-module/src/models/fire_detection_test.py'),
      '--image', imagePath
    ]);

    let output = '';
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      // Clean up uploaded file
      await fs.unlink(imagePath).catch(console.error);

      try {
        const result = JSON.parse(output);
        res.json({
          success: true,
          ...result
        });
      } catch (e) {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to parse detection result' 
        });
      }
    });

  } catch (error) {
    console.error('Test image error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * Handle fire alert from Python process
 */
async function handleFireAlert(cameraId, event) {
  try {
    console.log(`🔥 Fire detected on camera ${cameraId}:`, event);

    // Save to database
    // const alertId = await db.query(
    //   'INSERT INTO fire_alerts (camera_id, timestamp, confidence, bbox, snapshot_path) VALUES (?, ?, ?, ?, ?)',
    //   [cameraId, new Date(), event.confidence, JSON.stringify(event.bbox), event.snapshot_path]
    // );

    // Send email notification if enabled
    // if (event.email_alert) {
    //   await sendEmailAlert(cameraId, event);
    // }

    // Trigger websocket notification to connected clients
    // io.emit('fire_alert', {
    //   camera_id: cameraId,
    //   timestamp: new Date(),
    //   confidence: event.confidence,
    //   alert_id: alertId
    // });

  } catch (error) {
    console.error('Handle fire alert error:', error);
  }
}

module.exports = router;