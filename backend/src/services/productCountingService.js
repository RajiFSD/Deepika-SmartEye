/**
 * Product Counting Service
 * Handles product detection and counting with YOLO
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ObjectCountingJob } = require('../models');
const { Op } = require('sequelize');

class ProductCountingService {
  constructor() {
    this.activeProcesses = new Map();
    
    // Path to Python script
    this.pythonScript = path.resolve('D:\\Web APP\\Smarteye\\ai-module\\src\\models\\product_counter.py');
    
    // Directories
    this.resultsDir = path.join(__dirname, '../uploads/product-counting/results');
    this.imagesDir = path.join(__dirname, '../uploads/product-counting/images');
    
    console.log('📦 Product Counter initialized');
    console.log('📍 Python script:', this.pythonScript);
    
    this.ensureDirectories();
  }

  async ensureDirectories() {
    const dirs = [
      path.join(__dirname, '../uploads/product-counting'),
      this.resultsDir,
      this.imagesDir,
      path.join(__dirname, '../uploads/product-counting/temp')
    ];
    
    for (const dir of dirs) {
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Create a new product counting job
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
        model_type: 'yolo',
        status: 'queued',
        progress: 0,
        metadata: {
          camera_name: jobData.cameraName,
          uploaded_at: new Date().toISOString(),
          capture_images: jobData.captureImages !== false,
          image_output_dir: this.getJobImageDir(jobData.jobId || uuidv4()),
          detection_type: 'product_counting'
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

      let videoSource = job.file_path || job.stream_url;
      const outputPath = path.join(this.resultsDir, `${jobId}_output.mp4`);
      const imageOutputDir = this.getJobImageDir(jobId);

      // Determine mode
      const mode = job.file_path ? 'video' : 'stream';

      const results = await this.runPythonCounter(
        mode,
        videoSource,
        jobId,
        outputPath,
        imageOutputDir,
        job
      );

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
          images_captured: results.images_captured,
          product_counts: results.product_counts
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
   * Run Python product counter script
   */
  runPythonCounter(mode, videoSource, jobId, outputPath, imageOutputDir, job) {
    return new Promise((resolve, reject) => {
      if (!fsSync.existsSync(this.pythonScript)) {
        reject(new Error('Python script not found: ' + this.pythonScript));
        return;
      }

      const args = [
        this.pythonScript,
        mode,
        videoSource,
        '--output', outputPath,
        '--images', imageOutputDir
      ];

      console.log('🚀 Running Python with args:', args);

      const pythonProcess = spawn('python', args);
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

        // Update metadata with logs
        try {
          let metadata = job.metadata || {};
          if (typeof metadata === 'string') {
            metadata = JSON.parse(metadata);
          }
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
              total_counted: results.total_counted,
              product_counts: results.product_counts,
              images: results.images_captured
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
   * Process single image
   */
  async processImage(imagePath, userId) {
    try {
      const jobId = uuidv4();
      const outputPath = path.join(this.resultsDir, `${jobId}_output.jpg`);

      const args = [
        this.pythonScript,
        'image',
        imagePath,
        '--output', outputPath
      ];

      return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', args);
        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            try {
              const lines = stdout.trim().split('\n');
              const lastLine = lines[lines.length - 1];
              const results = JSON.parse(lastLine);
              results.outputImagePath = outputPath;
              resolve(results);
            } catch (err) {
              reject(new Error(`Failed to parse results: ${err.message}`));
            }
          } else {
            reject(new Error(`Process failed: ${stderr}`));
          }
        });
      });
    } catch (error) {
      console.error('Image processing error:', error);
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
          url: `/product-counting/job/${jobId}/image/${file}`
        }));

      return images;
    } catch (error) {
      console.error('Error getting job images:', error);
      return [];
    }
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
   * Delete a job
   */
  async deleteJob(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    
    if (!job) {
      throw new Error('Job not found');
    }

    // Delete files
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
      console.error('Error deleting files:', err);
    }

    await job.destroy();
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
      status: jobData.status,
      progress: jobData.progress,
      totalCount: jobData.total_count,
      results: jobData.results,
      metadata: jobData.metadata,
      uploadedAt: jobData.created_at,
      completedAt: jobData.completed_at
    };
  }
}

module.exports = new ProductCountingService();