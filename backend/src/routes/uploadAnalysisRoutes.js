// routes/uploadAnalysisRoutes.js - Enhanced with Gender Detection
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

// Import controller
const uploadAnalysisController = require('../controllers/uploadAnalysisController');
const detectionIntegrationService = require('../services/detectionIntegrationService');

// CHECK: Log what we imported
console.log('📦 Imported uploadAnalysisController:', uploadAnalysisController);
console.log('📦 Available methods:', Object.keys(uploadAnalysisController));

// Configuration
const DETECTION_SERVICE_URL = process.env.DETECTION_SERVICE_URL || 'http://localhost:5000';

// Configure multer for different upload types
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB for videos
  },
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = /mp4|avi|mov|mkv|webm/;
    const allowedImageTypes = /jpeg|jpg|png/;
    const ext = file.originalname.toLowerCase().match(/\.[^.]*$/)[0];
    
    if (allowedVideoTypes.test(ext) || allowedImageTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only videos and images allowed.'));
    }
  }
});

// Simple middleware for testing (replace with your auth later)
const authenticate = (req, res, next) => {
  console.log('🔐 Authenticating request..Testing iniplaodAnalysisRoutes.');
  // Mock user for testing - REPLACE THIS WITH YOUR ACTUAL AUTH
  req.user = {
    user_id: 1,
    tenant_id: 1,
    name: 'Test User'
  };
  next();
};

// ============================================
// EXISTING ROUTES - Keep as they are
// ============================================

console.log('🔗 Registering route: POST /upload');
router.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  console.log('📥 Upload route hit');
  if (typeof uploadAnalysisController.uploadFile !== 'function') {
    console.error('❌ uploadFile is not a function!');
    return res.status(500).json({ error: 'uploadFile is not a function' });
  }
  uploadAnalysisController.uploadFile(req, res, next);
});

console.log('🔗 Registering route: POST /analyze/:jobId');
router.post('/analyze/:jobId', authenticate, (req, res, next) => {
  console.log('📊 Analyze route hit');
  if (typeof uploadAnalysisController.analyzeFile !== 'function') {
    console.error('❌ analyzeFile is not a function!');
    return res.status(500).json({ error: 'analyzeFile is not a function' });
  }
  uploadAnalysisController.analyzeFile(req, res, next);
});

console.log('🔗 Registering route: GET /jobs');
router.get('/jobs', authenticate, (req, res, next) => {
  console.log('📋 Get all jobs route hit');
  if (typeof uploadAnalysisController.getAllJobs !== 'function') {
    console.error('❌ getAllJobs is not a function!');
    return res.status(500).json({ error: 'getAllJobs is not a function' });
  }
  uploadAnalysisController.getAllJobs(req, res, next);
});

console.log('🔗 Registering route: GET /jobs/:jobId');
router.get('/jobs/:jobId', authenticate, (req, res, next) => {
  console.log('📄 Get job by ID route hit');
  if (typeof uploadAnalysisController.getJobById !== 'function') {
    console.error('❌ getJobById is not a function!');
    return res.status(500).json({ error: 'getJobById is not a function' });
  }
  uploadAnalysisController.getJobById(req, res, next);
});

console.log('🔗 Registering route: GET /jobs/:jobId/results');
router.get('/jobs/:jobId/results', authenticate, (req, res, next) => {
  console.log('📊 Get results route hit');
  if (typeof uploadAnalysisController.getJobResults !== 'function') {
    console.error('❌ getJobResults is not a function!');
    return res.status(500).json({ error: 'getJobResults is not a function' });
  }
  uploadAnalysisController.getJobResults(req, res, next);
});

console.log('🔗 Registering route: GET /jobs/:jobId/detections');
router.get('/jobs/:jobId/detections', authenticate, (req, res, next) => {
  console.log('🔍 Get detections route hit');
  if (typeof uploadAnalysisController.getJobDetections !== 'function') {
    console.error('❌ getJobDetections is not a function!');
    return res.status(500).json({ error: 'getJobDetections is not a function' });
  }
  uploadAnalysisController.getJobDetections(req, res, next);
});

console.log('🔗 Registering route: DELETE /jobs/:jobId');
router.delete('/jobs/:jobId', authenticate, (req, res, next) => {
  console.log('🗑️ Delete job route hit');
  if (typeof uploadAnalysisController.deleteJob !== 'function') {
    console.error('❌ deleteJob is not a function!');
    return res.status(500).json({ error: 'deleteJob is not a function' });
  }
  uploadAnalysisController.deleteJob(req, res, next);
});

