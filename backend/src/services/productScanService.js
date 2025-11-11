const { ProductScanResult, Product } = require("@models");

class ProductScanService {
  async create(data) {
    return await ProductScanResult.create(data);
  }

  async getAll({ page = 1, limit = 10, tenant_id }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;

    const { count, rows } = await ProductScanResult.findAndCountAll({
      where,
      include: [{ model: Product, as: "product", attributes: ["product_name", "product_type"] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    return { scans: rows, pagination: { total: count, page: +page, limit: +limit } };
  }

  async getById(id) {
    return await ProductScanResult.findByPk(id, {
      include: [{ model: Product, as: "product" }],
    });
  }

  async delete(id) {
    const record = await ProductScanResult.findByPk(id);
    if (!record) throw new Error("Scan record not found");
    await record.destroy();
    return { success: true };
  }
}

module.exports = new ProductScanService();
