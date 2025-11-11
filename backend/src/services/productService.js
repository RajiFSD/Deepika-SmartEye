const { Product } = require("@models");

class ProductService {
  async create(data) {
    return await Product.create(data);
  }

  async getAll({ page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Product.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });
    return {
      products: rows,
      pagination: { total: count, page: +page, limit: +limit },
    };
  }

  async getById(id) {
    return await Product.findByPk(id);
  }

  async update(id, data) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error("Product not found");
    await product.update(data);
    return product;
  }

  async delete(id) {
    const product = await Product.findByPk(id);
    if (!product) throw new Error("Product not found");
    await product.destroy();
    return { success: true };
  }
}

module.exports = new ProductService();
