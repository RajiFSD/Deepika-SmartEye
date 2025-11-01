const { Camera, PeopleCountLog, CurrentOccupancy, ZoneConfig } = require('@models');
const { Op } = require('sequelize');
const occupancyService = require('./occupancyService');
const alertService = require('./alertService');

class AiIngestService {
  constructor() {
    this.activeProcesses = new Map();
    this.isProcessing = false;
  }

  /**
   * Start processing a camera stream for people counting
   */
  async startCameraProcessing(cameraId) {
    try {
      const camera = await Camera.findByPk(cameraId, {
        include: [{ model: ZoneConfig, as: 'zones', where: { is_active: true } }]
      });

      if (!camera) {
        throw new Error(`Camera ${cameraId} not found`);
      }

      if (!camera.is_active) {
        throw new Error(`Camera ${cameraId} is not active`);
      }

      if (this.activeProcesses.has(cameraId)) {
        console.log(`Camera ${cameraId} is already being processed`);
        return { message: 'Camera processing already started' };
      }

      // Initialize AI processing for this camera
      const processInfo = {
        cameraId,
        startedAt: new Date(),
        frameCount: 0,
        detectionCount: 0,
        isRunning: true
      };

      this.activeProcesses.set(cameraId, processInfo);

      // Start the actual AI processing (this would integrate with your AI system)
      this.startAIPipeline(camera);

      console.log(`Started AI processing for camera: ${camera.camera_name}`);
      return { message: 'Camera processing started', camera: camera.camera_name };
    } catch (error) {
      console.error(`Error starting camera processing for ${cameraId}:`, error);
      throw new Error(`Failed to start camera processing: ${error.message}`);
    }
  }

  /**
   * Stop processing a camera stream
   */
  async stopCameraProcessing(cameraId) {
    try {
      const processInfo = this.activeProcesses.get(cameraId);
      if (!processInfo) {
        return { message: 'Camera processing not active' };
      }

      processInfo.isRunning = false;
      this.activeProcesses.delete(cameraId);

      // Stop the AI pipeline (implementation depends on your AI system)
      this.stopAIPipeline(cameraId);

      console.log(`Stopped AI processing for camera: ${cameraId}`);
      return { message: 'Camera processing stopped' };
    } catch (error) {
      console.error(`Error stopping camera processing for ${cameraId}:`, error);
      throw new Error(`Failed to stop camera processing: ${error.message}`);
    }
  }

  /**
   * Process a single detection from AI system
   */
  async processDetection(detectionData) {
    try {
      const {
        camera_id,
        person_id,
        direction,
        confidence,
        bbox,
        frame_time,
        frame_number,
        zone_id = null
      } = detectionData;

      // Validate required fields
      if (!camera_id || !direction || !frame_time) {
        throw new Error('Missing required detection fields');
      }

      // Create people count log entry
      const logData = {
        camera_id,
        tenant_id: detectionData.tenant_id,
        branch_id: detectionData.branch_id,
        zone_id,
        person_id,
        direction: direction.toUpperCase(),
        detection_time: new Date(frame_time),
        frame_number,
        confidence_score: confidence,
        image_path: detectionData.image_path,
        thumbnail_path: detectionData.thumbnail_path,
        metadata: {
          bbox,
          model_version: detectionData.model_version,
          processing_time: detectionData.processing_time
        }
      };

      const peopleCountLog = await PeopleCountLog.create(logData);

      // Update occupancy counts
      await occupancyService.updateOccupancyCount(
        camera_id,
        zone_id,
        direction.toUpperCase(),
        peopleCountLog.log_id
      );

      console.log(`Processed detection: ${direction} for camera ${camera_id}`);
      return peopleCountLog;
    } catch (error) {
      console.error('Error processing detection:', error);
      throw new Error(`Failed to process detection: ${error.message}`);
    }
  }

