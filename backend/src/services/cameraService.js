const { Camera, Tenant, Branch, ZoneConfig, sequelize } = require("@models");
const { Op } = require("sequelize");

class CameraService {
  async createCamera(data) {
    try {
      console.log("📝 Creating camera with data:", data);

      // ✅ Validate required fields
      if (!data.tenant_id) throw new Error("tenant_id is required");
      if (!data.branch_id) throw new Error("branch_id is required");
      if (!data.camera_name) throw new Error("camera_name is required");
      if (!data.camera_code) throw new Error("camera_code is required");

      // ✅ Check if camera code already exists for this tenant
      const existingCamera = await Camera.findOne({
        where: {
          tenant_id: data.tenant_id,
          camera_code: data.camera_code
        }
      });

      if (existingCamera) {
        throw new Error(`Camera with code '${data.camera_code}' already exists for this tenant`);
      }

      // ✅ Verify branch exists and belongs to tenant
      const branch = await Branch.findOne({
        where: {
          branch_id: data.branch_id,
          tenant_id: data.tenant_id
        }
      });

      if (!branch) {
        throw new Error("Branch not found or does not belong to this tenant");
      }

      const camera = await Camera.create(data);
      console.log("✅ Camera created successfully:", camera.camera_id);
      
      return camera;
    } catch (error) {
      console.error("❌ Error creating camera:", error.message);
      throw error;
    }
  }

  async getAllCameras({ page = 1, limit = 10, is_active, tenant_id } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = {};
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }
      
      if (tenant_id) {
        where.tenant_id = tenant_id;
      }
      
      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'city']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras:", error);
      throw new Error("Failed to retrieve cameras: " + error.message);
    }
  }

  async getCameraById(id) {
    try {
      const camera = await Camera.findByPk(id, {
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'address', 'city']
          },
          { 
            model: ZoneConfig, 
            as: 'zones',
            where: { is_active: true },
            required: false
          }
        ]
      });

      if (!camera) {
        throw new Error("Camera not found");
      }

      return camera;
    } catch (error) {
      console.error("Error fetching camera by ID:", error);
      throw error;
    }
  }

  async updateCamera(id, data) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      // ✅ If updating camera_code, check for duplicates
      if (data.camera_code && data.camera_code !== camera.camera_code) {
        const existingCamera = await Camera.findOne({
          where: {
            tenant_id: camera.tenant_id,
            camera_code: data.camera_code,
            camera_id: { [Op.ne]: id }
          }
        });

        if (existingCamera) {
          throw new Error(`Camera with code '${data.camera_code}' already exists`);
        }
      }

      // ✅ If updating branch, verify it belongs to the same tenant
      if (data.branch_id && data.branch_id !== camera.branch_id) {
        const branch = await Branch.findOne({
          where: {
            branch_id: data.branch_id,
            tenant_id: camera.tenant_id
          }
        });

        if (!branch) {
          throw new Error("Branch not found or does not belong to this tenant");
        }
      }

      await camera.update(data);
      
      // Return updated camera with associations
      return await this.getCameraById(id);
    } catch (error) {
      console.error("Error updating camera:", error);
      throw error;
    }
  }

  async deleteCamera(id) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      // ✅ Optional: Check if camera has associated zones or data
      const zones = await ZoneConfig.findAll({
        where: { camera_id: id }
      });

      if (zones.length > 0) {
        throw new Error("Cannot delete camera with existing zones. Delete zones first.");
      }

      await camera.destroy();
      return { 
        success: true,
        message: "Camera deleted successfully",
        camera_id: id
      };
    } catch (error) {
      console.error("Error deleting camera:", error);
      throw error;
    }
  }

  async getCamerasByTenant(tenantId, { page = 1, limit = 10, is_active } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { tenant_id: tenantId };
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras by tenant:", error);
      throw new Error("Failed to retrieve cameras");
    }
  }

  async getCamerasByBranch(branchId, { page = 1, limit = 10, is_active } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { branch_id: branchId };
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras by branch:", error);
      throw new Error("Failed to retrieve cameras");
    }
  }

  async updateCameraStatus(id, is_active) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      await camera.update({ is_active });
      
      return await this.getCameraById(id);
    } catch (error) {
      console.error("Error updating camera status:", error);
      throw error;
    }
  }

  async getCameraStats(tenantId) {
    try {
      const totalCameras = await Camera.count({
        where: { tenant_id: tenantId }
      });

      const activeCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          is_active: true 
        }
      });

      const camerasByBranch = await Camera.findAll({
        where: { tenant_id: tenantId },
        attributes: [
          'branch_id',
          [sequelize.fn('COUNT', sequelize.col('camera_id')), 'count']
        ],
        include: [
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_name']
          }
        ],
        group: ['branch_id', 'branch.branch_id', 'branch.branch_name']
      });

      return {
        total: totalCameras,
        active: activeCameras,
        inactive: totalCameras - activeCameras,
        byBranch: camerasByBranch
      };
    } catch (error) {
      console.error("Error fetching camera stats:", error);
      throw new Error("Failed to retrieve camera statistics");
    }
  }

  async searchCameras(searchTerm, tenantId) {
    try {
      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId,
          [Op.or]: [
            { camera_name: { [Op.like]: `%${searchTerm}%` } },
            { camera_code: { [Op.like]: `%${searchTerm}%` } },
            { location_description: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        include: [
          { model: Branch, as: 'branch' }
        ],
        limit: 20
      });

      return cameras;
    } catch (error) {
      console.error("Error searching cameras:", error);
      throw new Error("Failed to search cameras");
    }
  }
}

module.exports = new CameraService();