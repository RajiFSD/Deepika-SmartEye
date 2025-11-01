const { Branch, Camera, Zone } = require('@models');
const { Op } = require('sequelize');

class BranchService {
  /**
   * Get all branches for a tenant
   */
  async getBranchesByTenant(tenantId, { page = 1, limit = 10, search = '', isActive = null }) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = { tenant_id: tenantId };

      if (search) {
        whereClause[Op.or] = [
          { branch_name: { [Op.like]: `%${search}%` } },
          { branch_code: { [Op.like]: `%${search}%` } },
          { city: { [Op.like]: `%${search}%` } }
        ];
      }

      if (isActive !== null) {
        whereClause.is_active = isActive;
      }

      const { count, rows } = await Branch.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: Camera,
            as: 'cameras',
            attributes: ['camera_id', 'camera_name', 'is_active'],
            required: false
          }
        ]
      });

      return {
        branches: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw new Error('Failed to fetch branches');
    }
  }

  /**
   * Get branch by ID
   */
  async getBranchById(branchId, tenantId) {
    try {
      const branch = await Branch.findOne({
        where: { branch_id: branchId, tenant_id: tenantId },
        include: [
          {
            model: Camera,
            as: 'cameras',
            include: [
              {
                model: Zone,
                as: 'zones',
                attributes: ['zone_id', 'zone_name', 'zone_type']
              }
            ]
          }
        ]
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      return branch;
    } catch (error) {
      console.error('Error fetching branch:', error);
      throw error;
    }
  }

  /**
   * Create new branch
   */
  async createBranch(tenantId, branchData) {
    try {
      // Check if branch code exists for this tenant
      const existingBranch = await Branch.findOne({
        where: {
          tenant_id: tenantId,
          branch_code: branchData.branch_code
        }
      });

      if (existingBranch) {
        throw new Error('Branch code already exists for this tenant');
      }

      const branch = await Branch.create({
        ...branchData,
        tenant_id: tenantId
      });

      return branch;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }

  /**
   * Update branch
   */
  async updateBranch(branchId, tenantId, updateData) {
    try {
      const branch = await Branch.findOne({
        where: { branch_id: branchId, tenant_id: tenantId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Check if updating branch_code and it already exists
      if (updateData.branch_code && updateData.branch_code !== branch.branch_code) {
        const existingBranch = await Branch.findOne({
          where: {
            tenant_id: tenantId,
            branch_code: updateData.branch_code,
            branch_id: { [Op.ne]: branchId }
          }
        });

        if (existingBranch) {
          throw new Error('Branch code already exists');
        }
      }

      await branch.update(updateData);
      return branch;
    } catch (error) {
      console.error('Error updating branch:', error);
      throw error;
    }
  }

  /**
   * Delete/Deactivate branch
   */
  async deleteBranch(branchId, tenantId) {
    try {
      const branch = await Branch.findOne({
        where: { branch_id: branchId, tenant_id: tenantId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      // Soft delete
      await branch.update({ is_active: false });

      // Also deactivate all cameras in this branch
      await Camera.update(
        { is_active: false },
        { where: { branch_id: branchId } }
      );

      return { message: 'Branch and associated cameras deactivated successfully' };
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  }

  /**
   * Get branch statistics
   */
  async getBranchStats(branchId, tenantId) {
    try {
      const branch = await Branch.findOne({
        where: { branch_id: branchId, tenant_id: tenantId }
      });

      if (!branch) {
        throw new Error('Branch not found');
      }

      const stats = {
        totalCameras: await Camera.count({ where: { branch_id: branchId } }),
        activeCameras: await Camera.count({ where: { branch_id: branchId, is_active: true } }),
        totalZones: await Zone.count({
          include: [{
            model: Camera,
            where: { branch_id: branchId },
            required: true
          }]
        })
      };

      return stats;
    } catch (error) {
      console.error('Error fetching branch stats:', error);
      throw error;
    }
  }

  /**
   * Get all active branches (for dropdowns)
   */
  async getActiveBranches(tenantId) {
    try {
      const branches = await Branch.findAll({
        where: { tenant_id: tenantId, is_active: true },
        attributes: ['branch_id', 'branch_name', 'branch_code', 'city'],
        order: [['branch_name', 'ASC']]
      });

      return branches;
    } catch (error) {
      console.error('Error fetching active branches:', error);
      throw error;
    }
  }
}

module.exports = new BranchService();