  /**
   * Batch process multiple detections
   */
  async processBatchDetections(detections) {
    try {
      const results = [];
      
      for (const detection of detections) {
        try {
          const result = await this.processDetection(detection);
          results.push({ success: true, data: result });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error.message,
            detection 
          });
        }
      }

      return {
        processed: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error processing batch detections:', error);
      throw new Error(`Failed to process batch detections: ${error.message}`);
    }
  }

  /**
   * Get processing status for all cameras
   */
  getProcessingStatus() {
    const status = {};
    
    for (const [cameraId, processInfo] of this.activeProcesses.entries()) {
      status[cameraId] = {
        isRunning: processInfo.isRunning,
        startedAt: processInfo.startedAt,
        frameCount: processInfo.frameCount,
        detectionCount: processInfo.detectionCount,
        uptime: Date.now() - processInfo.startedAt.getTime()
      };
    }

    return status;
  }

  /**
   * Validate detection data before processing
   */
  validateDetectionData(detectionData) {
    const errors = [];

    if (!detectionData.camera_id) errors.push('camera_id is required');
    if (!detectionData.direction) errors.push('direction is required');
    if (!detectionData.frame_time) errors.push('frame_time is required');

    if (detectionData.direction && !['IN', 'OUT'].includes(detectionData.direction.toUpperCase())) {
      errors.push('direction must be IN or OUT');
    }

    if (detectionData.confidence && (detectionData.confidence < 0 || detectionData.confidence > 1)) {
      errors.push('confidence must be between 0 and 1');
    }

    return errors;
  }

  /**
   * Start AI pipeline for a camera (placeholder for actual AI integration)
   */
  async startAIPipeline(camera) {
    // This would integrate with your actual AI system
    // Examples: YOLO + DeepSORT, ByteTrack, etc.
    
    console.log(`Starting AI pipeline for camera: ${camera.camera_name}`);
    console.log(`Stream URL: ${camera.stream_url}`);
    console.log(`Zones: ${camera.zones.length}`);

    // Implementation would depend on your AI framework
    // For example:
    // - Initialize OpenCV video capture
    // - Load YOLO model
    // - Start tracking with DeepSORT
    // - Process frames and call processDetection()
  }

  /**
   * Stop AI pipeline for a camera
   */
  async stopAIPipeline(cameraId) {
    // Stop the AI processing pipeline
    console.log(`Stopping AI pipeline for camera: ${cameraId}`);
    
    // Implementation would depend on your AI framework
    // - Release video capture
    // - Clean up model resources
    // - Stop tracking
  }

  /**
   * Process a video file for people counting (offline processing)
   */
  async processVideoFile(jobData) {
    try {
      const { file_path, camera_id, user_id, tenant_id } = jobData;
      
      console.log(`Processing video file: ${file_path} for camera ${camera_id}`);

      // This would integrate with your offline video processing system
      // Process video and generate detections

      const results = {
        total_frames: 0,
        total_detections: 0,
        processing_time: 0,
        average_confidence: 0,
        detections: []
      };

      return results;
    } catch (error) {
      console.error('Error processing video file:', error);
      throw new Error(`Failed to process video file: ${error.message}`);
    }
  }

  /**
   * Get detection statistics for a time period
   */
  async getDetectionStats(cameraId, startTime, endTime) {
    try {
      const where = {
        camera_id: cameraId,
        detection_time: {
          [Op.between]: [new Date(startTime), new Date(endTime)]
        }
      };

      const stats = await PeopleCountLog.findAll({
        where,
        attributes: [
          'direction',
          [this.sequelize.fn('COUNT', this.sequelize.col('log_id')), 'count'],
          [this.sequelize.fn('AVG', this.sequelize.col('confidence_score')), 'avg_confidence']
        ],
        group: ['direction'],
        raw: true
      });

      return stats;
    } catch (error) {
      console.error('Error getting detection stats:', error);
      throw new Error(`Failed to get detection statistics: ${error.message}`);
    }
  }
}

module.exports = new AiIngestService();