// controllers/uploadAnalysisController.js
const uploadAnalysisService = require('@services/uploadAnalysisService');
const { PluginJob } = require('@models');
const { v4: uuidv4 } = require('uuid');

class UploadAnalysisController {
  async uploadFile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { camera_id, branch_id, zone_id } = req.body;
      const user = req.user; // From auth middleware

      const result = await uploadAnalysisService.uploadFileForAnalysis({
        file: req.file,
        user_id: user.user_id,
        tenant_id: user.tenant_id,
        camera_id: camera_id || null,
        branch_id: branch_id || null,
        zone_id: zone_id || null
      });

      return res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: result
      });
    } catch (error) {
      console.error('Upload error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload file'
      });
    }
  }

  async analyzeFile(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const result = await uploadAnalysisService.startAnalysis(jobId, user.tenant_id);

      return res.status(200).json({
        success: true,
        message: 'Analysis started successfully',
        data: result
      });
    } catch (error) {
      console.error('Analysis error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to start analysis'
      });
    }
  }

  async getAllJobs(req, res) {
    try {
      const { page = 1, limit = 10, status, plugin_type } = req.query;
      const user = req.user;

      const jobs = await uploadAnalysisService.getAllJobs({
        tenant_id: user.tenant_id,
        page,
        limit,
        status,
        plugin_type
      });

      return res.status(200).json({
        success: true,
        data: jobs
      });
    } catch (error) {
      console.error('Get jobs error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve jobs'
      });
    }
  }

  async getJobById(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const job = await uploadAnalysisService.getJobById(jobId, user.tenant_id);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: job
      });
    } catch (error) {
      console.error('Get job error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve job'
      });
    }
  }

  async getJobResults(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const results = await uploadAnalysisService.getJobResults(jobId, user.tenant_id);

      if (!results) {
        return res.status(404).json({
          success: false,
          message: 'Job results not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Get results error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve job results'
      });
    }
  }

  async getJobDetections(req, res) {
    try {
      const { jobId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const user = req.user;

      const detections = await uploadAnalysisService.getJobDetections(
        jobId, 
        user.tenant_id, 
        { page, limit }
      );

      return res.status(200).json({
        success: true,
        data: detections
      });
    } catch (error) {
      console.error('Get detections error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve job detections'
      });
    }
  }

  async deleteJob(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      await uploadAnalysisService.deleteJob(jobId, user.tenant_id);

      return res.status(200).json({
        success: true,
        message: 'Job deleted successfully'
      });
    } catch (error) {
      console.error('Delete job error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete job'
      });
    }
  }

async startStreamAnalysis(req, res) {
    try {
      const { stream_url, camera_id } = req.body;
      const user = req.user;

      if (!stream_url) {
        return res.status(400).json({
          success: false,
          message: 'Stream URL is required'
        });
      }

      // Create a streaming job
      const job_id = uuidv4();
      const job = await PluginJob.create({
        job_id,
        tenant_id: user.tenant_id,
        user_id: user.user_id,
        camera_id: camera_id || null,
        plugin_type: 'people_counting',
        input_type: 'stream',
        input_path: stream_url,
        status: 'processing',
        started_at: new Date(),
        created_at: new Date()
      });

      console.log(`📹 Started stream analysis job ${job_id} for URL: ${stream_url}`);

      // Start stream processing in background
      this.processStreamAnalysis(job).catch(error => {
        console.error('❌ Stream analysis error:', error);
        this.handleStreamAnalysisError(job.job_id, error.message);
      });

      return res.status(201).json({
        success: true,
        message: 'Stream analysis started successfully',
        data: {
          job_id: job.job_id,
          status: 'processing',
          stream_url: stream_url,
          camera_id: camera_id
        }
      });
    } catch (error) {
      console.error('Stream start error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to start stream analysis'
      });
    }
  }

async stopStreamAnalysis(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const job = await PluginJob.findOne({
        where: { job_id: jobId, tenant_id: user.tenant_id }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Stream job not found'
        });
      }

      if (job.input_type !== 'stream') {
        return res.status(400).json({
          success: false,
          message: 'This job is not a stream analysis job'
        });
      }

      // Update job status to completed
      await job.update({
        status: 'completed',
        completed_at: new Date()
      });

      console.log(`⏹️ Stopped stream analysis job ${jobId}`);

      return res.status(200).json({
        success: true,
        message: 'Stream analysis stopped successfully',
        data: {
          job_id: job.job_id,
          status: 'completed'
        }
      });
    } catch (error) {
      console.error('Stream stop error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to stop stream analysis'
      });
    }
  }

async getStreamCounts(req, res) {
    try {
      const { jobId } = req.params;
      const user = req.user;

      const job = await PluginJob.findOne({
        where: { job_id: jobId, tenant_id: user.tenant_id }
      });

      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Stream job not found'
        });
      }

      // Return current counts from job results
      const counts = job.result_json || {
        entries: 0,
        exits: 0,
        totalDetections: 0,
        netCount: 0
      };

      return res.status(200).json({
        success: true,
        data: counts
      });
    } catch (error) {
      console.error('Stream counts error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get stream counts'
      });
    }
  }

// Background stream processing (simulated for now)
async processStreamAnalysis(job) {
    console.log(`📹 Processing stream analysis for job ${job.job_id}: ${job.input_path}`);
    
    let detectionCount = 0;
    let entries = 0;
    let exits = 0;
    
    // Simulate stream processing with periodic updates
    const interval = setInterval(async () => {
      try {
        const currentJob = await PluginJob.findOne({
          where: { job_id: job.job_id }
        });
        
        if (!currentJob || currentJob.status !== 'processing') {
          clearInterval(interval);
          return;
        }
        
        // Simulate detecting people in the stream
        const newDetections = Math.floor(Math.random() * 3); // 0-2 new detections per interval
        detectionCount += newDetections;
        
        // Simulate entries and exits
        const newEntries = Math.floor(newDetections * 0.7); // 70% entries
        const newExits = Math.floor(newDetections * 0.3); // 30% exits
        
        entries += newEntries;
        exits += newExits;
        
        const summary = {
          entries: entries,
          exits: exits,
          totalDetections: detectionCount,
          netCount: entries - exits,
          avgConfidence: 0.85,
          detectionsByDirection: {
            IN: entries,
            OUT: exits
          },
          lastUpdate: new Date().toISOString()
        };
        
        // Update job with current counts
        await currentJob.update({
          result_json: summary,
          total_detections: detectionCount
        });
        
        console.log(`📹 Stream update for ${job.job_id}: ${entries} entries, ${exits} exits`);
        
      } catch (error) {
        console.error('Error in stream processing:', error);
        clearInterval(interval);
      }
    }, 3000); // Update every 3 seconds
    
    // Stop simulation after 30 minutes (for demo)
    setTimeout(async () => {
      try {
        const currentJob = await PluginJob.findOne({
          where: { job_id: job.job_id }
        });
        
        if (currentJob && currentJob.status === 'processing') {
          clearInterval(interval);
          await currentJob.update({
            status: 'completed',
            completed_at: new Date()
          });
          console.log(`✅ Stream analysis completed for job ${job.job_id}`);
        }
      } catch (error) {
        console.error('Error completing stream job:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  }

async handleStreamAnalysisError(jobId, errorMessage) {
    try {
      await PluginJob.update(
        {
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date()
        },
        { where: { job_id: jobId } }
      );
      console.error(`❌ Stream job ${jobId} failed: ${errorMessage}`);
    } catch (error) {
      console.error('❌ Error updating stream job status:', error);
    }
  }


}

module.exports = new UploadAnalysisController();