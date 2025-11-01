const tenantService = require('@services/tenantService');
const ResponseHandler = require('@utils/responseHandler');

class TenantController {
  /**
   * GET /api/tenants
   * Get all tenants (super admin only)
   */
  async getAllTenants(req, res) {
    try {
      const { page, limit, search, is_active } = req.query;
      
      const result = await tenantService.getAllTenants({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        isActive: is_active !== undefined ? is_active === 'true' : null
      });

      return ResponseHandler.success(res, result, 'Tenants fetched successfully');
    } catch (error) {
      console.error('Error in getAllTenants:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/tenants/:id
   * Get tenant by ID
   */
  async getTenantById(req, res) {
    try {
      const { id } = req.params;
      const tenant = await tenantService.getTenantById(id);

      return ResponseHandler.success(res, tenant, 'Tenant fetched successfully');
    } catch (error) {
      console.error('Error in getTenantById:', error);
      if (error.message === 'Tenant not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * POST /api/tenants
   * Create new tenant (super admin only)
   */
  async createTenant(req, res) {
    try {
      const tenantData = req.body;
      const tenant = await tenantService.createTenant(tenantData);

      return ResponseHandler.created(res, tenant, 'Tenant created successfully');
    } catch (error) {
      console.error('Error in createTenant:', error);
      if (error.message.includes('already exists')) {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * PUT /api/tenants/:id
   * Update tenant
   */
  async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const tenant = await tenantService.updateTenant(id, updateData);

      return ResponseHandler.success(res, tenant, 'Tenant updated successfully');
    } catch (error) {
      console.error('Error in updateTenant:', error);
      if (error.message === 'Tenant not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      if (error.message.includes('already exists')) {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * DELETE /api/tenants/:id
   * Deactivate tenant
   */
  async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.deleteTenant(id);

      return ResponseHandler.success(res, result, 'Tenant deactivated successfully');
    } catch (error) {
      console.error('Error in deleteTenant:', error);
      if (error.message === 'Tenant not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/tenants/:id/stats
   * Get tenant statistics
   */
  async getTenantStats(req, res) {
    try {
      const { id } = req.params;
      const stats = await tenantService.getTenantStats(id);

      return ResponseHandler.success(res, stats, 'Statistics fetched successfully');
    } catch (error) {
      console.error('Error in getTenantStats:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/tenants/:id/subscription-limits
   * Check subscription limits
   */
  async checkSubscriptionLimits(req, res) {
    try {
      const { id } = req.params;
      const limits = await tenantService.checkSubscriptionLimits(id);

      return ResponseHandler.success(res, limits, 'Subscription limits fetched successfully');
    } catch (error) {
      console.error('Error in checkSubscriptionLimits:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/tenants/current
   * Get current tenant info (from authenticated user)
   */
  async getCurrentTenant(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const tenant = await tenantService.getTenantById(tenantId);

      return ResponseHandler.success(res, tenant, 'Current tenant fetched successfully');
    } catch (error) {
      console.error('Error in getCurrentTenant:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new TenantController();