// backend/src/services/objectCountingService.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ObjectCountingJob } = require('../models');
const { Op } = require('sequelize');
const { error } = require('console');

class ObjectCountingService {
  constructor() {
    this.activeProcesses = new Map();

    // Use absolute path to python script
    this.pythonScript = path.resolve(__dirname, '../../../ai-module/src/models/object_counter.py');

    if (!fsSync.existsSync(this.pythonScript)) {
      console.warn("⚠️ Python script not found at:", this.pythonScript);
    } else {
      console.log("✅ Using Python script path:", this.pythonScript);
    }

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

  getJobImageDir(jobId) {
    return path.join(this.imagesDir, jobId);
  }

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

  async createJob(jobData) {
    try {
      const jobId = uuidv4();
      const metadata = {
        camera_name: jobData.cameraName,
        uploaded_at: new Date().toISOString(),
        capture_images: jobData.captureImages !== false,
        image_output_dir: this.getJobImageDir(jobId)
      };

      const job = await ObjectCountingJob.create({
        job_id: jobId,
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
        metadata
      });

      return this.formatJob(job);
    } catch (error) {
      console.error('Create job error:', error);
      throw error;
    }
  }

  async getJob(jobId) {
    try {
      const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
      return job ? this.formatJob(job) : null;
    } catch (error) {
      console.error('Get job error:', error);
      throw error;
    }
  }

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

  async processJob(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    if (!job) throw new Error('Job not found');

    try {
      await job.update({ status: 'processing', progress: 10, started_at: new Date() });

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

  runPythonCounter(videoSource, jobId, outputPath, imageOutputDir, job) {
    return new Promise((resolve, reject) => {
      if (!fsSync.existsSync(this.pythonScript)) {
        reject(new Error('Python script not found: ' + this.pythonScript));
        return;
      }

      const args = [this.pythonScript, videoSource];
      if (outputPath) args.push(outputPath);

      if (job.model_type) {
        args.push('--model', job.model_type);
      }

      const captureImages = job.metadata?.capture_images !== false;
      if (captureImages) {
        args.push('--images', imageOutputDir);
      }

      if (job.metadata?.confidence) {
        args.push('--confidence', String(job.metadata.confidence));
      }

      console.log('🐍 Running Python (python3) with args:', args);

      // spawn python3 explicitly (server has python3)
      const pythonProcess = spawn('python3', args, { env: process.env });

      this.activeProcesses.set(jobId, pythonProcess);

      let stdout = '';
      let stderr = '';
      let lastProgress = 10;

      pythonProcess.stdout.on('data', async (data) => {
        const output = data.toString();
        stdout += output;
        // console.log(`[Job ${jobId} stdout]`, output);

        // try parse progress lines that we might have emitted to stderr only;
        // but if python ever writes progress to stdout (shouldn't), handle it.
        const progressMatch = output.match(/Progress.*?(\d+\.?\d*)%/);
        if (progressMatch) {
          const progress = Math.min(95, parseInt(progressMatch[1]));
          if (progress > lastProgress) {
            lastProgress = progress;
            try { await job.update({ progress }); } catch (e) { /* ignore */ }
          }
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        // append to job.metadata.logs
        (async () => {
          try {
            let metadata = job.metadata;
            if (typeof metadata === 'string') {
              metadata = JSON.parse(metadata);
            }
            if (!metadata || typeof metadata !== 'object') metadata = {};
            if (!Array.isArray(metadata.logs)) metadata.logs = [];
            metadata.logs.push(error);
            await job.update({ metadata });
          } catch (err) {
            console.error('Error updating metadata logs:', err);
          }
        })();
        console.error(`[Job ${jobId} stderr]`, error);
      });

      pythonProcess.on('close', async (code) => {
        this.activeProcesses.delete(jobId);

        if (code === 0) {
          try {
            // stdout should be a final JSON line (as designed). We'll attempt to parse last non-empty line.
            const lines = stdout.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
            let jsonLine = null;
            if (lines.length > 0) {
              jsonLine = lines[lines.length - 1];
            }

            let results = null;
            if (jsonLine) {
              try {
                results = JSON.parse(jsonLine);
              } catch (err) {
                // fallback: try to find JSON substring anywhere in stdout
                const jsonMatch = stdout.match(/\{[\s\S]*\}$/);
                if (jsonMatch) {
                  results = JSON.parse(jsonMatch[0]);
                } else {
                  throw new Error('Failed to parse JSON from python stdout');
                }
              }
            } else {
              // no stdout lines, maybe python printed to stderr. attempt parse stderr
              const jsonMatchErr = stderr.match(/\{[\s\S]*\}$/);
              if (jsonMatchErr) {
                results = JSON.parse(jsonMatchErr[0]);
              } else {
                throw new Error('No JSON output from python script');
              }
            }

            console.log(`✅ Job ${jobId} completed: counted=${results.total_counted} images=${results.images_captured} frames=${results.frames_processed}`);
            resolve(results);
          } catch (err) {
            reject(new Error(`Failed to parse Python output: ${err.message}\nStdout: ${stdout}\nStderr: ${stderr}`));
          }
        } else {
          reject(new Error(`Python process exited with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`));
        }
      });

pythonProcess.on('error', (err) => {
    this.activeProcesses.delete(jobId);
    console.error(err);        // ✅ FIXED
    reject(new Error(`Failed to start Python process: ${err.message}`));
});

    });
  }

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

  async deleteJob(jobId) {
    const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
    if (!job) throw new Error('Job not found');

    try {
      if (job.file_path && fsSync.existsSync(job.file_path)) {
        await fs.unlink(job.file_path);
      }
      const outputPath = job.results?.outputVideoPath || path.join(this.resultsDir, `${jobId}_output.mp4`);
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

  async getJobImages(jobId) {
    try {
      const imageDir = this.getJobImageDir(jobId);
      if (!fsSync.existsSync(imageDir)) return [];
      const files = await fs.readdir(imageDir);
      return files.filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => ({
        filename: f,
        path: path.join(imageDir, f),
        url: `/object-counting/job/${jobId}/image/${f}`
      }));
    } catch (err) {
      console.error('Error getting job images:', err);
      return [];
    }
  }

  stopAllProcessing() {
    for (const [jobId, process] of this.activeProcesses.entries()) {
      console.log(`Stopping job ${jobId}...`);
      process.kill('SIGTERM');
    }
    this.activeProcesses.clear();
  }
}

module.exports = new ObjectCountingService();
