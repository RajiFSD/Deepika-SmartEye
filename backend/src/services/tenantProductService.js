const { TenantProduct, Product, ProductConfiguration } = require("@models");

class TenantProductService {
  async create(data) {
    return await TenantProduct.create(data);
  }

  async getAll({ page = 1, limit = 10, tenant_id }) {
    const offset = (page - 1) * limit;
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;

    const { count, rows } = await TenantProduct.findAndCountAll({
      where,
      include: [
        { model: Product, as: "product", attributes: ["id", "product_name", "product_type"] },
        { model: ProductConfiguration, as: "configuration", attributes: ["id", "layers_count", "racks_per_layer"] },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });

    return { tenantProducts: rows, pagination: { total: count, page: +page, limit: +limit } };
  }

  async getById(id) {
    return await TenantProduct.findByPk(id, {
      include: [
        { model: Product, as: "product" },
        { model: ProductConfiguration, as: "configuration" },
      ],
    });
  }

  async update(id, data) {
    const record = await TenantProduct.findByPk(id);
    if (!record) throw new Error("Tenant product not found");
    await record.update(data);
    return record;
  }

  async delete(id) {
    const record = await TenantProduct.findByPk(id);
    if (!record) throw new Error("Tenant product not found");
    await record.destroy();
    return { success: true };
  }
}

module.exports = new TenantProductService();
