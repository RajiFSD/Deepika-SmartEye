const productScanService = require("@services/productScanService");
const ResponseHandler = require("@utils/responseHandler");
const { productScanValidator } = require("@validators");

class ProductScanResultController {
  async create(req, res) {
    try {
      const { error } = productScanValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const result = await productScanService.create(req.body);
      return ResponseHandler.created(res, result, "Product scan record created");
    } catch (err) {
      console.error("Create scan result error:", err);
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getAll(req, res) {
    try {
      const result = await productScanService.getAll(req.query);
      return ResponseHandler.success(res, result);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getById(req, res) {
    try {
      const result = await productScanService.getById(req.params.id);
      if (!result) return ResponseHandler.notFound(res, "Scan record not found");
      return ResponseHandler.success(res, result);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await productScanService.delete(req.params.id);
      return ResponseHandler.success(res, result, "Scan record deleted");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }
}

module.exports = new ProductScanResultController();
