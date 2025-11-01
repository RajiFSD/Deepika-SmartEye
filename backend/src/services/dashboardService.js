const { 
  CurrentOccupancy, 
  PeopleCountLog, 
  AlertLog, 
  Camera, 
  Branch,
  Tenant,
  sequelize 
} = require("@models");
const { Op } = require("sequelize");

class DashboardService {
  async getOverview(tenantId) {
    try {
      const currentOccupancy = await CurrentOccupancy.sum('current_count', {
        where: { tenant_id: tenantId }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStats = await PeopleCountLog.findAndCountAll({
        where: { 
          tenant_id: tenantId,
          detection_time: { [Op.gte]: today }
        }
      });

      const activeAlerts = await AlertLog.count({
        where: { 
          tenant_id: tenantId,
          status: 'triggered'
        }
      });

      const totalCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          is_active: true
        }
      });

      return {
        current_occupancy: currentOccupancy || 0,
        today_entries: todayStats.count,
        active_alerts: activeAlerts,
        total_cameras: totalCameras,
        occupancy_rate: this.calculateOccupancyRate(currentOccupancy, totalCameras)
      };
    } catch (error) {
      console.error("Error fetching dashboard overview:", error);
      throw new Error("Failed to retrieve dashboard overview");
    }
  }

  async getOccupancyData(tenantId, period = 'today', branchId = null) {
    try {
      const where = { tenant_id: tenantId };
      if (branchId) where.branch_id = branchId;

      const dateRange = this.getDateRange(period);
      if (dateRange.start) where.detection_time = { [Op.gte]: dateRange.start };
      if (dateRange.end) where.detection_time = { [Op.lte]: dateRange.end };

      const occupancyData = await PeopleCountLog.findAll({
        where,
        attributes: [
          [sequelize.fn('DATE', sequelize.col('detection_time')), 'date'],
          [sequelize.fn('HOUR', sequelize.col('detection_time')), 'hour'],
          'direction',
          [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
        ],
        group: ['date', 'hour', 'direction'],
        order: [['date', 'ASC'], ['hour', 'ASC']],
        raw: true
      });

      return this.processOccupancyData(occupancyData, period);
    } catch (error) {
      console.error("Error fetching occupancy data:", error);
      throw new Error("Failed to retrieve occupancy data");
    }
  }

  async getRecentAlerts(tenantId, limit = 10) {
    try {
      return await AlertLog.findAll({
        where: { tenant_id: tenantId },
        include: [
          { model: Camera, as: 'camera', attributes: ['camera_name', 'camera_code'] }
        ],
        limit: parseInt(limit),
        order: [['alert_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching recent alerts:", error);
      throw new Error("Failed to retrieve recent alerts");
    }
  }

  async getAnalytics(tenantId, { start_date, end_date, metric = 'occupancy' }) {
    try {
      const where = { tenant_id: tenantId };
      
      if (start_date && end_date) {
        where.detection_time = {
          [Op.between]: [new Date(start_date), new Date(end_date)]
        };
      }

      let analyticsData;
      
      switch (metric) {
        case 'occupancy':
          analyticsData = await this.getOccupancyAnalytics(where);
          break;
        case 'entries_exits':
          analyticsData = await this.getEntriesExitsAnalytics(where);
          break;
        case 'alerts':
          analyticsData = await this.getAlertsAnalytics(tenantId, start_date, end_date);
          break;
        default:
          analyticsData = await this.getOccupancyAnalytics(where);
      }

      return analyticsData;
    } catch (error) {
      console.error("Error fetching analytics:", error);
      throw new Error("Failed to retrieve analytics data");
    }
  }

  async getBranchDashboard(branchId) {
    try {
      const branch = await Branch.findByPk(branchId, {
        include: [{ model: Tenant, as: 'tenant' }]
      });

      if (!branch) throw new Error("Branch not found");

      const currentOccupancy = await CurrentOccupancy.sum('current_count', {
        where: { branch_id: branchId }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStats = await PeopleCountLog.findAndCountAll({
        where: { 
          branch_id: branchId,
          detection_time: { [Op.gte]: today }
        }
      });

      const branchCameras = await Camera.count({
        where: { 
          branch_id: branchId,
          is_active: true
        }
      });

      return {
        branch,
        current_occupancy: currentOccupancy || 0,
        today_entries: todayStats.count,
        total_cameras: branchCameras,
        occupancy_trend: await this.getBranchOccupancyTrend(branchId)
      };
    } catch (error) {
      console.error("Error fetching branch dashboard:", error);
      throw new Error("Failed to retrieve branch dashboard");
    }
  }

  // Helper methods
  calculateOccupancyRate(occupancy, totalCameras) {
    if (!totalCameras || totalCameras === 0) return 0;
    // This is a simplified calculation - adjust based on your business logic
    return Math.min((occupancy / (totalCameras * 100)) * 100, 100).toFixed(2);
  }

  getDateRange(period) {
    const now = new Date();
    const start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      case 'week':
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      case 'month':
        start.setMonth(now.getMonth() - 1);
        return { start, end: now };
      default:
        return { start: null, end: null };
    }
  }

  processOccupancyData(data, period) {
    // Process and format the raw data for charting
    const processedData = {};
    
    data.forEach(item => {
      const key = period === 'today' ? item.hour : item.date;
      if (!processedData[key]) {
        processedData[key] = { entries: 0, exits: 0 };
      }
      
      if (item.direction === 'IN') {
        processedData[key].entries = parseInt(item.count);
      } else {
        processedData[key].exits = parseInt(item.count);
      }
    });

    return processedData;
  }

  async getOccupancyAnalytics(where) {
    return await PeopleCountLog.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('detection_time')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'total_count'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN direction = 'IN' THEN 1 ELSE 0 END")), 'entries'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END")), 'exits']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true
    });
  }

  async getEntriesExitsAnalytics(where) {
    return await PeopleCountLog.findAll({
      where,
      attributes: [
        'direction',
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      group: ['direction'],
      raw: true
    });
  }

  async getAlertsAnalytics(tenantId, startDate, endDate) {
    const where = { tenant_id: tenantId };
    
    if (startDate && endDate) {
      where.alert_time = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    return await AlertLog.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('alert_id')), 'count']
      ],
      group: ['status'],
      raw: true
    });
  }

  async getBranchOccupancyTrend(branchId) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return await PeopleCountLog.findAll({
      where: {
        branch_id: branchId,
        detection_time: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('detection_time')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('log_id')), 'count']
      ],
      group: ['date'],
      order: [['date', 'ASC']],
      raw: true
    });
  }
}

module.exports = new DashboardService();