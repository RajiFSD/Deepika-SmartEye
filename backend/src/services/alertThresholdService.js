const { AlertThreshold, Camera, Tenant, ZoneConfig } = require('@models');
const { Op } = require('sequelize');

class AlertThresholdService {
  async create(data) {
    // unique(camera_id, zone_id) per your model index
    const exists = await AlertThreshold.findOne({
      where: { camera_id: data.camera_id, zone_id: data.zone_id ?? null }
    });
    if (exists) throw new Error('Threshold for this camera/zone already exists');

    return AlertThreshold.create(data);
  }

  async getAll({ page = 1, limit = 10, tenant_id, camera_id, zone_id }) {
    const where = {};
    if (tenant_id) where.tenant_id = tenant_id;
    if (camera_id) where.camera_id = camera_id;
    if (zone_id !== undefined) where.zone_id = zone_id;

    const offset = (page - 1) * limit;
    const { rows, count } = await AlertThreshold.findAndCountAll({
      where,
      include: [
        { model: Camera, as: 'camera', required: false },
        { model: Tenant, as: 'tenant', required: false },
        { model: ZoneConfig, as: 'zone', required: false }
      ],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['updated_at', 'DESC']]
    });

    return {
      thresholds: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  async getById(id) {
    return AlertThreshold.findByPk(id);
  }

  async update(id, data) {
    const item = await AlertThreshold.findByPk(id);
    if (!item) throw new Error('Alert threshold not found');

    // preserve uniqueness if camera/zone is changing
    if ((data.camera_id && data.camera_id !== item.camera_id) || 
        (data.zone_id !== undefined && data.zone_id !== item.zone_id)) {
      const duplicate = await AlertThreshold.findOne({
        where: {
          camera_id: data.camera_id ?? item.camera_id,
          zone_id: data.zone_id ?? item.zone_id,
          threshold_id: { [Op.ne]: id }
        }
      });
      if (duplicate) throw new Error('Threshold for this camera/zone already exists');
    }

    await item.update(data);
    return item;
  }

  async remove(id) {
    const item = await AlertThreshold.findByPk(id);
    if (!item) return;
    await item.destroy();
  }

  async getByCamera(cameraId, { page = 1, limit = 10 } = {}) {
    return this.getAll({ page, limit, camera_id: cameraId });
  }

  async getByTenant(tenantId, { page = 1, limit = 10 } = {}) {
    return this.getAll({ page, limit, tenant_id: tenantId });
  }
}

module.exports = new AlertThresholdService();
