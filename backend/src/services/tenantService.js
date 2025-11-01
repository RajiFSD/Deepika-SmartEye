const { Tenant, User, Branch, Camera } = require('@models');
const { Op } = require('sequelize');

class TenantService {
  /**
   * Get all tenants (super admin only)
   */
  async getAllTenants({ page = 1, limit = 10, search = '', isActive = null }) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { tenant_name: { [Op.like]: `%${search}%` } },
          { tenant_code: { [Op.like]: `%${search}%` } },
          { contact_email: { [Op.like]: `%${search}%` } }
        ];
      }

      if (isActive !== null) {
        whereClause.is_active = isActive;
      }

      const { count, rows } = await Tenant.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: [] }
      });

      return {
        tenants: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching tenants:', error);
      throw new Error('Failed to fetch tenants');
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId) {
    try {
      const tenant = await Tenant.findByPk(tenantId, {
        include: [
          {
            model: Branch,
            as: 'branches',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'city', 'is_active']
          }
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return tenant;
    } catch (error) {
      console.error('Error fetching tenant:', error);
      throw error;
    }
  }

  /**
   * Create new tenant
   */
  async createTenant(tenantData) {
    try {
      // Check if tenant code already exists
      const existingTenant = await Tenant.findOne({
        where: { tenant_code: tenantData.tenant_code }
      });

      if (existingTenant) {
        throw new Error('Tenant code already exists');
      }

      const tenant = await Tenant.create(tenantData);
      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updateData) {
    try {
      const tenant = await Tenant.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Check if updating tenant_code and it already exists
      if (updateData.tenant_code && updateData.tenant_code !== tenant.tenant_code) {
        const existingTenant = await Tenant.findOne({
          where: { 
            tenant_code: updateData.tenant_code,
            tenant_id: { [Op.ne]: tenantId }
          }
        });

        if (existingTenant) {
          throw new Error('Tenant code already exists');
        }
      }

      await tenant.update(updateData);
      return tenant;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Delete/Deactivate tenant
   */
  async deleteTenant(tenantId) {
    try {
      const tenant = await Tenant.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Soft delete - just deactivate
      await tenant.update({ is_active: false });

      return { message: 'Tenant deactivated successfully' };
    } catch (error) {
      console.error('Error deleting tenant:', error);
      throw error;
    }
  }

  /**
   * Get tenant statistics
   */
  async getTenantStats(tenantId) {
    try {
      const stats = {
        users: await User.count({ where: { tenant_id: tenantId, is_active: true } }),
        branches: await Branch.count({ where: { tenant_id: tenantId, is_active: true } }),
        cameras: await Camera.count({ where: { tenant_id: tenantId, is_active: true } }),
        totalUsers: await User.count({ where: { tenant_id: tenantId } }),
        totalBranches: await Branch.count({ where: { tenant_id: tenantId } }),
        totalCameras: await Camera.count({ where: { tenant_id: tenantId } })
      };

      return stats;
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
      throw new Error('Failed to fetch tenant statistics');
    }
  }

  /**
   * Validate tenant access
   */
  async validateTenantAccess(userId, tenantId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Super admins can access any tenant
      if (user.role === 'super_admin') {
        return true;
      }

      // Regular users can only access their own tenant
      return user.tenant_id === tenantId;
    } catch (error) {
      console.error('Error validating tenant access:', error);
      return false;
    }
  }

  /**
   * Check tenant subscription limits
   */
  async checkSubscriptionLimits(tenantId) {
    try {
      const tenant = await Tenant.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const limits = {
        basic: { cameras: 5, branches: 1, users: 3 },
        premium: { cameras: 20, branches: 5, users: 10 },
        enterprise: { cameras: 999, branches: 999, users: 999 }
      };

      const subscriptionLimits = limits[tenant.subscription_type] || limits.basic;

      const currentUsage = {
        cameras: await Camera.count({ where: { tenant_id: tenantId } }),
        branches: await Branch.count({ where: { tenant_id: tenantId } }),
        users: await User.count({ where: { tenant_id: tenantId } })
      };

      return {
        limits: subscriptionLimits,
        usage: currentUsage,
        canAddCamera: currentUsage.cameras < subscriptionLimits.cameras,
        canAddBranch: currentUsage.branches < subscriptionLimits.branches,
        canAddUser: currentUsage.users < subscriptionLimits.users
      };
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      throw error;
    }
  }
}

module.exports = new TenantService();