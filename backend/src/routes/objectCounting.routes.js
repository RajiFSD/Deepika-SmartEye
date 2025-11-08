/**
 * Object Counting Routes
 * Handles video upload and camera stream object counting
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const objectCountingService = require('../services/objectCountingService');
const { authenticateToken } = require('../middleware/auth');

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/object-counting');
    if (!fsSync.existsSync(uploadDir)) {
      fsSync.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed (MP4, AVI, MOV, MKV, WebM)'));
    }
  }
});

/**
 * @route   POST /api/object-counting/upload
 * @desc    Upload video for object counting
 * @access  Private
 */
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file uploaded' 
      });
    }

    const { branch_id, zone_id, camera_id, model_type = 'hog' } = req.body;
    const userId = req.user.user_id;

    const jobData = {
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      userId,
      branchId: branch_id,
      zoneId: zone_id,
      cameraId: camera_id,
      modelType: model_type,
      source: 'upload'
    };

    const job = await objectCountingService.createJob(jobData);

    // Start processing in background
    objectCountingService.processJob(job.id).catch(err => {
      console.error(`Job ${job.id} failed:`, err);
    });

    res.json({
      success: true,
      message: 'Video uploaded successfully and queued for processing',
      jobId: job.id,
      job
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/object-counting/stream
 * @desc    Process camera stream for object counting
 * @access  Private
 */
router.post('/stream', authenticateToken, async (req, res) => {
  try {
    const { 
      camera_id, 
      duration = 60, 
      model_type = 'hog',
      branch_id,
      zone_id 
    } = req.body;

    if (!camera_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'camera_id is required' 
      });
    }

    const userId = req.user.user_id;

    // Get camera details from database
    const { Camera } = require('../models');
    const camera = await Camera.findByPk(camera_id);

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

    const jobData = {
      cameraId: camera_id,
      streamUrl: camera.stream_url,
      duration,
      userId,
      branchId: branch_id || camera.branch_id,
      zoneId: zone_id || camera.zone_id,
      modelType: model_type,
      source: 'stream',
      cameraName: camera.camera_name
    };

    const job = await objectCountingService.createJob(jobData);

    // Start processing in background
    objectCountingService.processJob(job.id).catch(err => {
      console.error(`Stream job ${job.id} failed:`, err);
    });

    res.json({
      success: true,
      message: 'Stream processing started',
      jobId: job.id,
      job
    });
  } catch (error) {
    console.error('Stream processing error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/jobs
 * @desc    Get all object counting jobs for user
 * @access  Private
 */
router.get('/jobs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status, limit = 50, offset = 0 } = req.query;

    const filters = { userId };
    if (status) filters.status = status;

    const jobs = await objectCountingService.getJobs(filters, { 
      limit: parseInt(limit), 
      offset: parseInt(offset) 
    });

    res.json({
      success: true,
      jobs: jobs.rows,
      total: jobs.count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/job/:jobId
 * @desc    Get job details and status
 * @access  Private
 */
router.get('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.user_id;

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Check if user owns this job
    if (job.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access to job' 
      });
    }

    res.json({
      success: true,
      job
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/object-counting/job/:jobId/cancel
 * @desc    Cancel a running job
 * @access  Private
 */
router.post('/job/:jobId/cancel', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.user_id;

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot cancel completed or failed job' 
      });
    }

    await objectCountingService.cancelJob(jobId);

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   DELETE /api/object-counting/job/:jobId
 * @desc    Delete a job and its files
 * @access  Private
 */
router.delete('/job/:jobId', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.user_id;

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    await objectCountingService.deleteJob(jobId);

    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/job/:jobId/download
 * @desc    Download job results (video or JSON)
 * @access  Private
 */
router.get('/job/:jobId/download', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format = 'json' } = req.query;
    const userId = req.user.user_id;

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Job not completed yet' 
      });
    }

    if (format === 'video') {
      const outputPath = job.results?.outputVideoPath;
      if (!outputPath || !fsSync.existsSync(outputPath)) {
        return res.status(404).json({ 
          success: false, 
          message: 'Output video not found' 
        });
      }
      res.download(outputPath, `counting_result_${jobId}.mp4`);
    } else {
      res.json({
        success: true,
        job,
        results: job.results
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/stats
 * @desc    Get object counting statistics for user
 * @access  Private
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { start_date, end_date, branch_id } = req.query;

    const stats = await objectCountingService.getStats(userId, {
      startDate: start_date,
      endDate: end_date,
      branchId: branch_id
    });

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   POST /api/object-counting/job/:jobId/save-to-database
 * @desc    Save job results to people count database
 * @access  Private
 */
router.post('/job/:jobId/save-to-database', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user.user_id;

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    if (job.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Job not completed yet' 
      });
    }

    const saved = await objectCountingService.saveToPeopleCount(jobId);

    res.json({
      success: true,
      message: 'Results saved to people count database',
      saved
    });
  } catch (error) {
    console.error('Save to database error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;