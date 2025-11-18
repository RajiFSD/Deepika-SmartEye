// controllers/fireAlert.controller.js
const fireAlertService = require("@services/fireAlert.service");
const { Camera } = require("@models");

class FireAlertController {
  async receiveAlert(req, res) {
    try {
      console.log("receive alert in controller");
      const alertData = req.body;
      console.log('Received fire alert:', alertData);

      // Get camera details to populate tenant_id and branch_id
      const camera = await Camera.findByPk(alertData.camera_id);
      if (!camera) {
        return res.status(404).json({ 
          success: false, 
          message: 'Camera not found' 
        });
      }

      const alertPayload = {
        tenant_id: camera.tenant_id,
        branch_id: camera.branch_id,
        camera_id: alertData.camera_id,
        alert_timestamp: new Date(alertData.timestamp),
        confidence: parseFloat(alertData.confidence),
        snapshot_path: alertData.snapshot_path,
        snapshot_base64: alertData.snapshot_base64,
        bounding_boxes: alertData.bounding_boxes,
        fire_type: alertData.fire_type || "flame",
        severity: this.calculateSeverity(alertData.confidence),
        status: "active"
      };

      const savedAlert = await fireAlertService.createAlert(alertPayload);

      // Emit real-time notification (if you have WebSocket setup)
      this.emitFireAlert(savedAlert);

      return res.json({ 
        success: true, 
        message: 'Alert saved successfully',
        data: savedAlert 
      });
    } catch (err) {
      console.error("Fire alert save error:", err);
      return res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  async getAlerts(req, res) {
    try {
      console.log("get alerts in controller");
      const filters = req.query;
      
      // Convert status to array if needed for multiple status filtering
      if (filters.status && filters.status.includes(',')) {
        filters.statuses = filters.status.split(',');
        delete filters.status;
      }

      const result = await fireAlertService.getAlerts(filters);
      
      res.json({ 
        success: true, 
        data: result.alerts,
        pagination: {
          page: result.page,
          total: result.total,
          totalPages: result.totalPages
        }
      });
    } catch (err) {
      console.error("Get alerts error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  async getAlertDetails(req, res) {
    try {
      console.log("get alert details in controller");
      const alert = await fireAlertService.getAlertById(req.params.alertId);

      if (!alert) {
        return res.status(404).json({ 
          success: false, 
          message: "Alert not found" 
        });
      }

      res.json({ 
        success: true, 
        data: alert 
      });
    } catch (err) {
      console.error("Get alert details error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  async resolveAlert(req, res) {
    try {
      console.log("resolve alert in controller");
      const { alertId } = req.params;
      const { notes } = req.body;

      const updatedAlert = await fireAlertService.resolveAlert(alertId, notes);

      res.json({ 
        success: true, 
        message: "Alert resolved successfully",
        data: updatedAlert 
      });
    } catch (err) {
      console.error("Resolve alert error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  async markFalsePositive(req, res) {
    try {
      console.log("mark false positive in controller");
      const { alertId } = req.params;
      const { reason } = req.body;

      const updatedAlert = await fireAlertService.markFalsePositive(alertId, reason);

      res.json({
        success: true,
        message: "Alert marked as false positive",
        data: updatedAlert
      });
    } catch (err) {
      console.error("Mark false positive error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  async getStats(req, res) {
    try {
      console.log("get stats in controller");
      const filters = req.query;
      const stats = await fireAlertService.getStats(filters);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (err) {
      console.error("Get stats error:", err);
      res.status(500).json({ 
        success: false, 
        message: err.message 
      });
    }
  }

  // controllers/fireAlert.controller.js - Enhanced version

async getHourlyAnalytics(req, res) {
  try {
    console.log("get hourly analytics in controller");
    const { date, days = 1, group_by = 'hour' } = req.query;
    
    let startDate, endDate;
    
    if (date) {
      startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
    }

    console.log(`Generating ${group_by} analytics from ${startDate} to ${endDate}`);

    const analyticsData = await fireAlertService.getHourlyAnalytics(
      startDate, 
      endDate, 
      group_by
    );

    res.json({
      success: true,
      data: analyticsData,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      group_by: group_by
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

  // Helper method to calculate severity based on confidence
  calculateSeverity(confidence) {
    if (confidence >= 0.9) return "critical";
    if (confidence >= 0.8) return "high";
    if (confidence >= 0.7) return "medium";
    return "low";
  }

  // Method to emit real-time notifications (implement based on your WebSocket setup)
  emitFireAlert(alert) {
    // If you have WebSocket/Socket.io setup:
    // io.emit('fire_alert', alert);
    
    console.log(`🚨 FIRE ALERT: Camera ${alert.camera_id} - Confidence: ${(alert.confidence * 100).toFixed(0)}%`);
  }
}

module.exports = new FireAlertController();