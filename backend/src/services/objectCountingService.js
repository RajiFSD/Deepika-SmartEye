/**
 * Object Counting Service
 * Handles business logic for object detection and counting
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
    this.pythonScript = path.join(__dirname, '../python/object_counter.py');
    this.resultsDir = path.join(__dirname, '../uploads/object-counting/results');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      path.join(__dirname, '../uploads/object-counting'),
      this.resultsDir,
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
        source_type: jobData.source, // 'upload' or 'stream'
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
          uploaded_at: new Date().toISOString()
        }
      });

      return this.formatJob(job);
    } catch (error) {
      console.error('Create job error:', error);
      throw error;
    }
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

      const results = await this.runPythonCounter(videoSource, jobId, outputPath, job);

      // Update job with results
      await job.update({
        status: 'completed',
        progress: 100,
        completed_at: new Date(),
        results: {
          ...results,
          outputVideoPath: outputPath
        },
        total_count: results.total_counted,
        frames_processed: results.frames_processed,
        processing_time: results.processing_time
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
   * Run Python object counter script
   */
  runPythonCounter(videoSource, jobId, outputPath, job) {
    return new Promise((resolve, reject) => {
      if (!fsSync.existsSync(this.pythonScript)) {
        reject(new Error('Python script not found: ' + this.pythonScript));
        return;
      }

      const args = [this.pythonScript, videoSource, outputPath];
      
      // Add model type if specified
      if (job.model_type) {
        args.push('--model', job.model_type);
      }

      const pythonProcess = spawn('python', args);
      this.activeProcesses.set(jobId, pythonProcess);

      let stdout = '';
      let stderr = '';
      let lastProgress = 10;

      pythonProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        stdout += output;
        console.log(`[Job ${jobId}] ${output}`);

        // Parse progress from output
        const progressMatch = output.match(/Progress.*?(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = Math.min(95, parseInt(progressMatch[1]));
          if (progress > lastProgress) {
            lastProgress = progress;
            await job.update({ progress });
          }
        }

        // Update metadata with logs
        const metadata = job.metadata || {};
        metadata.logs = metadata.logs || [];
        metadata.logs.push(output);
        await job.update({ metadata });
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
            // Parse the last JSON output from Python
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1];
            const results = JSON.parse(lastLine);
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
      if (job.file_path && fsSync.existsSync(job.file_path)) {
        await fs.unlink(job.file_path);
      }
      
      const outputPath = job.results?.outputVideoPath;
      if (outputPath && fsSync.existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
    } catch (err) {
      console.error('Error deleting files:', err);
    }

    await job.destroy();
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
            class: detection.class
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
      completedAt: jobData.completed_at
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