const { ProductConfiguration, Product } = require("@models");

class ProductConfigService {
  async create(data) {
    return await ProductConfiguration.create(data);
  }

  async getAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { rows, count } = await ProductConfiguration.findAndCountAll({
      include: [{ model: Product, as: "product", attributes: ["product_name"] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });
    return { configs: rows, pagination: { page, limit, total: count } };
  }

  async getById(id) {
    return await ProductConfiguration.findByPk(id, {
      include: [{ model: Product, as: "product" }],
    });
  }

  async update(id, data) {
    const config = await ProductConfiguration.findByPk(id);
    if (!config) throw new Error("Configuration not found");
    await config.update(data);
    return config;
  }

  async delete(id) {
    const config = await ProductConfiguration.findByPk(id);
    if (!config) throw new Error("Configuration not found");
    await config.destroy();
    return { success: true };
  }
}

module.exports = new ProductConfigService();
