const alertService = require("@services/alertService");
const ResponseHandler = require("@utils/responseHandler");
const { alertValidator } = require("@validators");

class AlertController {
  async create(req, res) {
    try {
      const { error } = alertValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const alert = await alertService.createAlert(req.body);
      return ResponseHandler.created(res, alert, "Alert created successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit, status } = req.query;
      const alerts = await alertService.getAllAlerts({ page, limit, status });
      return ResponseHandler.success(res, alerts);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const alert = await alertService.getAlertById(req.params.id);
      if (!alert) return ResponseHandler.notFound(res, "Alert not found");

      return ResponseHandler.success(res, alert);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async update(req, res) {
    try {
      const { error } = alertValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const alert = await alertService.updateAlert(req.params.id, req.body);
      return ResponseHandler.success(res, alert, "Alert updated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await alertService.deleteAlert(req.params.id);
      return ResponseHandler.success(res, result, "Alert deleted successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByTenant(req, res) {
    try {
      const { page, limit, status } = req.query;
      const alerts = await alertService.getAlertsByTenant(req.params.tenantId, { page, limit, status });
      return ResponseHandler.success(res, alerts);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByCamera(req, res) {
    try {
      const { page, limit, status } = req.query;
      const alerts = await alertService.getAlertsByCamera(req.params.cameraId, { page, limit, status });
      return ResponseHandler.success(res, alerts);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async resolveAlert(req, res) {
    try {
      const alert = await alertService.resolveAlert(req.params.id);
      return ResponseHandler.success(res, alert, "Alert resolved successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new AlertController();