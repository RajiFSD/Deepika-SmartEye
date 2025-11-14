/**
 * Object Counting Service with Enhanced Debugging
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

    // ✅ Verify Python script exists
    this.pythonScript = path.resolve(__dirname, "../../../ai-module/src/models/object_counter.py");
    
    console.log('🔍 Checking Python script at:', this.pythonScript);
    
    if (!fsSync.existsSync(this.pythonScript)) {
      console.error('❌ Python script NOT FOUND at:', this.pythonScript);
      console.log('📁 Current directory:', __dirname);
      console.log('📁 Looking for script at:', this.pythonScript);
    } else {
      console.log('✅ Python script found at:', this.pythonScript);
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
          image_output_dir: this.getJobImageDir(jobData.jobId || uuidv4()),
          logs: []
        }
      });

      return this.formatJob(job);
    } catch (error) {
      console.error('❌ Create job error:', error);
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
      console.error('❌ Get job error:', error);
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
      console.error('❌ Get jobs error:', error);
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
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Starting job ${jobId}`);
      console.log(`📹 Source: ${job.file_path || job.stream_url}`);
      console.log(`${'='.repeat(60)}\n`);

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

      console.log(`\n✅ Job ${jobId} completed successfully!`);
      return this.formatJob(job);
    } catch (error) {
      console.error(`\n❌ Job ${jobId} processing error:`, error);
      await job.update({
        status: 'failed',
        completed_at: new Date(),
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Run Python object counter script with enhanced logging
   */
  runPythonCounter(videoSource, jobId, outputPath, imageOutputDir, job) {
    return new Promise((resolve, reject) => {
      // Verify Python script exists
      if (!fsSync.existsSync(this.pythonScript)) {
        reject(new Error(`Python script not found at: ${this.pythonScript}`));
        return;
      }

      // Verify video source exists
      if (!videoSource.startsWith('http') && !fsSync.existsSync(videoSource)) {
        reject(new Error(`Video source not found: ${videoSource}`));
        return;
      }

      const args = [this.pythonScript, videoSource, outputPath, '--images', imageOutputDir];
      
      console.log('🐍 Running Python command:');
      console.log(`   python ${args.join(' ')}`);
      console.log('');

      const pythonProcess = spawn('python', args);
      this.activeProcesses.set(jobId, pythonProcess);

      let stdout = '';
      let stderr = '';
      let lastProgress = 10;
      let lastLogTime = Date.now();

      pythonProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        stdout += output;
        
        // Log every line
        console.log(`[Job ${jobId}] ${output.trim()}`);

        // Parse progress with more patterns
        const progressPatterns = [
          /Progress.*?(\d+\.?\d*)%/i,
          /Frame.*?(\d+).*?\/.*?(\d+)/i,
          /Processing.*?(\d+\.?\d*)%/i
        ];

        for (const pattern of progressPatterns) {
          const match = output.match(pattern);
          if (match) {
            let progress;
            if (match[2]) {
              // Frame X / Total pattern
              progress = Math.min(95, (parseInt(match[1]) / parseInt(match[2])) * 100);
            } else {
              progress = Math.min(95, parseFloat(match[1]));
            }
            
            if (progress > lastProgress && progress - lastProgress >= 5) {
              lastProgress = Math.floor(progress);
              console.log(`📊 Progress update: ${lastProgress}%`);
              await job.update({ progress: lastProgress });
            }
            break;
          }
        }

        // Update logs every 5 seconds
        const now = Date.now();
        if (now - lastLogTime > 5000) {
          lastLogTime = now;
          try {
            let metadata = job.metadata || {};
            if (typeof metadata === 'string') metadata = JSON.parse(metadata);
            if (!metadata.logs) metadata.logs = [];
            metadata.logs.push(`[${new Date().toISOString()}] ${output.trim()}`);
            
            // Keep only last 50 log entries
            if (metadata.logs.length > 50) {
              metadata.logs = metadata.logs.slice(-50);
            }
            
            await job.update({ metadata });
          } catch (err) {
            console.error('❌ Error updating logs:', err);
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        console.error(`[Job ${jobId}] ⚠️  ${error.trim()}`);
      });

      pythonProcess.on('close', (code) => {
        this.activeProcesses.delete(jobId);

        console.log(`\n[Job ${jobId}] Python process exited with code ${code}`);

        if (code === 0) {
          try {
            // Parse JSON from last line
            const lines = stdout.trim().split('\n');
            let results = null;
            
            // Try to find JSON in last few lines
            for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
              try {
                results = JSON.parse(lines[i]);
                break;
              } catch (e) {
                // Continue to next line
              }
            }

            if (!results) {
              throw new Error('Could not find valid JSON results in output');
            }
            
            console.log(`✅ Job ${jobId} completed:`, {
              counted: results.total_counted,
              images: results.images_captured,
              frames: results.frames_processed
            });
            
            resolve(results);
          } catch (err) {
            console.error('❌ Failed to parse results:', err);
            console.log('📄 Last 5 lines of output:');
            const lines = stdout.trim().split('\n');
            lines.slice(-5).forEach(line => console.log('  ', line));
            
            reject(new Error(`Failed to parse Python output: ${err.message}`));
          }
        } else {
          console.error('❌ Python process failed');
          console.error('📄 stderr output:', stderr);
          reject(new Error(`Python process exited with code ${code}\nError: ${stderr}`));
        }
      });

      pythonProcess.on('error', (err) => {
        this.activeProcesses.delete(jobId);
        console.error(`❌ Failed to start Python process:`, err);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      });

      // Timeout after 30 minutes
      setTimeout(() => {
        if (this.activeProcesses.has(jobId)) {
          console.error(`⏰ Job ${jobId} timeout after 30 minutes`);
          pythonProcess.kill('SIGTERM');
          this.activeProcesses.delete(jobId);
          reject(new Error('Processing timeout after 30 minutes'));
        }
      }, 30 * 60 * 1000);
    });
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId) {
    const pythonProcess = this.activeProcesses.get(jobId);
    
    if (pythonProcess) {
      console.log(`🛑 Cancelling job ${jobId}...`);
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

      const imageDir = this.getJobImageDir(jobId);
      if (fsSync.existsSync(imageDir)) {
        await fs.rm(imageDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('❌ Error deleting files:', err);
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
      console.error('❌ Error getting job images:', error);
      return [];
    }
  }

  /**
   * Get statistics
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
      console.error('❌ Get stats error:', error);
      throw error;
    }
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
      console.log(`🛑 Stopping job ${jobId}...`);
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }
}

module.exports = new ObjectCountingService();