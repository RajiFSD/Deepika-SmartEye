const productConfigService = require("@services/productConfigService");
const ResponseHandler = require("@utils/responseHandler");
const { productConfigValidator } = require("@validators");

class ProductConfigController {
  async create(req, res) {
    try {
      const { error } = productConfigValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);
      const result = await productConfigService.create(req.body);
      return ResponseHandler.created(res, result, "Product configuration created");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await productConfigService.getAll(req.query);
      return ResponseHandler.success(res, result);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getById(req, res) {
    try {
      const result = await productConfigService.getById(req.params.id);
      if (!result) return ResponseHandler.notFound(res, "Config not found");
      return ResponseHandler.success(res, result);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async update(req, res) {
    try {
      const { error } = productConfigValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);
      const result = await productConfigService.update(req.params.id, req.body);
      return ResponseHandler.success(res, result, "Config updated successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await productConfigService.delete(req.params.id);
      return ResponseHandler.success(res, result, "Config deleted successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }
}

module.exports = new ProductConfigController();
