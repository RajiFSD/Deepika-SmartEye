const dashboardService = require("@services/dashboardService");
const ResponseHandler = require("@utils/responseHandler");

class DashboardController {
  async getOverview(req, res) {
    try {
      const overview = await dashboardService.getOverview(req.params.tenantId);
      return ResponseHandler.success(res, overview);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getOccupancyData(req, res) {
    try {
      const { period = 'today', branch_id } = req.query;
      const occupancyData = await dashboardService.getOccupancyData(req.params.tenantId, period, branch_id);
      return ResponseHandler.success(res, occupancyData);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getRecentAlerts(req, res) {
    try {
      const { limit = 10 } = req.query;
      const alerts = await dashboardService.getRecentAlerts(req.params.tenantId, limit);
      return ResponseHandler.success(res, alerts);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAnalytics(req, res) {
    try {
      const { start_date, end_date, metric = 'occupancy' } = req.query;
      const analytics = await dashboardService.getAnalytics(req.params.tenantId, { start_date, end_date, metric });
      return ResponseHandler.success(res, analytics);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getBranchDashboard(req, res) {
    try {
      const dashboard = await dashboardService.getBranchDashboard(req.params.branchId);
      return ResponseHandler.success(res, dashboard);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new DashboardController();