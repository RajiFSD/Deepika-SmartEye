const zoneService = require("@services/zoneService");
const ResponseHandler = require("@utils/responseHandler");
const { zoneValidator } = require("@validators");

class ZoneController {
  // async create(req, res) {
  //   try {
  //     const { error } = zoneValidator.validate(req.body);
  //     if (error) return ResponseHandler.badRequest(res, error.details[0].message);

  //     const zone = await zoneService.createZone(req.body);
  //     return ResponseHandler.created(res, zone, "Zone created successfully");
  //   } catch (error) {
  //     return ResponseHandler.internalServerError(res, error.message);
  //   }
  // }

  async create(req, res) {
    try {
      // FIX: Use the correct validator syntax
      const { error } = zoneValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const zone = await zoneService.createZone(req.body);
      return ResponseHandler.created(res, zone, "Zone created successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit, is_active } = req.query;
      const zones = await zoneService.getAllZones({ page, limit, is_active });
      return ResponseHandler.success(res, zones);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const zone = await zoneService.getZoneById(req.params.id);
      if (!zone) return ResponseHandler.notFound(res, "Zone not found");

      return ResponseHandler.success(res, zone);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // async update(req, res) {
  //   try {
  //     const { error } = zoneValidator.validate(req.body);
  //     if (error) return ResponseHandler.badRequest(res, error.details[0].message);

  //     const zone = await zoneService.updateZone(req.params.id, req.body);
  //     return ResponseHandler.success(res, zone, "Zone updated successfully");
  //   } catch (error) {
  //     return ResponseHandler.internalServerError(res, error.message);
  //   }
  // }

    async update(req, res) {
    try {
      // FIX: Use the correct validator syntax for update
      const { error } = zoneValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const zone = await zoneService.updateZone(req.params.id, req.body);
      return ResponseHandler.success(res, zone, "Zone updated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await zoneService.deleteZone(req.params.id);
      return ResponseHandler.success(res, result, "Zone deleted successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByCamera(req, res) {
    try {
      const { page, limit, is_active } = req.query;
      const zones = await zoneService.getZonesByCamera(req.params.cameraId, { page, limit, is_active });
      return ResponseHandler.success(res, zones);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByTenant(req, res) {
    try {
      const { page, limit, is_active } = req.query;
      const zones = await zoneService.getZonesByTenant(req.params.tenantId, { page, limit, is_active });
      return ResponseHandler.success(res, zones);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async updateStatus(req, res) {
    try {
      const { is_active } = req.body;
      const zone = await zoneService.updateZoneStatus(req.params.id, is_active);
      return ResponseHandler.success(res, zone, "Zone status updated successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new ZoneController();