// ============================================
// STREAM ANALYSIS ROUTES (if you have them)
// ============================================

if (typeof uploadAnalysisController.startStreamAnalysis === 'function') {
  console.log('🔗 Registering route: POST /stream/start');
  router.post('/stream/start', authenticate, (req, res, next) => {
    console.log('🎹 Start stream route hit');
    uploadAnalysisController.startStreamAnalysis(req, res, next);
  });
}

if (typeof uploadAnalysisController.stopStreamAnalysis === 'function') {
  console.log('🔗 Registering route: POST /stream/:jobId/stop');
  router.post('/stream/:jobId/stop', authenticate, (req, res, next) => {
    console.log('⏹️ Stop stream route hit');
    uploadAnalysisController.stopStreamAnalysis(req, res, next);
  });
}

if (typeof uploadAnalysisController.getStreamCounts === 'function') {
  console.log('🔗 Registering route: GET /stream/:jobId/counts');
  router.get('/stream/:jobId/counts', authenticate, (req, res, next) => {
    console.log('📊 Stream counts route hit');
    uploadAnalysisController.getStreamCounts(req, res, next);
  });
}

// ============================================
// 🆕 GENDER DETECTION ROUTES
// ============================================

/**
 * POST /api/upload-analysis/detection/process-video
 * Process uploaded video with gender detection
 */
