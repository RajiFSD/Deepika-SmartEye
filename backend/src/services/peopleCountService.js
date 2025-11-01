const { PeopleCountLog, Camera, Tenant, Branch, ZoneConfig } = require("@models");
const { Op } = require("sequelize");

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

  async getHourlyAnalytics({ date, camera_id, branch_id } = {}) {
    try {
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

      const hourlyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [this.sequelize.fn('HOUR', this.sequelize.col('detection_time')), 'hour'],
          'direction',
          [this.sequelize.fn('COUNT', this.sequelize.col('log_id')), 'count']
        ],
        group: ['hour', 'direction'],
        order: [['hour', 'ASC']],
        raw: true
      });

      return this.processHourlyData(hourlyData);
    } catch (error) {
      console.error("Error fetching hourly analytics:", error);
      throw new Error("Failed to retrieve hourly analytics");
    }
  }

  async getDailyAnalytics({ start_date, end_date, camera_id, branch_id } = {}) {
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

      const dailyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [this.sequelize.fn('DATE', this.sequelize.col('detection_time')), 'date'],
          'direction',
          [this.sequelize.fn('COUNT', this.sequelize.col('log_id')), 'count']
        ],
        group: ['date', 'direction'],
        order: [['date', 'ASC']],
        raw: true
      });

      return this.processDailyData(dailyData);
    } catch (error) {
      console.error("Error fetching daily analytics:", error);
      throw new Error("Failed to retrieve daily analytics");
    }
  }

  // Helper methods
  processHourlyData(hourlyData) {
    const result = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      entries: 0,
      exits: 0
    }));

    hourlyData.forEach(item => {
      const hour = parseInt(item.hour);
      if (item.direction === 'IN') {
        result[hour].entries = parseInt(item.count);
      } else {
        result[hour].exits = parseInt(item.count);
      }
    });

    return result;
  }

  processDailyData(dailyData) {
    const resultMap = new Map();

    dailyData.forEach(item => {
      const date = item.date.toISOString().split('T')[0];
      if (!resultMap.has(date)) {
        resultMap.set(date, { date, entries: 0, exits: 0 });
      }
      
      const dayData = resultMap.get(date);
      if (item.direction === 'IN') {
        dayData.entries = parseInt(item.count);
      } else {
        dayData.exits = parseInt(item.count);
      }
    });

    return Array.from(resultMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }
}

module.exports = new PeopleCountService();