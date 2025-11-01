const peopleCountService = require("@services/peopleCountService");
const ResponseHandler = require("@utils/responseHandler");
const { peopleCountValidator } = require("@validators");

class PeopleCountController {
  async create(req, res) {
    try {
      const { error } = peopleCountValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const log = await peopleCountService.createPeopleCountLog(req.body);
      return ResponseHandler.created(res, log, "People count log created successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit, direction, start_date, end_date } = req.query;
      const logs = await peopleCountService.getAllPeopleCountLogs({ page, limit, direction, start_date, end_date });
      return ResponseHandler.success(res, logs);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const log = await peopleCountService.getPeopleCountLogById(req.params.id);
      if (!log) return ResponseHandler.notFound(res, "People count log not found");

      return ResponseHandler.success(res, log);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByCamera(req, res) {
    try {
      const { page, limit, direction, start_date, end_date } = req.query;
      const logs = await peopleCountService.getPeopleCountLogsByCamera(req.params.cameraId, { page, limit, direction, start_date, end_date });
      return ResponseHandler.success(res, logs);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByTenant(req, res) {
    try {
      const { page, limit, direction, start_date, end_date } = req.query;
      const logs = await peopleCountService.getPeopleCountLogsByTenant(req.params.tenantId, { page, limit, direction, start_date, end_date });
      return ResponseHandler.success(res, logs);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByBranch(req, res) {
    try {
      const { page, limit, direction, start_date, end_date } = req.query;
      const logs = await peopleCountService.getPeopleCountLogsByBranch(req.params.branchId, { page, limit, direction, start_date, end_date });
      return ResponseHandler.success(res, logs);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getHourlyAnalytics(req, res) {
    try {
      const { date, camera_id, branch_id } = req.query;
      const analytics = await peopleCountService.getHourlyAnalytics({ date, camera_id, branch_id });
      return ResponseHandler.success(res, analytics);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getDailyAnalytics(req, res) {
    try {
      const { start_date, end_date, camera_id, branch_id } = req.query;
      const analytics = await peopleCountService.getDailyAnalytics({ start_date, end_date, camera_id, branch_id });
      return ResponseHandler.success(res, analytics);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new PeopleCountController();