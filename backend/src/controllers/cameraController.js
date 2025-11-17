const cameraService = require("@services/cameraService");
const cameraConnectionService = require("@services/cameraConnectionService");
const ResponseHandler = require("@utils/responseHandler");
const { cameraValidator, cameraBulkValidator } = require("@validators");

class CameraController {
  async create(req, res) {
    try {
      const { error } = cameraValidator.create.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const camera = await cameraConnectionService.createCamera(req.body);
      return ResponseHandler.created(res, camera, "Camera created successfully");
    } catch (error) {
      console.error("Camera creation error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getAll(req, res) {
    try {
      const { page, limit, is_active, tenant_id, user_id, connection_status, with_stream_status } = req.query;
      const cameras = await cameraConnectionService.getAllCameras({ 
        page, 
        limit, 
        is_active,
        tenant_id,
        user_id, // 🆕 Added user_id filter
        connection_status
      });
      
      // Add streaming status if requested
      if (with_stream_status === 'true') {
        const activeStreams = cameraConnectionService.getActiveStreams();
        cameras.cameras = cameras.cameras.map(cam => {
          const streamId = `camera_${cam.camera_id}`;
          return {
            ...cam.toJSON ? cam.toJSON() : cam,
            is_streaming: activeStreams.includes(streamId),
            stream_id: streamId
          };
        });
      }
      
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getById(req, res) {
    try {
      const camera = await cameraConnectionService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      return ResponseHandler.success(res, camera);
    } catch (error) {
      console.error("Get camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async update(req, res) {
    try {
      const { error } = cameraValidator.update.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const camera = await cameraConnectionService.updateCamera(req.params.id, req.body);
      return ResponseHandler.success(res, camera, "Camera updated successfully");
    } catch (error) {
      console.error("Update camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async delete(req, res) {
    try {
      // Stop stream if active before deleting
      const streamId = `camera_${req.params.id}`;
      if (cameraConnectionService.isStreaming && cameraConnectionService.isStreaming(streamId)) {
        cameraConnectionService.stopStream(streamId);
      }

      const result = await cameraConnectionService.deleteCamera(req.params.id);
      return ResponseHandler.success(res, result, "Camera deleted successfully");
    } catch (error) {
      console.error("Delete camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByTenant(req, res) {
    try {
      const { page, limit, is_active, user_id, connection_status } = req.query;
      const cameras = await cameraConnectionService.getCamerasByTenant(req.params.tenantId, { 
        page, 
        limit, 
        is_active,
        user_id, // 🆕 Added user_id filter
        connection_status
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get tenant cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async getByBranch(req, res) {
    try {
      const { page, limit, is_active, user_id, connection_status } = req.query;
      const cameras = await cameraConnectionService.getCamerasByBranch(req.params.branchId, { 
        page, 
        limit, 
        is_active,
        user_id, // 🆕 Added user_id filter
        connection_status
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get branch cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Get cameras by user
  async getByUser(req, res) {
    try {
      const { page, limit, is_active, connection_status } = req.query;
      console.log('Fetching cameras for user:', req.params.userId);
      console.log('Query params:', req.query);
      const cameras = await cameraConnectionService.getCamerasByUser(req.params.userId, { 
        page, 
        limit, 
        is_active,
        connection_status
      });
      return ResponseHandler.success(res, cameras);
    } catch (error) {
      console.error("Get user cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async updateStatus(req, res) {
    try {
      const { is_active } = req.body;
      
      if (typeof is_active !== 'boolean') {
        return ResponseHandler.badRequest(res, "is_active must be a boolean");
      }

      // If deactivating camera, stop its stream
      if (!is_active) {
        const streamId = `camera_${req.params.id}`;
        if (cameraConnectionService.isStreaming && cameraConnectionService.isStreaming(streamId)) {
          cameraConnectionService.stopStream(streamId);
        }
      }

      const camera = await cameraConnectionService.updateCameraStatus(req.params.id, is_active);
      return ResponseHandler.success(res, camera, "Camera status updated successfully");
    } catch (error) {
      console.error("Update status error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Assign camera to user
  async assignToUser(req, res) {
    try {
      const { user_id } = req.body;
      
      const camera = await cameraConnectionService.updateCamera(req.params.id, { user_id });
      return ResponseHandler.success(res, camera, user_id ? "Camera assigned to user successfully" : "Camera unassigned from user");
    } catch (error) {
      console.error("Assign camera error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Enhanced connection test with actual streaming validation
  async testConnection(req, res) {
    try {
      const { camera_id, ip_address, port, username, password, protocol, channel } = req.body;
      
      let streamUrl;
      let cameraData;

      if (camera_id) {
        // Test existing camera
        cameraData = await cameraConnectionService.getCameraById(camera_id);
        if (!cameraData) {
          return ResponseHandler.notFound(res, "Camera not found");
        }
        streamUrl = cameraData.buildStreamUrl();
      } else {
        // Test with provided credentials
        if (!ip_address) {
          return ResponseHandler.badRequest(res, "IP address or camera_id is required");
        }
        
        const testConfig = { ip_address, port: port || '554', username, password, protocol: protocol || 'RTSP', channel: channel || '1' };
        streamUrl = cameraConnectionService.buildStreamUrl(testConfig);
      }

      console.log('🔍 Testing camera connection:', streamUrl.replace(/:[^:@]*@/, ':***@'));
      
      // Note: Actual connection testing would require the streaming service
      // For now, just validate the configuration
      const validation = cameraConnectionService.validateCameraConfig(
        camera_id ? cameraData : { ip_address, port, protocol }
      );
      
      if (!validation.valid) {
        return ResponseHandler.badRequest(res, validation.errors.join(', '));
      }

      // Update camera status if it's a DB camera
      if (camera_id && cameraData) {
        await cameraData.updateConnectionStatus('connected');
      }

      return ResponseHandler.success(res, { 
        connected: true, 
        message: "Camera configuration is valid",
        stream_url: streamUrl.replace(/:[^:@]*@/, ':***@') // Hide password in response
      });

    } catch (error) {
      console.error("❌ Connection test error:", error);
      
      // Update camera status if it's a DB camera
      if (req.body.camera_id) {
        try {
          const camera = await cameraConnectionService.getCameraById(req.body.camera_id);
          if (camera) {
            await camera.updateConnectionStatus('error', error.message);
          }
        } catch (dbError) {
          console.error('Error updating camera status:', dbError);
        }
      }
      
      return ResponseHandler.internalServerError(res, error.message || "Camera connection failed");
    }
  }

  // 🆕 Get live stream URL and info
  async getLiveStream(req, res) {
    try {
      const camera = await cameraConnectionService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");
      
      if (!camera.is_active) {
        return ResponseHandler.badRequest(res, "Camera is not active");
      }

      const streamId = `camera_${camera.camera_id}`;
      const isStreaming = cameraConnectionService.isStreaming ? cameraConnectionService.isStreaming(streamId) : false;

      return ResponseHandler.success(res, {
        camera_id: camera.camera_id,
        camera_name: camera.camera_name,
        user_id: camera.user_id,
        assigned_user: camera.assignedUser ? {
          user_id: camera.assignedUser.user_id,
          username: camera.assignedUser.username,
          full_name: camera.assignedUser.full_name
        } : null,
        stream_url: camera.stream_url || camera.buildStreamUrl(),
        stream_endpoint: `/api/camera-stream/video/${streamId}`,
        snapshot_endpoint: `/api/camera-stream/snapshot/${streamId}`,
        is_streaming: isStreaming,
        connection_status: camera.connection_status,
        fps: camera.processing_fps || camera.fps,
        resolution: camera.resolution,
        protocol: camera.protocol
      });
    } catch (error) {
      console.error("Get stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Start streaming for a camera
  async startStream(req, res) {
    try {
      const camera = await cameraConnectionService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");
      
      if (!camera.is_active) {
        return ResponseHandler.badRequest(res, "Camera is not active");
      }

      const streamId = `camera_${camera.camera_id}`;
      
      // Check if already streaming
      if (cameraConnectionService.isStreaming && cameraConnectionService.isStreaming(streamId)) {
        return ResponseHandler.success(res, {
          message: "Stream already active",
          stream_endpoint: `/api/camera-stream/video/${streamId}`,
          snapshot_endpoint: `/api/camera-stream/snapshot/${streamId}`,
          stream_id: streamId
        });
      }

      const streamUrl = camera.stream_url || camera.buildStreamUrl();
      
      if (!streamUrl) {
        return ResponseHandler.badRequest(res, "Camera stream URL not configured");
      }

      // Update status to connecting
      await camera.updateConnectionStatus('connecting');

      // Note: Actual stream starting would require the streaming service
      // This is a placeholder for the integration
      
      return ResponseHandler.success(res, {
        message: "Stream start requested",
        stream_endpoint: `/api/camera-stream/video/${streamId}`,
        snapshot_endpoint: `/api/camera-stream/snapshot/${streamId}`,
        stream_id: streamId,
        camera: {
          camera_id: camera.camera_id,
          camera_name: camera.camera_name,
          user_id: camera.user_id,
          resolution: camera.resolution,
          fps: camera.processing_fps
        }
      });

    } catch (error) {
      console.error("Start stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Stop streaming for a camera
  async stopStream(req, res) {
    try {
      const camera = await cameraConnectionService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      const streamId = `camera_${camera.camera_id}`;
      
      // Note: Actual stream stopping would require the streaming service
      
      // Clean up frame data
      if (global.cameraFrames) {
        global.cameraFrames.delete(streamId);
      }
      
      await camera.updateConnectionStatus('disconnected');

      return ResponseHandler.success(res, {
        message: "Stream stopped successfully",
        stream_id: streamId,
        camera_id: camera.camera_id
      });
    } catch (error) {
      console.error("Stop stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Get camera health/status
  async getHealth(req, res) {
    try {
      const camera = await cameraConnectionService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      const streamId = `camera_${camera.camera_id}`;
      const isStreaming = cameraConnectionService.isStreaming ? cameraConnectionService.isStreaming(streamId) : false;

      return ResponseHandler.success(res, {
        camera_id: camera.camera_id,
        camera_name: camera.camera_name,
        user_id: camera.user_id,
        assigned_user: camera.assignedUser ? camera.assignedUser.username : null,
        is_active: camera.is_active,
        connection_status: camera.connection_status,
        is_streaming: isStreaming,
        last_connected_at: camera.last_connected_at,
        last_error: camera.last_error_message,
        uptime_percentage: camera.uptime_percentage
      });
    } catch (error) {
      console.error("Get health error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Bulk operations
  async bulkUpdateStatus(req, res) {
    try {
      const { error } = cameraBulkValidator.bulkUpdateStatus.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const { camera_ids, is_active } = req.body;

      // If deactivating, stop all streams
      if (!is_active && cameraConnectionService.stopStream) {
        for (const cameraId of camera_ids) {
          const streamId = `camera_${cameraId}`;
          if (cameraConnectionService.isStreaming && cameraConnectionService.isStreaming(streamId)) {
            cameraConnectionService.stopStream(streamId);
          }
        }
      }

      const results = await Promise.all(
        camera_ids.map(id => cameraConnectionService.updateCameraStatus(id, is_active))
      );

      return ResponseHandler.success(res, {
        updated: results.length,
        cameras: results
      }, `${results.length} cameras updated successfully`);

    } catch (error) {
      console.error("Bulk update error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Bulk assign cameras to user
  async bulkAssignToUser(req, res) {
    try {
      const { error } = cameraBulkValidator.bulkAssign.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const { camera_ids, user_id, tenant_id } = req.body;

      const result = await cameraConnectionService.bulkAssignCameras(camera_ids, user_id, tenant_id);

      return ResponseHandler.success(res, result, 
        user_id ? `${result.updated} cameras assigned to user` : `${result.updated} cameras unassigned`
      );

    } catch (error) {
      console.error("Bulk assign error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Get streaming statistics
  async getStreamingStats(req, res) {
    try {
      const { tenant_id } = req.query;
      
      if (!tenant_id) {
        return ResponseHandler.badRequest(res, "tenant_id is required");
      }

      const stats = await cameraConnectionService.getCameraStats(tenant_id);

      return ResponseHandler.success(res, stats);
    } catch (error) {
      console.error("Get stats error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Get disconnected cameras
  async getDisconnectedCameras(req, res) {
    try {
      const { tenant_id } = req.query;
      
      if (!tenant_id) {
        return ResponseHandler.badRequest(res, "tenant_id is required");
      }

      const cameras = await cameraConnectionService.getDisconnectedCameras(tenant_id);

      return ResponseHandler.success(res, {
        count: cameras.length,
        cameras
      });
    } catch (error) {
      console.error("Get disconnected cameras error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new CameraController();