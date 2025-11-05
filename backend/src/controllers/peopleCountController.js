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
      const { date, camera_id, branch_id, tenant_id } = req.query;
      
      console.log('🔍 ============ HOURLY ANALYTICS DEBUG ============');
      console.log('📊 Request Query:', req.query);
      console.log('📊 Extracted params:', { date, camera_id, branch_id, tenant_id });

      const analytics = await peopleCountService.getHourlyAnalytics({ 
        date, 
        camera_id, 
        branch_id,
        tenant_id
      });

      console.log('✅ Analytics result length:', analytics?.length);
      console.log('✅ First 3 hours:', JSON.stringify(analytics?.slice(0, 3), null, 2));
      const totalEntries = analytics?.reduce((sum, h) => sum + (h.entries || 0), 0) || 0;
      const totalExits = analytics?.reduce((sum, h) => sum + (h.exits || 0), 0) || 0;
      console.log('📊 Total entries:', totalEntries);
      console.log('📊 Total exits:', totalExits);
      console.log('🔍 ============ END DEBUG ============');

      return ResponseHandler.success(res, analytics);
    } catch (error) {
      console.error('❌ HOURLY ANALYTICS ERROR:', error.message);
      console.error('❌ Stack:', error.stack);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getDailyAnalytics(req, res) {
    try {
      const { start_date, end_date, camera_id, branch_id, tenant_id } = req.query;
      const analytics = await peopleCountService.getDailyAnalytics({ 
        start_date, 
        end_date, 
        camera_id, 
        branch_id,
        tenant_id
      });
      return ResponseHandler.success(res, analytics);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new PeopleCountController();