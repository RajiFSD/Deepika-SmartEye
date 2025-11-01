const { alertThresholdValidator, queryValidator } = require('@validators');
const { ResponseHandler } = require('@utils');
const alertThresholdService = require('../services/alertThresholdService');

class AlertThresholdController {
  async create(req, res) {
    const { error } = alertThresholdValidator.create.validate(req.body);
    if (error) return ResponseHandler.badRequest(res, error.details[0].message);

    const data = await alertThresholdService.create(req.body);
    return ResponseHandler.created(res, data, 'Alert threshold created');
  }

  async getAll(req, res) {
    // supports ?page=&limit=&tenant_id=&camera_id=&zone_id=
    const { error } = queryValidator.pagination.validate(req.query);
    if (error) return ResponseHandler.badRequest(res, error.details[0].message);

    const data = await alertThresholdService.getAll(req.query);
    return ResponseHandler.success(res, data);
  }

  async getById(req, res) {
    const item = await alertThresholdService.getById(req.params.id);
    if (!item) return ResponseHandler.notFound(res, 'Alert threshold not found');
    return ResponseHandler.success(res, item);
  }

  async update(req, res) {
    const { error } = alertThresholdValidator.update.validate(req.body);
    if (error) return ResponseHandler.badRequest(res, error.details[0].message);

    const item = await alertThresholdService.update(req.params.id, req.body);
    return ResponseHandler.success(res, item, 'Alert threshold updated');
  }

  async remove(req, res) {
    await alertThresholdService.remove(req.params.id);
    return ResponseHandler.noContent(res);
  }

  async getByCamera(req, res) {
    const data = await alertThresholdService.getByCamera(req.params.cameraId, req.query);
    return ResponseHandler.success(res, data);
  }

  async getByTenant(req, res) {
    const data = await alertThresholdService.getByTenant(req.params.tenantId, req.query);
    return ResponseHandler.success(res, data);
  }
}

module.exports = new AlertThresholdController();
