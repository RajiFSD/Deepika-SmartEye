const reportService = require("@services/reportService");
const ResponseHandler = require("@utils/responseHandler");
const { reportValidator } = require("@validators");

class ReportController {
  async generateReport(req, res) {
    try {
      const { error } = reportValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const report = await reportService.generateReport(req.body);
      return ResponseHandler.created(res, report, "Report generated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAllReports(req, res) {
    try {
      const { page, limit, report_type } = req.query;
      const reports = await reportService.getAllReports({ page, limit, report_type });
      return ResponseHandler.success(res, reports);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getReportById(req, res) {
    try {
      const report = await reportService.getReportById(req.params.id);
      if (!report) return ResponseHandler.notFound(res, "Report not found");

      return ResponseHandler.success(res, report);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async deleteReport(req, res) {
    try {
      const result = await reportService.deleteReport(req.params.id);
      return ResponseHandler.success(res, result, "Report deleted successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAvailableReportTypes(req, res) {
    try {
      const reportTypes = await reportService.getAvailableReportTypes();
      return ResponseHandler.success(res, reportTypes);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async generateOccupancyReport(req, res) {
    try {
      const { start_date, end_date, camera_id, branch_id, format = 'pdf' } = req.body;
      const report = await reportService.generateOccupancyReport({ start_date, end_date, camera_id, branch_id, format });
      return ResponseHandler.created(res, report, "Occupancy report generated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async generateAlertReport(req, res) {
    try {
      const { start_date, end_date, camera_id, branch_id, status, format = 'pdf' } = req.body;
      const report = await reportService.generateAlertReport({ start_date, end_date, camera_id, branch_id, status, format });
      return ResponseHandler.created(res, report, "Alert report generated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new ReportController();