console.log('🔗 Registering route: POST /detection/process-video');
router.post('/detection/process-video', authenticate, upload.single('video'), async (req, res) => {
  console.log('🎬 Process video with gender detection');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file provided' 
      });
    }

    console.log(`📹 Processing video: ${req.file.originalname} (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Create form data for Python service
    const formData = new FormData();
    formData.append('video', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Forward to Python detection service
    console.log(`🔄 Forwarding to detection service: ${DETECTION_SERVICE_URL}`);
    
    const response = await axios.post(
      `${DETECTION_SERVICE_URL}/api/detection/process-video`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 600000 // 10 minutes timeout for large videos
      }
    );

    console.log(`✅ Detection complete: ${response.data.summary?.total_count || 0} detections`);
    console.log(`   Male: ${response.data.summary?.male_count || 0}, Female: ${response.data.summary?.female_count || 0}`);

    // Optionally save detections to your database here
    // await saveDetectionsToDatabase(response.data, req.user);

    res.json(response.data);

  } catch (error) {
    console.error('❌ Video processing error:', error.message);
    
    if (error.response) {
      // Error from detection service
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Detection service error',
        details: error.response.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      // Detection service not running
      return res.status(503).json({
        success: false,
        message: 'Detection service is not available. Please ensure the Python service is running on port 5000.'
      });
    } else {
      // Other errors
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to process video'
      });
    }
  }
});

/**
 * POST /api/upload-analysis/detection/detect-frame
 * Detect people in a single frame with gender classification
 */
console.log('🔗 Registering route: POST /detection/detect-frame');
router.post('/detection/detect-frame', authenticate, upload.single('frame'), async (req, res) => {
  console.log('🖼️ Detect in single frame');
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No frame provided' 
      });
    }

    const { camera_id } = req.body;
    console.log(`🔍 Detecting in frame from camera: ${camera_id || 'unknown'}`);

    // Create form data
    const formData = new FormData();
    formData.append('frame', req.file.buffer, {
      filename: 'frame.jpg',
      contentType: 'image/jpeg'
    });
    
    if (camera_id) {
      formData.append('camera_id', camera_id);
    }

    // Forward to detection service
    const response = await axios.post(
      `${DETECTION_SERVICE_URL}/api/detection/detect-frame`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log(`✅ Frame detection: ${response.data.count || 0} people detected`);

    res.json(response.data);

  } catch (error) {
    console.error('❌ Frame detection error:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: error.response.data.message || 'Detection failed',
        details: error.response.data
      });
    } else if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        message: 'Detection service is not available'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to detect in frame'
      });
    }
  }
});

/**
 * GET /api/upload-analysis/detection/health
 * Check detection service health
 */
console.log('🔗 Registering route: GET /detection/health');
router.get('/detection/health', async (req, res) => {
  console.log('🏥 Checking detection service health');
  
  try {
    const response = await axios.get(
      `${DETECTION_SERVICE_URL}/api/detection/health`,
      { timeout: 5000 }
    );

    res.json({
      success: true,
      service: 'Detection Service',
      status: 'healthy',
      details: response.data
    });

  } catch (error) {
    console.error('❌ Detection service health check failed:', error.message);
    
    res.status(503).json({
      success: false,
      service: 'Detection Service',
      status: 'unhealthy',
      message: error.code === 'ECONNREFUSED' 
        ? 'Detection service is not running' 
        : error.message
    });
  }
});

/**
 * GET /api/upload-analysis/detection/capabilities
 * Get detection service capabilities
 */
console.log('🔗 Registering route: GET /detection/capabilities');
router.get('/detection/capabilities', async (req, res) => {
  console.log('🔍 Getting detection capabilities');
  
  try {
    const response = await axios.get(
      `${DETECTION_SERVICE_URL}/api/detection/capabilities`,
      { timeout: 5000 }
    );

    res.json({
      success: true,
      capabilities: response.data
    });

  } catch (error) {
    console.error('❌ Failed to get capabilities:', error.message);
    
    res.status(503).json({
      success: false,
      message: 'Could not retrieve detection capabilities'
    });
  }
});

/**
 * POST /api/upload-analysis/detection/batch-process
 * Process multiple frames in batch (for real-time stream analysis)
 */
console.log('🔗 Registering route: POST /detection/batch-process');
router.post('/detection/batch-process', authenticate, upload.array('frames', 10), async (req, res) => {
  console.log('📦 Batch processing frames');
  
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No frames provided' 
      });
    }

    console.log(`📸 Processing ${req.files.length} frames`);

    // Process each frame
    const results = await Promise.all(
      req.files.map(async (file) => {
        const formData = new FormData();
        formData.append('frame', file.buffer, {
          filename: 'frame.jpg',
          contentType: 'image/jpeg'
        });

        try {
          const response = await axios.post(
            `${DETECTION_SERVICE_URL}/api/detection/detect-frame`,
            formData,
            {
              headers: formData.getHeaders(),
              timeout: 10000
            }
          );
          return { success: true, data: response.data };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    );

    // Aggregate results
    const successfulResults = results.filter(r => r.success);
    const totalDetections = successfulResults.reduce(
      (sum, r) => sum + (r.data.count || 0), 0
    );
    const maleCount = successfulResults.reduce(
      (sum, r) => sum + (r.data.male_count || 0), 0
    );
    const femaleCount = successfulResults.reduce(
      (sum, r) => sum + (r.data.female_count || 0), 0
    );

    console.log(`✅ Batch complete: ${totalDetections} detections (M:${maleCount}, F:${femaleCount})`);

    res.json({
      success: true,
      processed: req.files.length,
      successful: successfulResults.length,
      failed: results.length - successfulResults.length,
      summary: {
        total_detections: totalDetections,
        male_count: maleCount,
        female_count: femaleCount
      },
      results: results
    });

  } catch (error) {
    console.error('❌ Batch processing error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Batch processing failed'
    });
  }
});

/**
 * POST /api/upload-analysis/detection/save-results
 * Save detection results to database
 */
console.log('🔗 Registering route: POST /detection/save-results');
router.post('/detection/save-results', authenticate, async (req, res) => {
  console.log('💾 Saving detection results');
  
  try {
    const { job_id, camera_id, detections } = req.body;

    if (!detections || !Array.isArray(detections)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid detections data'
      });
    }

    // TODO: Implement saving to your PeopleCountLog table
    // This is a placeholder - implement based on your database schema
    
    const { PeopleCountLog } = require('@models');
    
    const savedDetections = await Promise.all(
      detections.map(async (det) => {
        return await PeopleCountLog.create({
          camera_id: camera_id,
          tenant_id: req.user.tenant_id,
          branch_id: det.branch_id,
          zone_id: det.zone_id,
          person_id: det.person_id || `person_${Date.now()}_${Math.random()}`,
          direction: det.direction || 'IN',
          detection_time: det.detection_time || new Date(),
          frame_number: det.frame_number,
          confidence_score: det.confidence_score,
          metadata: {
            ...det.metadata,
            gender: det.gender,
            age: det.age,
            emotion: det.emotion,
            job_id: job_id,
            source: 'gender_detection'
          }
        });
      })
    );

    console.log(`✅ Saved ${savedDetections.length} detections to database`);

    res.json({
      success: true,
      message: 'Detection results saved successfully',
      saved_count: savedDetections.length
    });

  } catch (error) {
    console.error('❌ Error saving results:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save detection results',
      error: error.message
    });
  }
});



// --------------------------------------
// PROCESS VIDEO (Gender + People Counting)
// --------------------------------------
router.post('/detection/process-video', authenticate, upload.single('video'), async (req, res) => {
  console.log("🎥 /detection/process-video route hit");

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file provided' });
    }

    // Save uploaded file temporarily
    const tempPath = path.join(__dirname, '../../temp', Date.now() + '_' + req.file.originalname);
    fs.writeFileSync(tempPath, req.file.buffer);

    const result = await detectionIntegrationService.processVideoWithGenderDetection(tempPath, {
      camera_id: req.body.camera_id || null,
      tenant_id: req.user.tenant_id,
      branch_id: req.user.branch_id || null,
      job_id: `job_${Date.now()}`
    });

    fs.unlinkSync(tempPath);

    return res.json(result);

  } catch (error) {
    console.error("❌ Video detection integration error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// --------------------------------------
// PROCESS SINGLE FRAME (Real-time camera)
// --------------------------------------
router.post('/detection/detect-frame', authenticate, upload.single('frame'), async (req, res) => {
  console.log("📸 /detection/detect-frame route hit");

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No frame provided' });
    }

    const result = await detectionIntegrationService.processFrameWithGenderDetection(
      req.file.buffer,
      { camera_id: req.body.camera_id }
    );

    return res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("❌ Frame detection error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// --------------------------------------
// SAVE DETECTIONS (DB insert + occupancy update)
// --------------------------------------
router.post('/detection/save-results', authenticate, async (req, res) => {
  console.log("💾 /detection/save-results route hit");

  try {
    const { detections, camera_id, job_id } = req.body;

    const saved = await detectionIntegrationService.saveDetectionsToDatabase({
      detections,
      camera_id,
      tenant_id: req.user.tenant_id,
      branch_id: req.user.branch_id || null,
      job_id
    });

    return res.json({
      success: true,
      saved_count: saved.length
    });

  } catch (error) {
    console.error("❌ Save results error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});


// --------------------------------------
// GET GENDER + PEOPLE COUNT STATS
// --------------------------------------
router.get('/detection/stats', authenticate, async (req, res) => {
  console.log("📊 /detection/stats hit");

  try {
    const stats = await detectionIntegrationService.getDetectionStats({
      tenant_id: req.user.tenant_id,
      camera_id: req.query.camera_id,
      branch_id: req.query.branch_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    });

    return res.json({ success: true, stats });

  } catch (error) {
    console.error("❌ Stats error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
});




/**
 * GET /api/upload-analysis/detection/stats
 * Get detection statistics (by gender, time, etc.)
 */
console.log('🔗 Registering route: GET /detection/stats');
router.get('/detection/stats', authenticate, async (req, res) => {
  console.log('📊 Getting detection statistics');
  
  try {
    const { camera_id, start_date, end_date, group_by } = req.query;
    
    // TODO: Implement statistics query based on your database schema
    const { PeopleCountLog } = require('@models');
    const { Op, fn, col } = require('sequelize');

    const where = {
      tenant_id: req.user.tenant_id
    };

    if (camera_id) {
      where.camera_id = camera_id;
    }

    if (start_date && end_date) {
      where.detection_time = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Get counts by gender
    const genderStats = await PeopleCountLog.findAll({
      where,
      attributes: [
        [fn('JSON_EXTRACT', col('metadata'), '$.gender'), 'gender'],
        [fn('COUNT', col('log_id')), 'count']
      ],
      group: ['gender'],
      raw: true
    });

    // Get total counts
    const totalCount = await PeopleCountLog.count({ where });

    const stats = {
      total: totalCount,
      by_gender: genderStats.reduce((acc, stat) => {
        const gender = stat.gender ? stat.gender.replace(/"/g, '') : 'unknown';
        acc[gender] = parseInt(stat.count);
        return acc;
      }, {})
    };

    console.log(`📊 Stats: Total=${stats.total}, Male=${stats.by_gender.male || 0}, Female=${stats.by_gender.female || 0}`);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

console.log('✅ All routes registered successfully (including detection routes)');

module.exports = router;