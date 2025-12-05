/**
 * Object Counting Routes with Image Support
 * Handles video upload, camera stream object counting, and image retrieval
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

console.log('ObjectCounting routes loaded');

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
 * @desc    Upload video for object counting with image capture
 * @access  Private
 */
// In objectCounting.routes.js - Update the upload route

router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No video file uploaded' 
      });
    }

    const { 
      branch_id, 
      zone_id, 
      camera_id, 
      model_type = 'hog',
      capture_images = 'true',
      line_type,        // NEW
      line_position,    // NEW (replaces line_y)
      confidence,
      class_id
    } = req.body;
    
    console.log('📥 Upload params:', { line_type, line_position, confidence, class_id });
    
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
      source: 'upload',
      captureImages: capture_images === 'true' || capture_images === true,
      // NEW: line_type and line_position
      line_type: line_type || 'horizontal',
      line_position: line_position ? parseInt(line_position) : 300,
      confidence: confidence ? parseFloat(confidence) : 0.3,
      class_id: class_id !== undefined ? parseInt(class_id) : -1
    };

    const job = await objectCountingService.createJob(jobData);

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

router.post('/stream/stop', authenticateToken, async (req, res) => {
  try {
    const { stream_id, job_id } = req.body;
    
    console.log('🛑 Stop stream request:', { stream_id, job_id });
    
    let results = {
      streamStopped: false,
      jobCancelled: false,
      messages: []
    };
    
    // 1. Stop the camera stream if stream_id provided
    if (stream_id) {
      try {
        const { Camera } = require('../models');
        // Call your existing camera stream stop logic
        // This depends on your camera service implementation
        // Example: await cameraService.stopStream(stream_id);
        results.streamStopped = true;
        results.messages.push('Camera stream stopped');
        console.log('✅ Camera stream stopped');
      } catch (streamError) {
        console.error('Stream stop error:', streamError);
        results.messages.push('Stream may already be stopped');
      }
    }
    
    // 2. Cancel any active processing job if job_id provided
    if (job_id) {
      try {
        await objectCountingService.cancelJob(job_id);
        results.jobCancelled = true;
        results.messages.push('Processing job cancelled');
        console.log('✅ Processing job cancelled');
      } catch (jobError) {
        console.error('Job cancel error:', jobError);
        results.messages.push('Job may already be completed/cancelled');
      }
    }
    
    res.json({
      success: true,
      message: results.messages.join('. '),
      ...results
    });
    
  } catch (error) {
    console.error('Stop stream/job error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/object-counting/stream
 * @desc    Process camera stream for object counting with image capture
 * @access  Private
 */
router.post('/stream', authenticateToken, async (req, res) => {
  try {
    console.log('📡 Stream processing request body:', req.body);
    const { 
      camera_id, 
      duration = 60, 
      model_type = 'line',
      branch_id,
      zone_id,  // ✅ Now properly extracted
      capture_images = true,
      line_type = 'horizontal',    // ✅ NEW
      line_position = 300,         // ✅ NEW
      confidence = 0.3,            // ✅ NEW
      class_id = -1                // ✅ NEW
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

    console.log('📷 Starting stream processing for camera:', camera_id);
    
    const jobData = {
      cameraId: camera_id,
      streamUrl: camera.stream_url,
      duration,
      userId,
      branchId: branch_id || camera.branch_id,
      zoneId: zone_id || camera.zone_id,  // ✅ Will use provided zone_id or fallback to camera's zone
      modelType: model_type,
      source: 'stream',
      cameraName: camera.camera_name,
      captureImages: capture_images,
      // ✅ NEW: Pass line counter params
      line_type: line_type,
      line_position: line_position,
      confidence: confidence,
      class_id: class_id
    };
    
    console.log('📡 Stream job data:', jobData);
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
    console.log('Fetching jobs for user:', req.user.user_id);
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
 * @route   GET /api/object-counting/job/:jobId/images
 * @desc    Get list of captured images for a job
 * @access  Private
 */
router.get('/job/:jobId/images', authenticateToken, async (req, res) => {
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

    const images = await objectCountingService.getJobImages(jobId);

    res.json({
      success: true,
      images,
      count: images.length
    });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/job/:jobId/image/:filename
 * @desc    Download a specific captured image
 * @access  Private
 */
router.get('/job/:jobId/image/:filename', authenticateToken, async (req, res) => {
  try {
    const { jobId, filename } = req.params;
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

    const imageDir = objectCountingService.getJobImageDir(jobId);
    const imagePath = path.join(imageDir, filename);

    // Security: Prevent directory traversal
    if (!imagePath.startsWith(imageDir)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid filename' 
      });
    }

    if (!fsSync.existsSync(imagePath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Image not found' 
      });
    }

    res.sendFile(imagePath);
  } catch (error) {
    console.error('Download image error:', error);
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
 * @desc    Delete a job and its files (including images)
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
      message: 'Job and all associated files deleted successfully'
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
/**
 * @route   GET /api/object-counting/job/:jobId/download
 * @desc    Download job results (video or JSON) - FIXED
 * @access  Private
 */
router.get('/job/:jobId/download', authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const { format = 'json' } = req.query;
    const userId = req.user.user_id;

    console.log('📥 Download request:', { jobId, format, userId });

    const job = await objectCountingService.getJob(jobId);

    if (!job) {
      console.error('❌ Job not found:', jobId);
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Check authorization
    if (job.userId !== userId && req.user.role !== 'admin') {
      console.error('❌ Unauthorized access:', { jobUserId: job.userId, requestUserId: userId });
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized access to job' 
      });
    }

    // Check if job is completed
    if (job.status !== 'completed') {
      console.error('❌ Job not completed:', { jobId, status: job.status });
      return res.status(400).json({ 
        success: false, 
        message: `Job is ${job.status}, not completed yet` 
      });
    }

    if (format === 'video') {
      // ✅ Try multiple possible paths for output video
      let outputPath = job.results?.outputVideoPath || 
                      job.results?.output_video_path ||
                      job.results?.output_path;
      
      // ✅ If path is relative or URL, construct absolute path
      if (outputPath && !path.isAbsolute(outputPath)) {
        if (outputPath.startsWith('/object-counting/')) {
          // It's a URL path, extract filename and build absolute path
          const filename = path.basename(outputPath);
          outputPath = path.join(__dirname, '../uploads/object-counting/results', filename);
        } else if (outputPath.includes('results')) {
          // It's a relative path with results folder
          outputPath = path.join(__dirname, '../uploads/object-counting', outputPath);
        } else {
          // Construct from job ID
          outputPath = path.join(__dirname, '../uploads/object-counting/results', `${jobId}_output.mp4`);
        }
      }
      
      if (!outputPath) {
        // ✅ Try default path based on job ID
        outputPath = path.join(__dirname, '../uploads/object-counting/results', `${jobId}_output.mp4`);
        console.log('⚠️ No output path in results, trying default:', outputPath);
      }

      console.log('📹 Checking for video file at:', outputPath);

      const fsSync = require('fs');
      if (!fsSync.existsSync(outputPath)) {
        console.error('❌ Output video file does not exist:', outputPath);
        console.error('Job results:', JSON.stringify(job.results, null, 2));
        
        return res.status(404).json({ 
          success: false, 
          message: 'Output video file not found on server. The file may have been deleted or processing did not generate a video file.',
          debug: {
            expectedPath: outputPath,
            resultsData: job.results
          }
        });
      }

      // Check file size
      const stats = fsSync.statSync(outputPath);
      console.log(`✅ Video file found, size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // Send file
      console.log('✅ Sending video file:', outputPath);
      res.download(outputPath, `counting_result_${jobId}.mp4`, (err) => {
        if (err) {
          console.error('❌ Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Error downloading file'
            });
          }
        } else {
          console.log('✅ Video download completed successfully');
        }
      });
    } else {
      // Return JSON results
      console.log('✅ Sending JSON results');
      res.json({
        success: true,
        job,
        results: job.results
      });
    }
  } catch (error) {
    console.error('❌ Download error:', error);
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

router.post('/test-camera-stream', authenticateToken, async (req, res) => {
  try {
    const { camera_id } = req.body;

    if (!camera_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'camera_id is required' 
      });
    }

    const { Camera } = require('../models');
    const camera = await Camera.findByPk(camera_id);

    if (!camera) {
      return res.status(404).json({ 
        success: false, 
        message: 'Camera not found' 
      });
    }

    // Test stream accessibility using ffprobe or a quick frame capture
    const { spawn } = require('child_process');
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'stream=codec_type,width,height',
      '-of', 'json',
      '-timeout', '10000000',  // 10 second timeout
      camera.stream_url
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0 && output) {
        try {
          const streamInfo = JSON.parse(output);
          const videoStream = streamInfo.streams?.find(s => s.codec_type === 'video');
          
          res.json({
            success: true,
            message: 'Camera stream is accessible',
            camera: {
              id: camera.camera_id,
              name: camera.camera_name,
              url: camera.stream_url,
              is_active: camera.is_active
            },
            streamInfo: videoStream ? {
              width: videoStream.width,
              height: videoStream.height,
              codec: videoStream.codec_name
            } : null
          });
        } catch (parseError) {
          res.json({
            success: true,
            message: 'Camera stream is accessible (basic check)',
            camera: {
              id: camera.camera_id,
              name: camera.camera_name,
              url: camera.stream_url,
              is_active: camera.is_active
            }
          });
        }
      } else {
        res.status(400).json({
          success: false,
          message: 'Cannot connect to camera stream',
          error: errorOutput || 'Stream not accessible',
          camera: {
            id: camera.camera_id,
            name: camera.camera_name,
            url: camera.stream_url,
            is_active: camera.is_active
          }
        });
      }
    });

    // Timeout after 15 seconds
    setTimeout(() => {
      ffprobe.kill();
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Camera stream test timeout',
          camera: {
            id: camera.camera_id,
            name: camera.camera_name,
            url: camera.stream_url
          }
        });
      }
    }, 15000);

  } catch (error) {
    console.error('Test camera stream error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

/**
 * @route   GET /api/object-counting/camera/:cameraId/snapshot
 * @desc    Get a single frame snapshot from camera
 * @access  Private
 */
router.get('/camera/:cameraId/snapshot', authenticateToken, async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { Camera } = require('../models');
    const camera = await Camera.findByPk(cameraId);

    if (!camera) {
      return res.status(404).json({ 
        success: false, 
        message: 'Camera not found' 
      });
    }

    const { spawn } = require('child_process');
    const tmpPath = path.join(__dirname, '../uploads/temp', `snapshot_${cameraId}_${Date.now()}.jpg`);

    // Use ffmpeg to grab a single frame
    const ffmpeg = spawn('ffmpeg', [
      '-i', camera.stream_url,
      '-vframes', '1',
      '-f', 'image2',
      '-y',
      tmpPath
    ]);

    ffmpeg.on('close', (code) => {
      if (code === 0 && fsSync.existsSync(tmpPath)) {
        res.sendFile(tmpPath, (err) => {
          // Clean up after sending
          if (fsSync.existsSync(tmpPath)) {
            fsSync.unlinkSync(tmpPath);
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to capture snapshot'
        });
      }
    });

    // Timeout
    setTimeout(() => {
      ffmpeg.kill();
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Snapshot capture timeout'
        });
      }
    }, 10000);

  } catch (error) {
    console.error('Snapshot error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Add to objectCounting.routes.js
router.get('/test-python', async (req, res) => {
  const { spawn } = require('child_process');
  const python = spawn('python', ['--version']);
  
  let output = '';
  python.stdout.on('data', (data) => output += data);
  python.stderr.on('data', (data) => output += data);
  
  python.on('close', (code) => {
    res.json({
      success: code === 0,
      version: output,
      scriptExists: require('fs').existsSync(path.join(__dirname, '../../../ai-module/src/models/object_counter.py'))
    });
  });
});

module.exports = router;