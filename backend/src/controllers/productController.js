const productService = require("@services/productService");
const ResponseHandler = require("@utils/responseHandler");
const { productValidator } = require("@validators");

class ProductController {
  async create(req, res) {
    try {
      const { error } = productValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const product = await productService.create(req.body);
      return ResponseHandler.created(res, product, "Product created successfully");
    } catch (err) {
      console.error("Product creation error:", err);
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getAll(req, res) {
    try {
      const products = await productService.getAll(req.query);
      return ResponseHandler.success(res, products);
    } catch (err) {
      console.error("Get products error:", err);
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async getById(req, res) {
    try {
      const product = await productService.getById(req.params.id);
      if (!product) return ResponseHandler.notFound(res, "Product not found");
      return ResponseHandler.success(res, product);
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async update(req, res) {
    try {
      const { error } = productValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const updated = await productService.update(req.params.id, req.body);
      return ResponseHandler.success(res, updated, "Product updated successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await productService.delete(req.params.id);
      return ResponseHandler.success(res, result, "Product deleted successfully");
    } catch (err) {
      return ResponseHandler.internalServerError(res, err.message);
    }
  }
}

module.exports = new ProductController();
