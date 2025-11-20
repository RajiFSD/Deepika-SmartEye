// services/detectionIntegrationService.js
/**
 * Service to integrate gender detection with your existing upload analysis system
 */

const axios = require('axios');
const FormData = require('form-data');
const { PeopleCountLog, Camera } = require('@models');
const { Op, fn, col } = require('sequelize');

class DetectionIntegrationService {
  constructor() {
    this.detectionServiceUrl = process.env.DETECTION_SERVICE_URL || 'http://localhost:5000';
  }

  /**
   * Process video file with gender detection
   */
  async processVideoWithGenderDetection(filePath, options = {}) {
    try {
      console.log('🚀 Sendin g processVideoWithGenderDetection ');
      const { camera_id, tenant_id, branch_id, job_id } = options;

      console.log(`🎬 Processing video with gender detection: ${filePath}`);

      // Read file and send to Python service
      const fs = require('fs');
      const formData = new FormData();
      formData.append('video', fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.detectionServiceUrl}/api/detection/process-video`,
        formData,
        {
          headers: formData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
          timeout: 600000 // 10 minutes
        }
      );

      if (response.data.success) {
        const { detections, summary } = response.data;

        console.log(`✅ Detection complete: ${summary.total_count} detections`);
        console.log(`   Male: ${summary.male_count}, Female: ${summary.female_count}`);

        // Save to database
        const savedDetections = await this.saveDetectionsToDatabase({
          detections,
          camera_id,
          tenant_id,
          branch_id,
          job_id
        });

        return {
          success: true,
          detections: savedDetections,
          summary: {
            ...summary,
            saved_count: savedDetections.length
          }
        };
      } else {
        throw new Error(response.data.message || 'Detection failed');
      }

    } catch (error) {
      console.error('❌ Video detection error:', error.message);
      throw error;
    }
  }

  /**
   * Process single frame with gender detection
   */
  async processFrameWithGenderDetection(frameBuffer, options = {}) {
    try {
      const { camera_id } = options;

      const formData = new FormData();
      formData.append('frame', frameBuffer, {
        filename: 'frame.jpg',
        contentType: 'image/jpeg'
      });

      if (camera_id) {
        formData.append('camera_id', camera_id);
      }

      const response = await axios.post(
        `${this.detectionServiceUrl}/api/detection/detect-frame`,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000
        }
      );

      return response.data;

    } catch (error) {
      console.error('❌ Frame detection error:', error.message);
      throw error;
    }
  }

  /**
   * Save detections to your database with gender information
   */
  async saveDetectionsToDatabase(options) {
    try {
      const { detections, camera_id, tenant_id, branch_id, job_id } = options;

      if (!detections || !Array.isArray(detections)) {
        throw new Error('Invalid detections data');
      }

      const savedDetections = [];

      for (const det of detections) {
        try {
          const log = await PeopleCountLog.create({
            camera_id: camera_id || null,
            tenant_id: tenant_id,
            branch_id: branch_id || det.branch_id,
            zone_id: det.zone_id || null,
            person_id: det.person_id || `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            direction: det.direction || 'IN',
            detection_time: det.detection_time || new Date(),
            frame_number: det.frame_number || 0,
            confidence_score: det.confidence_score || 0.5,
            image_path: det.image_path || null,
            thumbnail_path: det.thumbnail_path || null,
            metadata: {
              ...det.metadata,
              gender: det.gender || 'unknown',
              age: det.metadata?.age,
              emotion: det.metadata?.emotion,
              bbox: det.bbox || det.metadata?.bbox,
              job_id: job_id,
              source: 'gender_detection_ai',
              detection_method: det.metadata?.detection_method || 'ai'
            },
            created_at: new Date()
          });

