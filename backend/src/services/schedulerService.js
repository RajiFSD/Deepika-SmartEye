const cron = require('node-cron');
const { CurrentOccupancy, PeopleCountLog, AlertLog, DetectionAccuracy } = require('@models');
const { Op } = require('sequelize');
const emailService = require('./emailService');
const uploadService = require('./uploadService');

class SchedulerService {
  constructor() {
    this.jobs = [];
  }

  init() {
    this.scheduleDailyReset();
    this.scheduleCleanupTasks();
    this.scheduleAccuracyCalculation();
    this.scheduleAlertMonitoring();
    this.scheduleReportGeneration();
  }

  // Reset occupancy counters daily at midnight
  scheduleDailyReset() {
    const job = cron.schedule('0 0 * * *', async () => {
      try {
        console.log('Running daily occupancy reset...');
        
        await CurrentOccupancy.update({
          current_count: 0,
          total_entries: 0,
          total_exits: 0,
          reset_at: new Date()
        }, {
          where: {}
        });

        console.log('Daily occupancy reset completed');
      } catch (error) {
        console.error('Error in daily reset:', error);
      }
    });

    this.jobs.push(job);
  }

  // Clean up old logs and files weekly
  scheduleCleanupTasks() {
    const job = cron.schedule('0 2 * * 0', async () => { // Sundays at 2 AM
      try {
        console.log('Running cleanup tasks...');
        
        // Delete logs older than 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        await PeopleCountLog.destroy({
          where: {
            detection_time: { [Op.lt]: ninetyDaysAgo }
          }
        });

        await AlertLog.destroy({
          where: {
            alert_time: { [Op.lt]: ninetyDaysAgo },
            status: 'resolved'
          }
        });

        // Clean up old uploaded files
        await uploadService.cleanupOldFiles(30);

        console.log('Cleanup tasks completed');
      } catch (error) {
        console.error('Error in cleanup tasks:', error);
      }
    });

    this.jobs.push(job);
  }

  // Calculate detection accuracy daily
  scheduleAccuracyCalculation() {
    const job = cron.schedule('0 1 * * *', async () => { // Daily at 1 AM
      try {
        console.log('Calculating detection accuracy...');
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // This would integrate with your detection system
        // to calculate accuracy metrics
        await this.calculateDailyAccuracy(yesterday, today);

        console.log('Detection accuracy calculation completed');
      } catch (error) {
        console.error('Error calculating accuracy:', error);
      }
    });

    this.jobs.push(job);
  }

  // Monitor and auto-resolve old alerts
  scheduleAlertMonitoring() {
    const job = cron.schedule('*/15 * * * *', async () => { // Every 15 minutes
      try {
        console.log('Monitoring alerts...');
        
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // Auto-resolve alerts that have been triggered for over 1 hour
        // and where occupancy is now below threshold
        const oldAlerts = await AlertLog.findAll({
          where: {
            status: 'triggered',
            alert_time: { [Op.lt]: oneHourAgo }
          },
          include: ['alertThreshold']
        });

        for (const alert of oldAlerts) {
          const currentOccupancy = await this.getCurrentOccupancy(
            alert.camera_id, 
            alert.alertThreshold.zone_id
          );

          if (currentOccupancy < alert.max_occupancy) {
            await alert.update({
              status: 'resolved',
              resolved_at: new Date()
            });
          }
        }

        console.log('Alert monitoring completed');
      } catch (error) {
        console.error('Error in alert monitoring:', error);
      }
    });

    this.jobs.push(job);
  }

  // Generate and send scheduled reports
  scheduleReportGeneration() {
    // Weekly report every Monday at 6 AM
    const job = cron.schedule('0 6 * * 1', async () => {
      try {
        console.log('Generating weekly reports...');
        
        // Generate and email weekly occupancy reports to admins
        await this.generateWeeklyReports();

        console.log('Weekly report generation completed');
      } catch (error) {
        console.error('Error generating weekly reports:', error);
      }
    });

    this.jobs.push(job);
  }

  // Helper methods
  async calculateDailyAccuracy(startDate, endDate) {
    // Implementation depends on your accuracy tracking system
    // This would compare detections with ground truth data
  }

  async getCurrentOccupancy(cameraId, zoneId) {
    const occupancy = await CurrentOccupancy.findOne({
      where: { camera_id: cameraId, zone_id: zoneId }
    });
    return occupancy ? occupancy.current_count : 0;
  }

  async generateWeeklyReports() {
    // Generate weekly summary reports and email to administrators
    // Implementation depends on your reporting requirements
  }

  stopAllJobs() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }
}

module.exports = new SchedulerService();