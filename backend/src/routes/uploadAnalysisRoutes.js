// routes/uploadAnalysisRoutes.js - DIAGNOSTIC VERSION
const express = require('express');
const router = express.Router();
const multer = require('multer');

// Import controller
const uploadAnalysisController = require('../controllers/uploadAnalysisController');

// CHECK: Log what we imported
console.log('📦 Imported uploadAnalysisController:', uploadAnalysisController);
console.log('📦 Available methods:', Object.keys(uploadAnalysisController));

// CHECK: Verify each method exists
console.log('✓ uploadFile:', typeof uploadAnalysisController.uploadFile);
console.log('✓ analyzeFile:', typeof uploadAnalysisController.analyzeFile);
console.log('✓ getAllJobs:', typeof uploadAnalysisController.getAllJobs);
console.log('✓ getJobById:', typeof uploadAnalysisController.getJobById);
console.log('✓ getJobResults:', typeof uploadAnalysisController.getJobResults);
console.log('✓ getJobDetections:', typeof uploadAnalysisController.getJobDetections);
console.log('✓ deleteJob:', typeof uploadAnalysisController.deleteJob);

// Configure multer
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  }
});

// Simple middleware for testing (replace with your auth later)
const authenticate = (req, res, next) => {
  // Mock user for testing
  req.user = {
    user_id: 1,
    tenant_id: 1,
    name: 'Test User'
  };
  next();
};

// Define routes ONE BY ONE with error checking
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

// Add these routes to your existing uploadAnalysisRoutes.js

console.log('🔗 Registering route: POST /stream/start');
router.post('/stream/start', authenticate, (req, res, next) => {
  console.log('📹 Start stream route hit');
  if (typeof uploadAnalysisController.startStreamAnalysis !== 'function') {
    console.error('❌ startStreamAnalysis is not a function!');
    return res.status(500).json({ error: 'startStreamAnalysis is not a function' });
  }
  uploadAnalysisController.startStreamAnalysis(req, res, next);
});

console.log('🔗 Registering route: POST /stream/:jobId/stop');
router.post('/stream/:jobId/stop', authenticate, (req, res, next) => {
  console.log('⏹️ Stop stream route hit');
  if (typeof uploadAnalysisController.stopStreamAnalysis !== 'function') {
    console.error('❌ stopStreamAnalysis is not a function!');
    return res.status(500).json({ error: 'stopStreamAnalysis is not a function' });
  }
  uploadAnalysisController.stopStreamAnalysis(req, res, next);
});

console.log('🔗 Registering route: GET /stream/:jobId/counts');
router.get('/stream/:jobId/counts', authenticate, (req, res, next) => {
  console.log('📊 Stream counts route hit');
  if (typeof uploadAnalysisController.getStreamCounts !== 'function') {
    console.error('❌ getStreamCounts is not a function!');
    return res.status(500).json({ error: 'getStreamCounts is not a function' });
  }
  uploadAnalysisController.getStreamCounts(req, res, next);
});

// Add these streaming routes to your existing uploadAnalysisRoutes.js

console.log('🔗 Registering route: POST /stream/start');
router.post('/stream/start', authenticate, (req, res, next) => {
  console.log('📹 Start stream route hit');
  if (typeof uploadAnalysisController.startStreamAnalysis !== 'function') {
    console.error('❌ startStreamAnalysis is not a function!');
    return res.status(500).json({ error: 'startStreamAnalysis is not a function' });
  }
  uploadAnalysisController.startStreamAnalysis(req, res, next);
});

console.log('🔗 Registering route: POST /stream/:jobId/stop');
router.post('/stream/:jobId/stop', authenticate, (req, res, next) => {
  console.log('⏹️ Stop stream route hit');
  if (typeof uploadAnalysisController.stopStreamAnalysis !== 'function') {
    console.error('❌ stopStreamAnalysis is not a function!');
    return res.status(500).json({ error: 'stopStreamAnalysis is not a function' });
  }
  uploadAnalysisController.stopStreamAnalysis(req, res, next);
});

console.log('🔗 Registering route: GET /stream/:jobId/counts');
router.get('/stream/:jobId/counts', authenticate, (req, res, next) => {
  console.log('📊 Stream counts route hit');
  if (typeof uploadAnalysisController.getStreamCounts !== 'function') {
    console.error('❌ getStreamCounts is not a function!');
    return res.status(500).json({ error: 'getStreamCounts is not a function' });
  }
  uploadAnalysisController.getStreamCounts(req, res, next);
});

console.log('✅ All routes registered successfully');

module.exports = router;