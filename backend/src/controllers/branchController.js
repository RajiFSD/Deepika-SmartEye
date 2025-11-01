const branchService = require('@services/branchService');
const ResponseHandler = require('@utils/responseHandler');

class BranchController {
  /**
   * GET /api/branches
   * Get all branches for tenant
   */
  async getBranchesByTenant(req, res) {
    try {
      const tenantId = req.tenantId;
      const { page, limit, search, is_active } = req.query;
      
      const result = await branchService.getBranchesByTenant(tenantId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        search: search || '',
        isActive: is_active !== undefined ? is_active === 'true' : null
      });
      
      return ResponseHandler.success(res, result, 'Branches fetched successfully');
    } catch (error) {
      console.error('Error in getBranchesByTenant:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/branches/active
   * Get active branches for dropdowns
   */
  async getActiveBranches(req, res) {
    try {
      const tenantId = req.tenantId;
      const branches = await branchService.getActiveBranches(tenantId);
      
      return ResponseHandler.success(res, branches, 'Active branches fetched successfully');
    } catch (error) {
      console.error('Error in getActiveBranches:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/branches/:id
   * Get branch by ID
   */
  async getBranchById(req, res) {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;
      
      const branch = await branchService.getBranchById(id, tenantId);
      
      return ResponseHandler.success(res, branch, 'Branch fetched successfully');
    } catch (error) {
      console.error('Error in getBranchById:', error);
      if (error.message === 'Branch not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * POST /api/branches
   * Create new branch
   */
  async createBranch(req, res) {
    try {
      const tenantId = req.tenantId;
      const branchData = req.body;
      
      const branch = await branchService.createBranch(tenantId, branchData);
      
      return ResponseHandler.created(res, branch, 'Branch created successfully');
    } catch (error) {
      console.error('Error in createBranch:', error);
      if (error.message === 'Branch code already exists for this tenant') {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * PUT /api/branches/:id
   * Update branch
   */
  async updateBranch(req, res) {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;
      const updateData = req.body;
      
      const branch = await branchService.updateBranch(id, tenantId, updateData);
      
      return ResponseHandler.success(res, branch, 'Branch updated successfully');
    } catch (error) {
      console.error('Error in updateBranch:', error);
      if (error.message === 'Branch not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      if (error.message === 'Branch code already exists') {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * DELETE /api/branches/:id
   * Delete/Deactivate branch
   */
  async deleteBranch(req, res) {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;
      
      const result = await branchService.deleteBranch(id, tenantId);
      
      return ResponseHandler.success(res, result, result.message);
    } catch (error) {
      console.error('Error in deleteBranch:', error);
      if (error.message === 'Branch not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/branches/:id/stats
   * Get branch statistics
   */
  async getBranchStats(req, res) {
    try {
      const tenantId = req.tenantId;
      const { id } = req.params;
      
      const stats = await branchService.getBranchStats(id, tenantId);
      
      return ResponseHandler.success(res, stats, 'Branch statistics fetched successfully');
    } catch (error) {
      console.error('Error in getBranchStats:', error);
      if (error.message === 'Branch not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new BranchController();