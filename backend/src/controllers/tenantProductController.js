const tenantProductService = require("@services/tenantProductService");
const ResponseHandler = require("@utils/responseHandler");
const { tenantProductValidator } = require("@validators");

class TenantProductController {
  async create(req, res) {
    try {
      const { error } = tenantProductValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const record = await tenantProductService.create(req.body);
      return ResponseHandler.created(res, record, "Tenant product mapping created successfully");
    } catch (err) {
      console.error("Create tenant product error:", err);
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getAll(req, res) {
    try {
      const records = await tenantProductService.getAll(req.query);
      return ResponseHandler.success(res, records);
    } catch (err) {
      console.error("Get tenant product error:", err);
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getById(req, res) {
    try {
      const record = await tenantProductService.getById(req.params.id);
      if (!record) return ResponseHandler.notFound(res, "Tenant product not found");
      return ResponseHandler.success(res, record);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async update(req, res) {
    try {
      const { error } = tenantProductValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const record = await tenantProductService.update(req.params.id, req.body);
      return ResponseHandler.success(res, record, "Tenant product updated successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await tenantProductService.delete(req.params.id);
      return ResponseHandler.success(res, result, "Tenant product deleted successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }
}

module.exports = new TenantProductController();
