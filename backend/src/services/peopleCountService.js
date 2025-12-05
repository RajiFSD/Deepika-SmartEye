const { PeopleCountLog, Camera, Tenant, Branch, ZoneConfig } = require("@models");
const { Op } = require("sequelize");
const { sequelize } = require("@config/database");
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');


class PeopleCountService {
  async createPeopleCountLog(data) {
    try {
      console.log("Creating people count log with data:", data);
      return await PeopleCountLog.create(data);
    } catch (error) {
      console.error("Error creating people count log:", error);
      throw new Error("Failed to create people count log");
    }
  }

  async getAllPeopleCountLogs({ page = 1, limit = 10, direction, start_date, end_date } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = {};
      
      if (direction) where.direction = direction;
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      return await PeopleCountLog.findAndCountAll({
        where,
        include: [
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' },
          { model: Branch, as: 'branch' },
          { model: ZoneConfig, as: 'zone' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['detection_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching people count logs:", error);
      throw new Error("Failed to retrieve people count logs");
    }
  }

  async getPeopleCountLogById(id) {
    try {
      return await PeopleCountLog.findByPk(id, {
        include: [
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' },
          { model: Branch, as: 'branch' },
          { model: ZoneConfig, as: 'zone' }
        ]
      });
    } catch (error) {
      console.error("Error fetching people count log by ID:", error);
      throw new Error("Failed to retrieve people count log");
    }
  }

  async getPeopleCountLogsByCamera(cameraId, { page = 1, limit = 10, direction, start_date, end_date } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { camera_id: cameraId };
      
      if (direction) where.direction = direction;
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      return await PeopleCountLog.findAndCountAll({
        where,
        include: [
          { model: Tenant, as: 'tenant' },
          { model: Branch, as: 'branch' },
          { model: ZoneConfig, as: 'zone' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['detection_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching people count logs by camera:", error);
      throw new Error("Failed to retrieve people count logs");
    }
  }

  async getPeopleCountLogsByTenant(tenantId, { page = 1, limit = 10, direction, start_date, end_date } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { tenant_id: tenantId };
      
      if (direction) where.direction = direction;
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      return await PeopleCountLog.findAndCountAll({
        where,
        include: [
          { model: Camera, as: 'camera' },
          { model: Branch, as: 'branch' },
          { model: ZoneConfig, as: 'zone' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['detection_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching people count logs by tenant:", error);
      throw new Error("Failed to retrieve people count logs");
    }
  }

  async getPeopleCountLogsByBranch(branchId, { page = 1, limit = 10, direction, start_date, end_date } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { branch_id: branchId };
      
      if (direction) where.direction = direction;
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      return await PeopleCountLog.findAndCountAll({
        where,
        include: [
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' },
          { model: ZoneConfig, as: 'zone' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['detection_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching people count logs by branch:", error);
      throw new Error("Failed to retrieve people count logs");
    }
  }

  async getHourlyAnalytics({ date, camera_id, branch_id, tenant_id } = {}) {
    try {
      console.log('🔧 SERVICE: getHourlyAnalytics called with:', { date, camera_id, branch_id, tenant_id });
      
      const where = {};
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);

      where.detection_time = {
        [Op.between]: [targetDate, nextDate]
      };

      if (camera_id) where.camera_id = camera_id;
      if (branch_id) where.branch_id = branch_id;
      if (tenant_id) where.tenant_id = tenant_id;

      console.log('🔧 SERVICE: Date range:', {
        start: targetDate.toISOString(),
        end: nextDate.toISOString()
      });
      console.log('🔧 SERVICE: WHERE clause:', JSON.stringify(where, null, 2));

      // First check if there are any logs
      const totalCount = await PeopleCountLog.count({ where });
      console.log('🔧 SERVICE: Total logs in range:', totalCount);

      if (totalCount === 0) {
        console.log('⚠️ SERVICE: No logs found, returning empty hourly data');
        return this.processHourlyData([]);
      }

      // Get sample logs to verify data
      const sampleLogs = await PeopleCountLog.findAll({
        where,
        limit: 3,
        raw: true
      });
      console.log('🔧 SERVICE: Sample logs:', JSON.stringify(sampleLogs, null, 2));

      console.log('🔧 SERVICE: Executing hourly aggregation query...');
      
      const hourlyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [sequelize.fn('HOUR', sequelize.col('detection_time')), 'hour'],
          'direction',
          [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
        ],
        group: ['hour', 'direction'],
        order: [[sequelize.literal('hour'), 'ASC']],
        raw: true
      });

      console.log('🔧 SERVICE: Raw hourly data from DB:', JSON.stringify(hourlyData, null, 2));
      console.log('🔧 SERVICE: Hourly data length:', hourlyData.length);

      const result = this.processHourlyData(hourlyData);
      console.log('🔧 SERVICE: Processed result (first 5):', JSON.stringify(result.slice(0, 5), null, 2));
      console.log('🔧 SERVICE: Total entries:', result.reduce((sum, h) => sum + h.entries, 0));
      console.log('🔧 SERVICE: Total exits:', result.reduce((sum, h) => sum + h.exits, 0));

      return result;
    } catch (error) {
      console.error("❌ SERVICE ERROR: Error fetching hourly analytics:", error);
      console.error("❌ SERVICE ERROR: Error message:", error.message);
      console.error("❌ SERVICE ERROR: Error stack:", error.stack);
      throw new Error("Failed to retrieve hourly analytics");
    }
  }

  async getDailyAnalytics({ start_date, end_date, camera_id, branch_id, tenant_id } = {}) {
    try {
      const where = {};
      
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      } else {
        // Default to last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        where.detection_time = { [Op.between]: [startDate, endDate] };
      }

      if (camera_id) where.camera_id = camera_id;
      if (branch_id) where.branch_id = branch_id;
      if (tenant_id) where.tenant_id = tenant_id;

      const dailyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [sequelize.fn('DATE', sequelize.col('detection_time')), 'date'],
          'direction',
          [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
        ],
        group: ['date', 'direction'],
        order: [[sequelize.literal('date'), 'ASC']],
        raw: true
      });

      return this.processDailyData(dailyData);
    } catch (error) {
      console.error("Error fetching daily analytics:", error);
      console.error("Error details:", error.message);
      throw new Error("Failed to retrieve daily analytics");
    }
  }

  // Helper methods
  processHourlyData(hourlyData) {
    console.log('🔧 PROCESS: Processing hourly data, input length:', hourlyData.length);
    
    const result = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      time: `${hour.toString().padStart(2, '0')}:00`,
      entries: 0,
      exits: 0
    }));

    hourlyData.forEach(item => {
      console.log('🔧 PROCESS: Processing item:', JSON.stringify(item));
      const hour = parseInt(item.hour);
      
      if (hour >= 0 && hour < 24) {
        if (item.direction === 'IN') {
          result[hour].entries = parseInt(item.count);
          console.log(`🔧 PROCESS: Set hour ${hour} entries to ${item.count}`);
        } else if (item.direction === 'OUT') {
          result[hour].exits = parseInt(item.count);
          console.log(`🔧 PROCESS: Set hour ${hour} exits to ${item.count}`);
        }
      }
    });

    return result;
  }

  processDailyData(dailyData) {
    const resultMap = new Map();

    dailyData.forEach(item => {
      const date = item.date instanceof Date 
        ? item.date.toISOString().split('T')[0] 
        : item.date;
        
      if (!resultMap.has(date)) {
        resultMap.set(date, { date, entries: 0, exits: 0 });
      }
      
      const dayData = resultMap.get(date);
      if (item.direction === 'IN') {
        dayData.entries = parseInt(item.count);
      } else if (item.direction === 'OUT') {
        dayData.exits = parseInt(item.count);
      }
    });

    return Array.from(resultMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

    /**
   * Process uploaded video for people counting with gender detection
   * @param {string} videoPath - Path to uploaded video file
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Processing results with detections
   */
  async processVideoForPeopleCounting(videoPath, direction = 'LEFT_RIGHT') {
  return new Promise((resolve, reject) => {
    console.log('🎬 Starting video processing for people counting');
    console.log('📁 Video path:', videoPath);
    console.log('➡️ Direction:', direction);

    // Correct path to your virtual environment
    const venvPath = path.join(__dirname, '../../../ai-module/venv');
    
    // Check if venv exists
    if (!fs.existsSync(venvPath)) {
      console.error('❌ Virtual environment not found at:', venvPath);
      return reject(new Error('Python virtual environment not found. Please run setup.'));
    }

    // Python executable path (Windows)
    const pythonPath = path.join(venvPath, 'Scripts', 'python.exe');
    
    // Check if python.exe exists
    if (!fs.existsSync(pythonPath)) {
      console.error('❌ Python executable not found at:', pythonPath);
      return reject(new Error('Python executable not found in virtual environment.'));
    }

    // Python script path
    const scriptPath = path.join(__dirname, '../../../ai-module/src/models/people_count_video.py');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      console.error('❌ Python script not found at:', scriptPath);
      return reject(new Error('Python script not found.'));
    }

    console.log('✅ Python path:', pythonPath);
    console.log('✅ Script path:', scriptPath);

    // Spawn Python process
    const pythonProcess = spawn(pythonPath, [scriptPath, videoPath, direction]);

    let stdoutData = '';
    let stderrData = '';

    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      const message = data.toString();
      stderrData += message;
      // Log progress messages
      if (message.includes('Progress:') || message.includes('Processing')) {
        console.log('🔄', message.trim());
      }
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Python process failed with code:', code);
        console.error('stderr:', stderrData);
        return reject(new Error(`Python process exited with code ${code}: ${stderrData}`));
      }

      try {
        // Parse JSON output from stdout
        const result = JSON.parse(stdoutData);
        
        if (!result.success) {
          console.error('❌ Processing failed:', result.error);
          return reject(new Error(result.error || 'Video processing failed'));
        }

        console.log('✅ Video processing completed successfully');
        console.log('📊 Summary:', result.summary);
        resolve(result);
      } catch (error) {
        console.error('❌ Failed to parse Python output:', error);
        console.error('stdout:', stdoutData);
        reject(new Error('Failed to parse processing results: ' + error.message));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('❌ Failed to start Python process:', error);
      reject(new Error('Failed to start Python process: ' + error.message));
    });
  });
}


  /**
   * Save detections to database
   * @param {Array} detections - Array of detection objects
   * @param {Object} metadata - Camera and location metadata
   * @returns {Promise<number>} - Number of saved detections
   */
  async saveDetectionsToDatabase(detections, metadata) {
    const { PeopleCountLog } = require('@models');
    const { camera_id, tenant_id, branch_id, zone_id } = metadata;

    if (!camera_id || !tenant_id || !branch_id) {
      console.warn('⚠️ Missing required metadata, skipping database save');
      return 0;
    }

    let savedCount = 0;

    for (const detection of detections) {
      try {
        await PeopleCountLog.create({
          camera_id,
          tenant_id,
          branch_id,
          zone_id: zone_id || null,
          person_id: detection.person_id || `person_${Date.now()}_${Math.random()}`,
          direction: detection.direction || 'IN',
          detection_time: new Date(),
          frame_number: detection.frame_number || null,
          confidence_score: detection.confidence || null,
          metadata: {
            gender: detection.gender || 'unknown',
            position: detection.position || null,
            timestamp: detection.timestamp || null,
            source: 'video_upload'
          }
        });
        savedCount++;
      } catch (err) {
        console.error('❌ Error saving detection:', err);
        // Continue with other detections
      }
    }

    return savedCount;
  }

  /**
   * Get video processing statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Statistics summary
   */
  async getVideoProcessingStats(filters = {}) {
    const { PeopleCountLog } = require('@models');
    const { Op } = require('sequelize');

    const where = {};

    if (filters.camera_id) where.camera_id = filters.camera_id;
    if (filters.tenant_id) where.tenant_id = filters.tenant_id;
    if (filters.branch_id) where.branch_id = filters.branch_id;
    
    // Filter for video uploads only
    where['metadata.source'] = 'video_upload';

    if (filters.start_date && filters.end_date) {
      where.detection_time = {
        [Op.between]: [new Date(filters.start_date), new Date(filters.end_date)]
      };
    }

    const logs = await PeopleCountLog.findAll({
      where,
      attributes: ['direction', 'metadata'],
      raw: true
    });

    const stats = {
      total_detections: logs.length,
      male_count: 0,
      female_count: 0,
      unknown_count: 0,
      entries: 0,
      exits: 0
    };

    logs.forEach(log => {
      // Count by direction
      if (log.direction === 'IN') stats.entries++;
      if (log.direction === 'OUT') stats.exits++;

      // Count by gender
      const gender = log.metadata?.gender || 'unknown';
      if (gender === 'male') stats.male_count++;
      else if (gender === 'female') stats.female_count++;
      else stats.unknown_count++;
    });

    return stats;
  }




}

module.exports = new PeopleCountService();