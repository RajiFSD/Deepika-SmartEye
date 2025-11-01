const { CurrentOccupancy, PeopleCountLog, AlertThreshold, AlertLog, Camera } = require('@models');
const { Op } = require('sequelize');
const emailService = require('./emailService');

class OccupancyService {
  constructor() {
    this.occupancyCache = new Map();
  }

  /**
   * Update occupancy count based on detection direction
   */
  async updateOccupancyCount(cameraId, zoneId, direction, logId) {
    try {
      // Find or create current occupancy record
      const [occupancy, created] = await CurrentOccupancy.findOrCreate({
        where: { 
          camera_id: cameraId, 
          zone_id: zoneId || null 
        },
        defaults: {
          camera_id: cameraId,
          zone_id: zoneId,
          tenant_id: await this.getTenantIdFromCamera(cameraId),
          branch_id: await this.getBranchIdFromCamera(cameraId),
          current_count: 0,
          total_entries: 0,
          total_exits: 0,
          last_updated: new Date()
        }
      });

      // Update counts based on direction
      if (direction === 'IN') {
        await occupancy.increment(['current_count', 'total_entries']);
      } else if (direction === 'OUT') {
        await occupancy.decrement('current_count');
        await occupancy.increment('total_exits');
        
        // Ensure current_count doesn't go below 0
        if (occupancy.current_count < 0) {
          await occupancy.update({ current_count: 0 });
        }
      }

      await occupancy.update({ last_updated: new Date() });

      // Check for threshold alerts
      await this.checkOccupancyThresholds(cameraId, zoneId, occupancy.current_count);

      // Update cache
      this.updateCache(cameraId, zoneId, occupancy);

      return occupancy;
    } catch (error) {
      console.error('Error updating occupancy count:', error);
      throw new Error(`Failed to update occupancy count: ${error.message}`);
    }
  }

  /**
   * Check if occupancy exceeds any configured thresholds
   */
  async checkOccupancyThresholds(cameraId, zoneId, currentCount) {
    try {
      const thresholds = await AlertThreshold.findAll({
        where: {
          camera_id: cameraId,
          zone_id: zoneId || null,
          alert_enabled: true
        },
        include: ['camera']
      });

      for (const threshold of thresholds) {
        if (currentCount >= threshold.max_occupancy) {
          await this.triggerOccupancyAlert(threshold, currentCount);
        }
      }
    } catch (error) {
      console.error('Error checking occupancy thresholds:', error);
    }
  }

  /**
   * Trigger an occupancy alert
   */
  async triggerOccupancyAlert(threshold, currentCount) {
    try {
      // Check if there's already an active alert for this threshold
      const existingAlert = await AlertLog.findOne({
        where: {
          threshold_id: threshold.threshold_id,
          status: 'triggered'
        }
      });

      if (existingAlert) {
        // Update existing alert
        await existingAlert.update({
          current_occupancy: currentCount,
          alert_time: new Date()
        });
        return existingAlert;
      }

      // Create new alert
      const alert = await AlertLog.create({
        threshold_id: threshold.threshold_id,
        camera_id: threshold.camera_id,
        tenant_id: threshold.tenant_id,
        current_occupancy: currentCount,
        max_occupancy: threshold.max_occupancy,
        alert_time: new Date(),
        status: 'triggered'
      });

      // Send email notification if configured
      if (threshold.notification_email) {
        await emailService.sendAlertNotification({
          camera: threshold.camera,
          current_occupancy: currentCount,
          max_occupancy: threshold.max_occupancy,
          alertThreshold: threshold
        });
      }

      console.log(`Occupancy alert triggered: ${currentCount} >= ${threshold.max_occupancy}`);
      return alert;
    } catch (error) {
      console.error('Error triggering occupancy alert:', error);
    }
  }

