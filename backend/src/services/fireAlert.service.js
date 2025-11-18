// services/fireAlert.service.js
const { FireAlert, Camera, Branch, Tenant } = require("@models");
const { Op } = require("sequelize");
const { sequelize } = require("@config/database");

class FireAlertService {
  
  async createAlert(data) {
    try {
      console.log('Creating fire alert with data:',data.tenant_id, data.branch_id, data.camera_id);
      
      // If we don't have tenant_id and branch_id, try to get from camera
      if (!data.tenant_id || !data.branch_id) {
        const camera = await Camera.findByPk(data.camera_id);
        if (camera) {
          data.tenant_id = data.tenant_id || camera.tenant_id;
          data.branch_id = data.branch_id || camera.branch_id;
        }
      }

      const alert = await FireAlert.create(data);
      console.log('Fire alert created successfully:', alert.firealert_id);
      return alert;
    } catch (error) {
      console.error('Error creating fire alert:', error);
      throw error;
    }
  }

  async getAlerts(filters = {}) {
    try {
      console.log("get alerts in service");
      console.log('Getting fire alerts with filters:', filters);
      const where = {};
      const include = [
        {
          model: Camera,
          as: 'camera',
          attributes: ['camera_id', 'camera_name', 'camera_code'],
          include: [
            {
              model: Branch,
              as: 'branch',
              attributes: ['branch_id', 'branch_name']
            }
          ]
        }
      ];

      if (filters.camera_id) where.camera_id = filters.camera_id;
      if (filters.status) where.status = filters.status;
      
      // Handle multiple statuses
      if (filters.statuses && Array.isArray(filters.statuses)) {
        where.status = { [Op.in]: filters.statuses };
      }

      if (filters.from_date || filters.to_date) {
        where.alert_timestamp = {};
        if (filters.from_date)
          where.alert_timestamp[Op.gte] = new Date(filters.from_date);
        if (filters.to_date)
          where.alert_timestamp[Op.lte] = new Date(filters.to_date);
      }

      // Filter by tenant if provided
      if (filters.tenant_id) {
        include[0].include[0].where = { tenant_id: filters.tenant_id };
      }

      const limit = parseInt(filters.limit || 50);
      const offset = filters.page ? (parseInt(filters.page) - 1) * limit : 0;

      const result = await FireAlert.findAndCountAll({
        where,
        include,
        order: [["alert_timestamp", "DESC"]],
        limit,
        offset,
        distinct: true
      });

      return {
        alerts: result.rows,
        total: result.count,
        page: filters.page ? parseInt(filters.page) : 1,
        totalPages: Math.ceil(result.count / limit)
      };
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }

  async getAlertById(id) {
    try {
      return await FireAlert.findByPk(id, {
        include: [
          {
            model: Camera,
            as: 'camera',
            attributes: ['camera_id', 'camera_name', 'camera_code'],
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: ['branch_id', 'branch_name']
              },
              {
                model: Tenant,
                as: 'tenant',
                attributes: ['tenant_id', 'tenant_name']
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Error getting alert by id:', error);
      throw error;
    }
  }

  async resolveAlert(id, notes) {
    try {
      const [affectedCount] = await FireAlert.update(
        {
          status: "resolved",
          resolved_at: new Date(),
          remarks: notes
        },
        { where: { firealert_id: id } }
      );
      
      if (affectedCount === 0) {
        throw new Error('Alert not found');
      }
      
      return await this.getAlertById(id);
    } catch (error) {
      console.error('Error resolving alert:', error);
      throw error;
    }
  }

  async markFalsePositive(id, reason) {
    try {
      const [affectedCount] = await FireAlert.update(
        {
          status: "false_positive",
          resolved_at: new Date(),
          remarks: reason
        },
        { where: { firealert_id: id } }
      );
      
      if (affectedCount === 0) {
        throw new Error('Alert not found');
      }
      
      return await this.getAlertById(id);
    } catch (error) {
      console.error('Error marking false positive:', error);
      throw error;
    }
  }

  // services/fireAlert.service.js - Enhanced analytics

async getHourlyAnalytics(startDate, endDate, groupBy = 'hour') {
  try {
    console.log('Service---Generating hourly analytics from', startDate, 'to', endDate, 'grouped by', groupBy);
    let formatString, groupByField;
    
    switch (groupBy) {
      case 'hour':
        formatString = '%H:00';
        groupByField = 'HOUR(alert_timestamp)';
        break;
      case 'day':
        formatString = '%Y-%m-%d';
        groupByField = 'DATE(alert_timestamp)';
        break;
      case 'week':
        formatString = '%Y-%u';
        groupByField = 'YEARWEEK(alert_timestamp)';
        break;
      default:
        formatString = '%H:00';
        groupByField = 'HOUR(alert_timestamp)';
    }

    const query = `
      SELECT 
        DATE_FORMAT(alert_timestamp, '${formatString}') as time_period,
        COUNT(*) as alerts,
        SUM(CASE WHEN status = 'false_positive' THEN 1 ELSE 0 END) as false_alerts,
        AVG(confidence) * 100 as avg_confidence,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts
      FROM fire_alerts 
      WHERE alert_timestamp BETWEEN ? AND ?
      GROUP BY ${groupByField}
      ORDER BY time_period
    `;

    const [results] = await sequelize.query(query, {
      replacements: [startDate, endDate]
    });

    return results.map(row => ({
      time: row.time_period,
      alerts: parseInt(row.alerts),
      false_alerts: parseInt(row.false_alerts),
      active_alerts: parseInt(row.active_alerts),
      avg_confidence: parseFloat(row.avg_confidence) || 0
    }));

  } catch (error) {
    console.error('Error generating analytics:', error);
    throw error;
  }
}

  async getStats(filters = {}) {
    try {
      const where = {};
      
      if (filters.tenant_id) {
        // We'll handle tenant filtering through camera association
        where['$camera.branch.tenant_id$'] = filters.tenant_id;
      }

      if (filters.from_date || filters.to_date) {
        where.alert_timestamp = {};
        if (filters.from_date)
          where.alert_timestamp[Op.gte] = new Date(filters.from_date);
        if (filters.to_date)
          where.alert_timestamp[Op.lte] = new Date(filters.to_date);
      }

      const stats = await FireAlert.findAll({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('firealert_id')), 'total_alerts'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'active' THEN 1 ELSE 0 END")), 'active_alerts'],
          [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'false_positive' THEN 1 ELSE 0 END")), 'false_positives'],
          [sequelize.fn('AVG', sequelize.col('confidence')), 'avg_confidence']
        ],
        include: [
          {
            model: Camera,
            as: 'camera',
            attributes: [],
            include: [
              {
                model: Branch,
                as: 'branch',
                attributes: []
              }
            ]
          }
        ],
        raw: true
      });

      const result = stats[0] || {};
      
      return {
        total_alerts: parseInt(result.total_alerts) || 0,
        active_alerts: parseInt(result.active_alerts) || 0,
        false_positives: parseInt(result.false_positives) || 0,
        avg_confidence: parseFloat(result.avg_confidence) * 100 || 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new FireAlertService();