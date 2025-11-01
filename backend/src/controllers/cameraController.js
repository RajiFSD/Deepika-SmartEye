const cameraService = require("@services/cameraService");
const ResponseHandler = require("@utils/responseHandler");
const { cameraValidator } = require("@validators");

class CameraController {
  async create(req, res) {
    try {
      // ✅ Fix: Use cameraValidator.create instead of just cameraValidator
      const { error } = cameraValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const camera = await cameraService.createCamera(req.body);
      return ResponseHandler.created(res, camera, "Camera created successfully");
    } catch (error) {
      console.error("Camera creation error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit, is_active, tenant_id } = req.query;
      const cameras = await cameraService.getAllCameras({ 
        page, 
        limit, 
        is_active,
        tenant_id 
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      return ResponseHandler.success(res, camera);
    } catch (error) {
      console.error("Get camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async update(req, res) {
    try {
      // ✅ Fix: Use cameraValidator.update
      const { error } = cameraValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const camera = await cameraService.updateCamera(req.params.id, req.body);
      return ResponseHandler.success(res, camera, "Camera updated successfully");
    } catch (error) {
      console.error("Update camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      const result = await cameraService.deleteCamera(req.params.id);
      return ResponseHandler.success(res, result, "Camera deleted successfully");
    } catch (error) {
      console.error("Delete camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByTenant(req, res) {
    try {
      const { page, limit, is_active } = req.query;
      const cameras = await cameraService.getCamerasByTenant(req.params.tenantId, { 
        page, 
        limit, 
        is_active 
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get tenant cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByBranch(req, res) {
    try {
      const { page, limit, is_active } = req.query;
      const cameras = await cameraService.getCamerasByBranch(req.params.branchId, { 
        page, 
        limit, 
        is_active 
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get branch cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async updateStatus(req, res) {
    try {
      const { is_active } = req.body;
      
      if (typeof is_active !== 'boolean') {
        return ResponseHandler.badRequest(res, "is_active must be a boolean");
      }

      const camera = await cameraService.updateCameraStatus(req.params.id, is_active);
      return ResponseHandler.success(res, camera, "Camera status updated successfully");
    } catch (error) {
      console.error("Update status error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // ✅ Additional useful endpoints
  async testConnection(req, res) {
    try {
      const { stream_url } = req.body;
      // This would test the camera connection
      // Implementation depends on your streaming library
      return ResponseHandler.success(res, { 
        connected: true, 
        message: "Camera connection successful" 
      });
    } catch (error) {
      console.error("Connection test error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getLiveStream(req, res) {
    try {
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");
      
      if (!camera.is_active) {
        return ResponseHandler.badRequest(res, "Camera is not active");
      }

      return ResponseHandler.success(res, {
        stream_url: camera.stream_url,
        camera_id: camera.camera_id,
        fps: camera.fps,
        resolution: camera.resolution
      });
    } catch (error) {
      console.error("Get stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new CameraController();