  /**
   * Resolve an occupancy alert
   */
  async resolveOccupancyAlert(thresholdId, currentCount) {
    try {
      const alert = await AlertLog.findOne({
        where: {
          threshold_id: thresholdId,
          status: 'triggered'
        }
      });

      if (alert) {
        await alert.update({
          status: 'resolved',
          resolved_at: new Date()
        });

        console.log(`Occupancy alert resolved for threshold ${thresholdId}`);
        return alert;
      }
    } catch (error) {
      console.error('Error resolving occupancy alert:', error);
      throw new Error(`Failed to resolve occupancy alert: ${error.message}`);
    }
  }

  /**
   * Get current occupancy for a camera/zone
   */
  async getCurrentOccupancy(cameraId, zoneId = null) {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(cameraId, zoneId);
      if (this.occupancyCache.has(cacheKey)) {
        const cached = this.occupancyCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5000) { // 5 second cache
          return cached.data;
        }
      }

      const occupancy = await CurrentOccupancy.findOne({
        where: { 
          camera_id: cameraId, 
          zone_id: zoneId || null 
        }
      });

      const result = occupancy || {
        current_count: 0,
        total_entries: 0,
        total_exits: 0,
        last_updated: new Date()
      };

      // Update cache
      this.occupancyCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('Error getting current occupancy:', error);
      throw new Error(`Failed to get current occupancy: ${error.message}`);
    }
  }

  /**
   * Get occupancy history for a time period
   */
  async getOccupancyHistory(cameraId, zoneId, startTime, endTime, interval = 'hour') {
    try {
      const where = {
        camera_id: cameraId,
        detection_time: {
          [Op.between]: [new Date(startTime), new Date(endTime)]
        }
      };

      if (zoneId) {
        where.zone_id = zoneId;
      }

      let groupBy;
      let dateFormat;

      switch (interval) {
        case 'minute':
          dateFormat = '%Y-%m-%d %H:%i:00';
          break;
        case 'hour':
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'day':
          dateFormat = '%Y-%m-%d';
          break;
        default:
          dateFormat = '%Y-%m-%d %H:00:00';
      }

      const history = await PeopleCountLog.findAll({
        where,
        attributes: [
          [this.sequelize.fn('DATE_FORMAT', this.sequelize.col('detection_time'), dateFormat), 'time_bucket'],
          [this.sequelize.fn('SUM', this.sequelize.literal("CASE WHEN direction = 'IN' THEN 1 ELSE 0 END")), 'entries'],
          [this.sequelize.fn('SUM', this.sequelize.literal("CASE WHEN direction = 'OUT' THEN 1 ELSE 0 END")), 'exits']
        ],
        group: ['time_bucket'],
        order: [['time_bucket', 'ASC']],
        raw: true
      });

      return this.calculateCumulativeOccupancy(history);
    } catch (error) {
      console.error('Error getting occupancy history:', error);
      throw new Error(`Failed to get occupancy history: ${error.message}`);
    }
  }

  /**
   * Reset occupancy counts (for daily reset or manual reset)
   */
  async resetOccupancy(cameraId, zoneId = null, resetType = 'daily') {
    try {
      const occupancy = await CurrentOccupancy.findOne({
        where: { 
          camera_id: cameraId, 
          zone_id: zoneId || null 
        }
      });

      if (occupancy) {
        await occupancy.update({
          current_count: 0,
          total_entries: 0,
          total_exits: 0,
          reset_at: new Date(),
          last_updated: new Date()
        });

        // Clear cache
        const cacheKey = this.getCacheKey(cameraId, zoneId);
        this.occupancyCache.delete(cacheKey);

        console.log(`Reset occupancy for camera ${cameraId}, zone ${zoneId} (${resetType})`);
        return occupancy;
      }

      return null;
    } catch (error) {
      console.error('Error resetting occupancy:', error);
      throw new Error(`Failed to reset occupancy: ${error.message}`);
    }
  }

  /**
   * Get occupancy statistics for dashboard
   */
  async getOccupancyStats(tenantId, period = 'today') {
    try {
      const startDate = this.getStartDateForPeriod(period);
      
      const stats = await CurrentOccupancy.findAll({
        where: { tenant_id: tenantId },
        include: ['camera', 'zone'],
        attributes: [
          'camera_id',
          'zone_id',
          'current_count',
          'total_entries',
          'total_exits',
          'last_updated'
        ]
      });

      const totalEntries = await PeopleCountLog.count({
        where: {
          tenant_id: tenantId,
          direction: 'IN',
          detection_time: { [Op.gte]: startDate }
        }
      });

      const totalExits = await PeopleCountLog.count({
        where: {
          tenant_id: tenantId,
          direction: 'OUT',
          detection_time: { [Op.gte]: startDate }
        }
      });

      return {
        current_occupancy: stats.reduce((sum, item) => sum + item.current_count, 0),
        total_entries: totalEntries,
        total_exits: totalExits,
        by_camera: stats.map(stat => ({
          camera_id: stat.camera_id,
          camera_name: stat.camera?.camera_name,
          zone_name: stat.zone?.zone_name,
          current_count: stat.current_count,
          last_updated: stat.last_updated
        }))
      };
    } catch (error) {
      console.error('Error getting occupancy stats:', error);
      throw new Error(`Failed to get occupancy statistics: ${error.message}`);
    }
  }

  // Helper methods
  async getTenantIdFromCamera(cameraId) {
    const camera = await Camera.findByPk(cameraId);
    return camera ? camera.tenant_id : null;
  }

  async getBranchIdFromCamera(cameraId) {
    const camera = await Camera.findByPk(cameraId);
    return camera ? camera.branch_id : null;
  }

  getCacheKey(cameraId, zoneId) {
    return `occupancy_${cameraId}_${zoneId || 'global'}`;
  }

  updateCache(cameraId, zoneId, occupancy) {
    const cacheKey = this.getCacheKey(cameraId, zoneId);
    this.occupancyCache.set(cacheKey, {
      data: occupancy,
      timestamp: Date.now()
    });
  }

  calculateCumulativeOccupancy(history) {
    let cumulative = 0;
    
    return history.map(item => {
      const entries = parseInt(item.entries) || 0;
      const exits = parseInt(item.exits) || 0;
      
      cumulative += (entries - exits);
      
      return {
        timestamp: item.time_bucket,
        entries,
        exits,
        occupancy: Math.max(0, cumulative) // Ensure occupancy doesn't go negative
      };
    });
  }

  getStartDateForPeriod(period) {
    const now = new Date();
    
    switch (period) {
      case 'today':
        now.setHours(0, 0, 0, 0);
        return now;
      case 'yesterday':
        now.setDate(now.getDate() - 1);
        now.setHours(0, 0, 0, 0);
        return now;
      case 'week':
        now.setDate(now.getDate() - 7);
        return now;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        return now;
      default:
        now.setHours(0, 0, 0, 0);
        return now;
    }
  }

  /**
   * Manual correction of occupancy count
   */
  async correctOccupancy(cameraId, zoneId, newCount, reason) {
    try {
      const occupancy = await CurrentOccupancy.findOne({
        where: { 
          camera_id: cameraId, 
          zone_id: zoneId || null 
        }
      });

      if (occupancy) {
        const oldCount = occupancy.current_count;
        
        await occupancy.update({
          current_count: Math.max(0, newCount),
          last_updated: new Date()
        });

        // Log the correction
        await PeopleCountLog.create({
          camera_id: cameraId,
          tenant_id: occupancy.tenant_id,
          branch_id: occupancy.branch_id,
          zone_id: zoneId,
          direction: 'CORRECTION',
          detection_time: new Date(),
          confidence_score: 1.0,
          metadata: {
            correction: {
              old_count: oldCount,
              new_count: newCount,
              reason: reason,
              type: 'manual_correction'
            }
          }
        });

        // Clear cache
        const cacheKey = this.getCacheKey(cameraId, zoneId);
        this.occupancyCache.delete(cacheKey);

        console.log(`Corrected occupancy for camera ${cameraId}: ${oldCount} -> ${newCount}`);
        return occupancy;
      }

      return null;
    } catch (error) {
      console.error('Error correcting occupancy:', error);
      throw new Error(`Failed to correct occupancy: ${error.message}`);
    }
  }
}

module.exports = new OccupancyService();