          savedDetections.push(log);
        } catch (saveError) {
          console.error(`❌ Error saving detection: ${saveError.message}`);
        }
      }

      console.log(`✅ Saved ${savedDetections.length}/${detections.length} detections to database`);
      
      // Update occupancy counts
      if (camera_id && savedDetections.length > 0) {
        await this.updateOccupancyCounts(camera_id, savedDetections);
      }

      return savedDetections;

    } catch (error) {
      console.error('❌ Error saving detections:', error);
      throw error;
    }
  }

  /**
   * Update occupancy counts with gender breakdown
   */
  async updateOccupancyCounts(cameraId, detections) {
    try {
      const { CurrentOccupancy } = require('@models');

      const maleCount = detections.filter(d => 
        d.metadata?.gender === 'male' && d.direction === 'IN'
      ).length;
      
      const femaleCount = detections.filter(d => 
        d.metadata?.gender === 'female' && d.direction === 'IN'
      ).length;

      const totalEntries = detections.filter(d => d.direction === 'IN').length;
      const totalExits = detections.filter(d => d.direction === 'OUT').length;

      // Find or create occupancy record
      let occupancy = await CurrentOccupancy.findOne({
        where: { camera_id: cameraId }
      });

      if (occupancy) {
        await occupancy.update({
          current_count: occupancy.current_count + totalEntries - totalExits,
          total_entries: occupancy.total_entries + totalEntries,
          total_exits: occupancy.total_exits + totalExits,
          last_updated: new Date(),
          metadata: {
            ...(occupancy.metadata || {}),
            male_count: (occupancy.metadata?.male_count || 0) + maleCount,
            female_count: (occupancy.metadata?.female_count || 0) + femaleCount
          }
        });
      } else {
        // Create new occupancy record
        const camera = await Camera.findByPk(cameraId);
        if (camera) {
          await CurrentOccupancy.create({
            camera_id: cameraId,
            tenant_id: camera.tenant_id,
            branch_id: camera.branch_id,
            current_count: totalEntries - totalExits,
            total_entries: totalEntries,
            total_exits: totalExits,
            last_updated: new Date(),
            metadata: {
              male_count: maleCount,
              female_count: femaleCount
            }
          });
        }
      }

      console.log(`✅ Updated occupancy: +${totalEntries} entries (M:${maleCount}, F:${femaleCount})`);

    } catch (error) {
      console.error('❌ Error updating occupancy:', error);
    }
  }

  /**
   * Get detection statistics with gender breakdown
   */
  async getDetectionStats(options) {
    try {
      const { tenant_id, camera_id, start_date, end_date, branch_id } = options;

      const where = { tenant_id };

      if (camera_id) where.camera_id = camera_id;
      if (branch_id) where.branch_id = branch_id;

      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      // Total count
      const totalCount = await PeopleCountLog.count({ where });

      // Get gender distribution using JSON extraction
      const genderStats = await PeopleCountLog.findAll({
        where,
        attributes: [
          [fn('JSON_EXTRACT', col('metadata'), '$.gender'), 'gender'],
          [fn('COUNT', col('log_id')), 'count']
        ],
        group: ['gender'],
        raw: true
      });

      // Direction breakdown
      const directionStats = await PeopleCountLog.findAll({
        where,
        attributes: [
          'direction',
          [fn('COUNT', col('log_id')), 'count']
        ],
        group: ['direction'],
        raw: true
      });

      // Parse results
      const genderBreakdown = genderStats.reduce((acc, stat) => {
        const gender = stat.gender ? stat.gender.replace(/"/g, '') : 'unknown';
        acc[gender] = parseInt(stat.count);
        return acc;
      }, {});

      const directionBreakdown = directionStats.reduce((acc, stat) => {
        acc[stat.direction] = parseInt(stat.count);
        return acc;
      }, {});

      return {
        total: totalCount,
        by_gender: {
          male: genderBreakdown.male || 0,
          female: genderBreakdown.female || 0,
          unknown: genderBreakdown.unknown || 0
        },
        by_direction: {
          IN: directionBreakdown.IN || 0,
          OUT: directionBreakdown.OUT || 0
        },
        male_percentage: totalCount > 0 
          ? ((genderBreakdown.male || 0) / totalCount * 100).toFixed(1) 
          : 0,
        female_percentage: totalCount > 0 
          ? ((genderBreakdown.female || 0) / totalCount * 100).toFixed(1) 
          : 0
      };

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Get hourly breakdown with gender data
   */
  async getHourlyBreakdown(options) {
    try {
      const { tenant_id, camera_id, date } = options;

      const startDate = date ? new Date(date) : new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      const where = {
        tenant_id,
        detection_time: {
          [Op.between]: [startDate, endDate]
        }
      };

      if (camera_id) where.camera_id = camera_id;

      const hourlyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [fn('HOUR', col('detection_time')), 'hour'],
          [fn('JSON_EXTRACT', col('metadata'), '$.gender'), 'gender'],
          [fn('COUNT', col('log_id')), 'count']
        ],
        group: ['hour', 'gender'],
        order: [[fn('HOUR', col('detection_time')), 'ASC']],
        raw: true
      });

      // Format data for charts
      const formattedData = {};
      for (let h = 0; h < 24; h++) {
        formattedData[h] = { hour: h, male: 0, female: 0, unknown: 0, total: 0 };
      }

      hourlyData.forEach(row => {
        const hour = parseInt(row.hour);
        const gender = row.gender ? row.gender.replace(/"/g, '') : 'unknown';
        const count = parseInt(row.count);

        formattedData[hour][gender] = count;
        formattedData[hour].total += count;
      });

      return Object.values(formattedData);

    } catch (error) {
      console.error('❌ Error getting hourly breakdown:', error);
      throw error;
    }
  }

  /**
   * Check detection service health
   */
  async checkServiceHealth() {
    try {
      const response = await axios.get(
        `${this.detectionServiceUrl}/api/detection/health`,
        { timeout: 5000 }
      );

      return {
        healthy: true,
        details: response.data
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        message: error.code === 'ECONNREFUSED' 
          ? 'Detection service is not running' 
          : error.message
      };
    }
  }

  /**
   * Get detection service capabilities
   */
  async getServiceCapabilities() {
    try {
      const response = await axios.get(
        `${this.detectionServiceUrl}/api/detection/capabilities`,
        { timeout: 5000 }
      );

      return response.data;

    } catch (error) {
      throw new Error('Could not retrieve service capabilities');
    }
  }
}

module.exports = new DetectionIntegrationService();