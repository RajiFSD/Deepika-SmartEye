const { PeopleCountLog, Camera, Tenant, Branch, ZoneConfig } = require("@models");
const { Op } = require("sequelize");
const { sequelize } = require("@config/database");

class PeopleCountService {
  async createPeopleCountLog(data) {
    try {
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
}

module.exports = new PeopleCountService();