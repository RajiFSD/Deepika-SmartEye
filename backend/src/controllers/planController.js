const planService = require('@services/planService');
const ResponseHandler = require('@utils/responseHandler');

class PlanController {
  /**
   * GET /api/plans
   * Get all plans
   */
  async getAllPlans(req, res) {
    try {
      const { includeFeatures = 'true', includeSubscribers = 'false' } = req.query;
      
      const plans = await planService.getAllPlans({
        includeFeatures: includeFeatures === 'true',
        includeSubscribers: includeSubscribers === 'true',
      });

      return ResponseHandler.success(res, plans, 'Plans fetched successfully');
    } catch (error) {
      console.error('Error in getAllPlans:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/plans/:id
   * Get plan by ID
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const { includeSubscribers = 'false' } = req.query;
      
      const plan = await planService.getPlanById(id, includeSubscribers === 'true');

      return ResponseHandler.success(res, plan, 'Plan fetched successfully');
    } catch (error) {
      console.error('Error in getPlanById:', error);
      if (error.message === 'Plan not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * POST /api/plans
   * Create new plan (super admin only)
   */
  async createPlan(req, res) {
    try {
      const planData = req.body;
      const plan = await planService.createPlan(planData);

      return ResponseHandler.created(res, plan, 'Plan created successfully');
    } catch (error) {
      console.error('Error in createPlan:', error);
      if (error.message.includes('already exists')) {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * PUT /api/plans/:id
   * Update plan (super admin only)
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const plan = await planService.updatePlan(id, updateData);

      return ResponseHandler.success(res, plan, 'Plan updated successfully');
    } catch (error) {
      console.error('Error in updatePlan:', error);
      if (error.message === 'Plan not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * DELETE /api/plans/:id
   * Delete plan (super admin only)
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      const result = await planService.deletePlan(id);

      return ResponseHandler.success(res, result, 'Plan deleted successfully');
    } catch (error) {
      console.error('Error in deletePlan:', error);
      if (error.message === 'Plan not found') {
        return ResponseHandler.notFound(res, error.message);
      }
      if (error.message.includes('Cannot delete')) {
        return ResponseHandler.badRequest(res, error.message);
      }
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/plans/stats
   * Get plan statistics (super admin only)
   */
  async getPlanStats(req, res) {
    try {
      const stats = await planService.getPlanStats();

      return ResponseHandler.success(res, stats, 'Plan statistics fetched successfully');
    } catch (error) {
      console.error('Error in getPlanStats:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/plans/:id/subscribers
   * Get subscribers for a specific plan
   */
  async getSubscribersByPlan(req, res) {
    try {
      const { id } = req.params;
      const { page, limit } = req.query;
      
      const result = await planService.getSubscribersByPlan(id, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
      });

      return ResponseHandler.success(res, result, 'Subscribers fetched successfully');
    } catch (error) {
      console.error('Error in getSubscribersByPlan:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new PlanController();