// backend/src/services/objectCountingService.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { v4: uuidv4 } = require('uuid');
const { ObjectCountingJob } = require('../models');
const { Op } = require('sequelize');
const { error } = require('console');

const runLineCounter = require("./python/runLineCounter");
const runObjectCounter = require("./python/runObjectCounter");


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

  // In objectCountingService.js - Update createJob method

  async createJob(jobData) {
    try {
      const jobId = uuidv4();
      
      const metadata = {
        camera_name: jobData.cameraName,
        uploaded_at: new Date().toISOString(),
        capture_images: jobData.captureImages !== false,
        image_output_dir: this.getJobImageDir(jobId),
        // NEW: line_type and line_position
        line_type: jobData.line_type || 'horizontal',
        line_position: jobData.line_position || 300,
        confidence: jobData.confidence || 0.3,
        class_id: jobData.class_id !== undefined ? jobData.class_id : -1
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

      console.log(`✅ Created job with line_type=${metadata.line_type}, line_position=${metadata.line_position}`);

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

 // In objectCountingService.js - Replace the processJob method

async processJob(jobId) {
  const job = await ObjectCountingJob.findOne({ where: { job_id: jobId } });
  if (!job) throw new Error('Job not found');

  try {
    await job.update({ status: 'processing', progress: 10, started_at: new Date() });

    const videoSource = job.file_path || job.stream_url;
    const outputPath = path.join(this.resultsDir, `${jobId}_output.mp4`);
    const imageOutputDir = this.getJobImageDir(jobId);

    let results;

    if (job.model_type === "line" || job.model_type === "conveyor") {
      const lineType = job.metadata?.line_type || 'horizontal';
      const linePosition = job.metadata?.line_position || 300;
      const classId = job.metadata?.class_id !== undefined ? job.metadata.class_id : -1;
      const conf = job.metadata?.confidence || 0.3;
      const duration = job.duration; // ✅ Get duration from job
      
      console.log(`🎯 Processing with line_type=${lineType}, line_position=${linePosition}, duration=${duration}s`);
      
      // ✅ For stream jobs, we need to handle duration differently
      if (job.source_type === 'stream' && duration) {
        console.log(`⏱️ Stream job with ${duration} second duration`);
        
        // Create a temporary video file from the stream with duration limit
        const tempVideoPath = path.join(this.resultsDir, `${jobId}_temp.mp4`);
        
        try {
          // Capture stream for specified duration
          await this.captureStreamVideo(videoSource, tempVideoPath, duration);
          console.log(`✅ Captured ${duration}s of stream to temporary file`);
          
          // Now process the captured video
          results = await runLineCounter(tempVideoPath, outputPath, {
            lineType: lineType,
            linePosition: linePosition,
            mode: "object",
            classId: classId,
            confidence: conf
          });
          
          // Clean up temp file
          const fs = require('fs');
          if (fs.existsSync(tempVideoPath)) {
            fs.unlinkSync(tempVideoPath);
            console.log('✅ Cleaned up temporary video file');
          }
        } catch (captureError) {
          console.error('❌ Stream capture error:', captureError);
          throw new Error(`Failed to capture stream: ${captureError.message}`);
        }
      } else {
        // Regular file processing
        results = await runLineCounter(videoSource, outputPath, {
          lineType: lineType,
          linePosition: linePosition,
          mode: "object",
          classId: classId,
          confidence: conf
        });
      }
    } else {
      results = await runObjectCounter(
        videoSource,
        outputPath,
        imageOutputDir,
        job
      );
    }

    await job.update({
      status: 'completed',
      progress: 100,
      completed_at: new Date(),
      results: {
        ...results,
        outputVideoPath: outputPath,
        imageOutputDirectory: imageOutputDir,
        output_video: `/object-counting/job/${jobId}/download?format=video` // ✅ Add download URL
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
 * ✅ OPTIMIZED: Capture stream video for specified duration using FFmpeg
 */
captureStreamVideo(streamUrl, outputPath, duration) {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    
    console.log(`📹 Capturing ${duration}s from stream: ${streamUrl}`);
    
    // ✅ OPTIMIZED FFmpeg command for MJPEG streams
    const ffmpeg = spawn('ffmpeg', [
      '-f', 'mjpeg',           // Input format
      '-i', streamUrl,
      '-t', duration.toString(), 
      '-c:v', 'libx264',       // Re-encode to H.264 (more compatible)
      '-preset', 'ultrafast',  // Fast encoding
      '-crf', '28',            // Quality (lower = better, 18-28 is good)
      '-r', '10',              // Limit to 10 fps (faster processing)
      '-an',                   // No audio
      '-y',                    // Overwrite
      outputPath
    ]);

    let stderr = '';
    let lastProgressTime = Date.now();
    let hasStarted = false;

    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      
      // Detect if capture has started
      if (!hasStarted && stderr.includes('Stream mapping:')) {
        hasStarted = true;
        console.log('✅ Stream capture started successfully');
      }
      
      // Log progress every 2 seconds
      const now = Date.now();
      if (now - lastProgressTime > 2000) {
        const timeMatch = stderr.match(/time=(\d+:\d+:\d+)/);
        if (timeMatch) {
          console.log(`📹 Capture progress: ${timeMatch[1]}`);
          lastProgressTime = now;
        }
      }
    });

    ffmpeg.on('close', (code) => {
      // Code 0 or null (killed by timeout) are both OK
      if (code === 0 || code === null) {
        const fs = require('fs');
        if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
          console.log(`✅ Stream capture completed: ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error('Capture failed: output file is empty or missing'));
        }
      } else {
        console.error(`❌ FFmpeg capture failed with code ${code}`);
        console.error('FFmpeg stderr:', stderr);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      console.error('❌ FFmpeg spawn error:', err);
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });

    // ✅ Timeout with force kill after duration + 10 seconds
    const timeoutMs = (duration + 10) * 1000;
    setTimeout(() => {
      if (!hasStarted) {
        console.error('❌ Stream never started - possible network issue');
        try { ffmpeg.kill('SIGKILL'); } catch (e) {}
        reject(new Error('Stream capture timeout - check network connection'));
      } else {
        console.log('⏰ Timeout reached, stopping capture...');
        try { ffmpeg.kill('SIGTERM'); } catch (e) {}
        // Give it a moment to finish
        setTimeout(() => {
          const fs = require('fs');
          if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
            resolve(outputPath);
          } else {
            reject(new Error('Timeout but no valid output file'));
          }
        }, 2000);
      }
    }, timeoutMs);
  });
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


  /**
   * Test if a camera stream is accessible
   */
  async testCameraStream(cameraId) {
    try {
      const response = await fetch(`${this.baseUrl}/test-camera-stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ camera_id: cameraId })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Test camera stream error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Get camera snapshot URL
   */
  getCameraSnapshotUrl(cameraId) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return `${this.baseUrl}/camera/${cameraId}/snapshot?token=${token}`;
  }

  /**
   * Start stream with all parameters including zone_id
   */
  async startStream(streamData) {
    try {
      const payload = {
        camera_id: streamData.camera_id,
        duration: streamData.duration || 60,
        model_type: streamData.model_type || 'line',
        capture_images: streamData.capture_images !== false,
        line_type: streamData.line_type || 'horizontal',
        line_position: streamData.line_position || 300,
        confidence: streamData.confidence || 0.3,
        class_id: streamData.class_id !== undefined ? streamData.class_id : -1,
        // ✅ Include zone_id and branch_id if provided
        zone_id: streamData.zone_id,
        branch_id: streamData.branch_id
      };

      console.log('📡 Starting stream with payload:', payload);

      const response = await fetch(`${this.baseUrl}/stream`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Start stream error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Stop both stream and processing job
   * @param {string} streamId - Active stream ID
   * @param {string} jobId - Active processing job ID (optional)
   */
  async stopStreamAndJob(streamId, jobId) {
    try {
      const payload = {};
      if (streamId) payload.stream_id = streamId;
      if (jobId) payload.job_id = jobId;

      console.log('🛑 Stopping stream and job:', payload);

      const response = await fetch(`${this.baseUrl}/stream/stop`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Stop stream/job error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }



}

module.exports = new ObjectCountingService();