const { AlertLog, AlertThreshold, Camera, Tenant } = require("@models");

class AlertService {
  async createAlert(data) {
    try {
      return await AlertLog.create(data);
    } catch (error) {
      console.error("Error creating alert:", error);
      throw new Error("Failed to create alert");
    }
  }

  async getAllAlerts({ page = 1, limit = 10, status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = status ? { status } : {};
      
      return await AlertLog.findAndCountAll({
        where,
        include: [
          { model: AlertThreshold, as: 'alertThreshold' },
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['alert_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching alerts:", error);
      throw new Error("Failed to retrieve alerts");
    }
  }

  async getAlertById(id) {
    try {
      return await AlertLog.findByPk(id, {
        include: [
          { model: AlertThreshold, as: 'alertThreshold' },
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' }
        ]
      });
    } catch (error) {
      console.error("Error fetching alert by ID:", error);
      throw new Error("Failed to retrieve alert");
    }
  }

  async updateAlert(id, data) {
    try {
      const alert = await AlertLog.findByPk(id);
      if (!alert) throw new Error("Alert not found");

      await alert.update(data);
      return alert;
    } catch (error) {
      console.error("Error updating alert:", error);
      throw new Error("Failed to update alert");
    }
  }

  async deleteAlert(id) {
    try {
      const alert = await AlertLog.findByPk(id);
      if (!alert) throw new Error("Alert not found");

      await alert.destroy();
      return { message: "Alert deleted successfully" };
    } catch (error) {
      console.error("Error deleting alert:", error);
      throw new Error("Failed to delete alert");
    }
  }

  async getAlertsByTenant(tenantId, { page = 1, limit = 10, status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { tenant_id: tenantId };
      if (status) where.status = status;

      return await AlertLog.findAndCountAll({
        where,
        include: [
          { model: AlertThreshold, as: 'alertThreshold' },
          { model: Camera, as: 'camera' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['alert_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching alerts by tenant:", error);
      throw new Error("Failed to retrieve alerts");
    }
  }

  async getAlertsByCamera(cameraId, { page = 1, limit = 10, status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { camera_id: cameraId };
      if (status) where.status = status;

      return await AlertLog.findAndCountAll({
        where,
        include: [
          { model: AlertThreshold, as: 'alertThreshold' },
          { model: Tenant, as: 'tenant' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['alert_time', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching alerts by camera:", error);
      throw new Error("Failed to retrieve alerts");
    }
  }

  async resolveAlert(id) {
    try {
      const alert = await AlertLog.findByPk(id);
      if (!alert) throw new Error("Alert not found");

      await alert.update({ 
        status: 'resolved', 
        resolved_at: new Date() 
      });
      return alert;
    } catch (error) {
      console.error("Error resolving alert:", error);
      throw new Error("Failed to resolve alert");
    }
  }
}

module.exports = new AlertService();