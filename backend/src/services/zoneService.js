const { ZoneConfig, Camera, Tenant, User, AlertThreshold } = require("@models");

class ZoneService {
  async createZone(data) {
    try {
      return await ZoneConfig.create(data);
    } catch (error) {
      console.error("Error creating zone:", error);
      throw new Error("Failed to create zone");
    }
  }

  async getAllZones({ page = 1, limit = 10, is_active } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = is_active !== undefined ? { is_active: is_active === 'true' } : {};
      
      return await ZoneConfig.findAndCountAll({
        where,
        include: [
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' },
          { model: User, as: 'creator' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching zones:", error);
      throw new Error("Failed to retrieve zones");
    }
  }

  async getZoneById(id) {
    try {
      return await ZoneConfig.findByPk(id, {
        include: [
          { model: Camera, as: 'camera' },
          { model: Tenant, as: 'tenant' },
          { model: User, as: 'creator' },
          { model: AlertThreshold, as: 'alertThresholds' }
        ]
      });
    } catch (error) {
      console.error("Error fetching zone by ID:", error);
      throw new Error("Failed to retrieve zone");
    }
  }

  async updateZone(id, data) {
    try {
      const zone = await ZoneConfig.findByPk(id);
      if (!zone) throw new Error("Zone not found");

      await zone.update(data);
      return zone;
    } catch (error) {
      console.error("Error updating zone:", error);
      throw new Error("Failed to update zone");
    }
  }

  async deleteZone(id) {
    try {
      const zone = await ZoneConfig.findByPk(id);
      if (!zone) throw new Error("Zone not found");

      await zone.destroy();
      return { message: "Zone deleted successfully" };
    } catch (error) {
      console.error("Error deleting zone:", error);
      throw new Error("Failed to delete zone");
    }
  }

  async getZonesByCamera(cameraId, { page = 1, limit = 10, is_active } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { camera_id: cameraId };
      if (is_active !== undefined) where.is_active = is_active === 'true';

      return await ZoneConfig.findAndCountAll({
        where,
        include: [
          { model: Tenant, as: 'tenant' },
          { model: User, as: 'creator' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching zones by camera:", error);
      throw new Error("Failed to retrieve zones");
    }
  }

  async getZonesByTenant(tenantId, { page = 1, limit = 10, is_active } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { tenant_id: tenantId };
      if (is_active !== undefined) where.is_active = is_active === 'true';

      return await ZoneConfig.findAndCountAll({
        where,
        include: [
          { model: Camera, as: 'camera' },
          { model: User, as: 'creator' }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });
    } catch (error) {
      console.error("Error fetching zones by tenant:", error);
      throw new Error("Failed to retrieve zones");
    }
  }

  async updateZoneStatus(id, is_active) {
    try {
      const zone = await ZoneConfig.findByPk(id);
      if (!zone) throw new Error("Zone not found");

      await zone.update({ is_active });
      return zone;
    } catch (error) {
      console.error("Error updating zone status:", error);
      throw new Error("Failed to update zone status");
    }
  }

  async validateZonePolygon(polygonJson) {
    try {
      if (!Array.isArray(polygonJson)) {
        throw new Error("Polygon must be an array of coordinates");
      }

      if (polygonJson.length < 3) {
        throw new Error("Polygon must have at least 3 points");
      }

      // Validate each coordinate
      polygonJson.forEach((point, index) => {
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
          throw new Error(`Point ${index} must have numeric x and y coordinates`);
        }
        
        if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) {
          throw new Error(`Point ${index} coordinates must be normalized between 0 and 1`);
        }
      });

      return true;
    } catch (error) {
      console.error("Error validating zone polygon:", error);
      throw new Error(`Zone validation failed: ${error.message}`);
    }
  }

  async getZoneOccupancy(zoneId) {
    try {
      const zone = await ZoneConfig.findByPk(zoneId, {
        include: [
          { 
            model: Camera, 
            as: 'camera',
            include: [{ model: CurrentOccupancy, as: 'currentOccupancies' }]
          }
        ]
      });

      if (!zone) throw new Error("Zone not found");

      const zoneOccupancy = zone.camera.currentOccupancies.find(
        occupancy => occupancy.zone_id === zoneId
      );

      return zoneOccupancy || { current_count: 0, total_entries: 0, total_exits: 0 };
    } catch (error) {
      console.error("Error fetching zone occupancy:", error);
      throw new Error("Failed to retrieve zone occupancy");
    }
  }
}

module.exports = new ZoneService();