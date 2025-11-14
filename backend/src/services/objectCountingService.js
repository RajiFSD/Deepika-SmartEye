/**
 * Object Counting Service with Image Capture
 * Handles business logic for object detection, counting, and image capture
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ObjectCountingJob } = require('../models');
const { Op } = require('sequelize');

class ObjectCountingService {
  constructor() {
  this.activeProcesses = new Map();

  // ✅ Cross-platform safe Python script path
 // this.pythonScript = path.resolve(__dirname, "../../../ai-module/src/models/object_counter.py");
  this.pythonScript = path.resolve(__dirname, "../../../ai-module/src/models/object_counter.py");
  console.log('✅ Using Python script path:', this.pythonScript);
  if (!fsSync.existsSync(this.pythonScript)) {
    console.warn("⚠️ Python script not found at:", this.pythonScript);
  } else {
    console.log("✅ Using Python script path:", this.pythonScript);
  }

  // ✅ Directories for storing results and images
  this.resultsDir = path.join(__dirname, "../uploads/object-counting/results");
  this.imagesDir = path.join(__dirname, "../uploads/object-counting/images");
  this.ensureDirectories();
}
  async ensureDirectories() {
    const dirs = [
      path.join(__dirname, '../uploads/object-counting'),
      this.resultsDir,
      this.imagesDir,
      path.join(__dirname, '../uploads/object-counting/temp')
    ];
    
    for (const dir of dirs) {
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Create a new object counting job
   */
  async createJob(jobData) {
    try {
      const job = await ObjectCountingJob.create({
        job_id: uuidv4(),
        user_id: jobData.userId,
        branch_id: jobData.branchId,
        zone_id: jobData.zoneId,
        camera_id: jobData.cameraId,
        source_type: jobData.source,
        file_name: jobData.fileName,
        file_path: jobData.filePath,
        file_size: jobData.fileSize,
        stream_url: jobData.streamUrl,
        duration: jobData.duration,
        model_type: jobData.modelType || 'hog',
        status: 'queued',
        progress: 0,
        metadata: {
          camera_name: jobData.cameraName,
          uploaded_at: new Date().toISOString(),
          capture_images: jobData.captureImages !== false,
          image_output_dir: this.getJobImageDir(jobData.jobId || uuidv4())
        }
      });

      return this.formatJob(job);
    } catch (error) {
      console.error('Create job error:', error);
      throw error;
    }
  }

  /**
   * Get image directory for a job
   */
  getJobImageDir(jobId) {
    return path.join(this.imagesDir, jobId);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    try {
      const job = await ObjectCountingJob.findOne({
        where: { job_id: jobId }
      });

      return job ? this.formatJob(job) : null;
    } catch (error) {
      console.error('Get job error:', error);
      throw error;
    }
  }

  /**
   * Get jobs with filters
   */
  async getJobs(filters = {}, options = {}) {
    try {
      console.log('Filters:', filters);
      const where = {};
      
      if (filters.userId) where.user_id = filters.userId;
      if (filters.status) where.status = filters.status;
      if (filters.branchId) where.branch_id = filters.branchId;
      if (filters.cameraId) where.camera_id = filters.cameraId;

      const jobs = await ObjectCountingJob.findAndCountAll({
        where,
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: [['created_at', 'DESC']]
      });
console.log(`Found ${jobs.count} jobs matching filters`);
      return {
        count: jobs.count,
        rows: jobs.rows.map(job => this.formatJob(job))
      };
    } catch (error) {
      console.error('Get jobs error:', error);
      throw error;
    }
  }

  /**
   * Process a job (run Python script)
   */
  async processJob(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    
    if (!job) {
      throw new Error('Job not found');
    }

    try {
      await job.update({ 
        status: 'processing', 
        progress: 10,
        started_at: new Date()
      });

      const videoSource = job.file_path || job.stream_url;
      const outputPath = path.join(this.resultsDir, `${jobId}_output.mp4`);
      const imageOutputDir = this.getJobImageDir(jobId);

      const results = await this.runPythonCounter(videoSource, jobId, outputPath, imageOutputDir, job);

      // Update job with results
      await job.update({
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        results: {
          ...results,
          outputVideoPath: outputPath,
          imageOutputDirectory: imageOutputDir
        },
        total_count: results.total_counted,
        frames_processed: results.frames_processed,
        processing_time: results.processing_time,
        metadata: {
          ...job.metadata,
          images_captured: results.images_captured
        }
      });

      return this.formatJob(job);
    } catch (error) {
      console.error(`Job ${jobId} processing error:`, error);
      await job.update({
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Run Python object counter script with image capture
   */
  runPythonCounter(videoSource, jobId, outputPath, imageOutputDir, job) {
    return new Promise((resolve, reject) => {
      if (!fsSync.existsSync(this.pythonScript)) {
        reject(new Error('Python script not found: ' + this.pythonScript));
        return;
      }

      const args = [this.pythonScript, videoSource, outputPath];
      
      // Add model type
      if (job.model_type) {
        args.push('--model', job.model_type);
      }

      // Add image capture settings
      const captureImages = job.metadata?.capture_images !== false;
      if (captureImages) {
        args.push('--images', imageOutputDir);
      } else {
        args.push('--no-images');
      }

      console.log('🐍 Running Python with args:', args);

      const pythonProcess = spawn('python3', args);
      this.activeProcesses.set(jobId, pythonProcess);

      let stdout = '';
      let stderr = '';
      let lastProgress = 10;

      pythonProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Job ${jobId}] ${output}`);

        // Parse progress
        const progressMatch = output.match(/Progress.*?(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = Math.min(95, parseInt(progressMatch[1]));
          if (progress > lastProgress) {
            lastProgress = progress;
            await job.update({ progress });
          }
        }

        // Update metadata with logs - ensure metadata is an object
        try {
          let metadata = job.metadata;
          
          // If metadata is a string, parse it
          if (typeof metadata === 'string') {
            metadata = JSON.parse(metadata);
          }
          
          // If metadata is null/undefined, create new object
          if (!metadata || typeof metadata !== 'object') {
            metadata = {};
          }
          
          // Initialize logs array if it doesn't exist
          if (!Array.isArray(metadata.logs)) {
            metadata.logs = [];
          }
          
          metadata.logs.push(output);
          await job.update({ metadata });
        } catch (err) {
          console.error('Error updating metadata:', err);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error(`[Job ${jobId}] Error: ${error}`);
      });

      pythonProcess.on('close', (code) => {
        this.activeProcesses.delete(jobId);

        if (code === 0) {
          try {
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const results = JSON.parse(lastLine);
            
            console.log(`✅ Job ${jobId} completed:`, {
              counted: results.total_counted,
              images: results.images_captured,
              frames: results.frames_processed
            });
            
            resolve(results);
          } catch (err) {
            reject(new Error(`Failed to parse Python output: ${err.message}\nOutput: ${stdout}`));
          }
        } else {
          reject(new Error(`Python process exited with code ${code}\nError: ${stderr}`));
        }
      });

      pythonProcess.on('error', (err) => {
        this.activeProcesses.delete(jobId);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId) {
    const pythonProcess = this.activeProcesses.get(jobId);
    
    if (pythonProcess) {
      pythonProcess.kill('SIGTERM');
      this.activeProcesses.delete(jobId);
    }

    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    if (job) {
      await job.update({
        status: 'cancelled',
        completed_at: new Date()
      });
    }
  }

  /**
   * Delete a job and associated files
   */
  async deleteJob(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Delete associated files
    try {
      // Delete uploaded video
      if (job.file_path && fsSync.existsSync(job.file_path)) {
        await fs.unlink(job.file_path);
      }
      
      // Delete output video
      const outputPath = job.results?.outputVideoPath;
      if (outputPath && fsSync.existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }

      // Delete captured images directory
      const imageDir = this.getJobImageDir(jobId);
      if (fsSync.existsSync(imageDir)) {
        await fs.rm(imageDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Error deleting files:', err);
    }

    await job.destroy();
  }

  /**
   * Get images for a job
   */
  async getJobImages(jobId) {
    try {
      const imageDir = this.getJobImageDir(jobId);
      
      if (!fsSync.existsSync(imageDir)) {
        return [];
      }

      const files = await fs.readdir(imageDir);
      const images = files
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
        .map(file => ({
          filename: file,
          path: path.join(imageDir, file),
          url: `/object-counting/job/${jobId}/image/${file}`
        }));

      return images;
    } catch (error) {
      console.error('Error getting job images:', error);
      return [];
    }
  }

  /**
   * Get statistics for object counting jobs
   */
  async getStats(userId, options = {}) {
    try {
      const where = { user_id: userId };

      if (options.startDate || options.endDate) {
        where.created_at = {};
        if (options.startDate) where.created_at[Op.gte] = new Date(options.startDate);
        if (options.endDate) where.created_at[Op.lte] = new Date(options.endDate);
      }

      if (options.branchId) where.branch_id = options.branchId;

      const jobs = await ObjectCountingJob.findAll({ where });

      const stats = {
        total_jobs: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        processing: jobs.filter(j => j.status === 'processing').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        total_objects_counted: jobs.reduce((sum, j) => sum + (j.total_count || 0), 0),
        total_frames_processed: jobs.reduce((sum, j) => sum + (j.frames_processed || 0), 0),
        total_images_captured: jobs.reduce((sum, j) => sum + (j.metadata?.images_captured || 0), 0),
        average_processing_time: 0
      };

      const completedJobs = jobs.filter(j => j.processing_time);
      if (completedJobs.length > 0) {
        stats.average_processing_time = 
          completedJobs.reduce((sum, j) => sum + j.processing_time, 0) / completedJobs.length;
      }

      return stats;
    } catch (error) {
      console.error('Get stats error:', error);
      throw error;
    }
  }

  /**
   * Save job results to PeopleCount table
   */
  async saveToPeopleCount(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    
    if (!job || job.status !== 'completed') {
      throw new Error('Job not found or not completed');
    }

    const { PeopleCount } = require('../models');
    const detections = job.results?.detections || [];
    
    const savedRecords = [];
    
    for (const detection of detections) {
      try {
        const record = await PeopleCount.create({
          branch_id: job.branch_id,
          zone_id: job.zone_id,
          camera_id: job.camera_id,
          person_id: detection.object_id,
          direction: detection.direction === 'DOWN' ? 'IN' : 'OUT',
          detection_time: detection.timestamp,
          confidence_score: detection.confidence,
          metadata: {
            source: 'object_counting_job',
            job_id: jobId,
            bbox: detection.position,
            class: detection.class,
            captured_image: detection.captured_image?.path
          }
        });
        savedRecords.push(record);
      } catch (err) {
        console.error('Error saving detection:', err);
      }
    }

    return {
      saved: savedRecords.length,
      total: detections.length
    };
  }

  /**
   * Format job for API response
   */
  formatJob(job) {
    const jobData = job.toJSON ? job.toJSON() : job;
    
    return {
      id: jobData.job_id,
      userId: jobData.user_id,
      branchId: jobData.branch_id,
      zoneId: jobData.zone_id,
      cameraId: jobData.camera_id,
      source: jobData.source_type,
      fileName: jobData.file_name,
      filePath: jobData.file_path,
      streamUrl: jobData.stream_url,
      duration: jobData.duration,
      modelType: jobData.model_type,
      status: jobData.status,
      progress: jobData.progress,
      totalCount: jobData.total_count,
      framesProcessed: jobData.frames_processed,
      processingTime: jobData.processing_time,
      errorMessage: jobData.error_message,
      results: jobData.results,
      metadata: jobData.metadata,
      uploadedAt: jobData.created_at,
      startedAt: jobData.started_at,
      completedAt: jobData.completed_at,
      imagesCaptured: jobData.metadata?.images_captured || 0,
      imageOutputDir: jobData.results?.imageOutputDirectory
    };
  }

  /**
   * Stop all active processing
   */
  stopAllProcessing() {
    for (const [jobId, process] of this.activeProcesses.entries()) {
      console.log(`Stopping job ${jobId}...`);
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }
}

module.exports = new ObjectCountingService();