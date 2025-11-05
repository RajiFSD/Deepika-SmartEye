const cameraService = require("@services/cameraService");
const cameraConnectionService = require("@services/cameraConnectionService");
const ResponseHandler = require("@utils/responseHandler");
const { cameraValidator } = require("@validators");

class CameraController {
  async create(req, res) {
    try {
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
      const { page, limit, is_active, tenant_id, with_stream_status } = req.query;
      const cameras = await cameraService.getAllCameras({ 
        page, 
        limit, 
        is_active,
        tenant_id 
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
      // Stop stream if active before deleting
      const streamId = `camera_${req.params.id}`;
      if (cameraConnectionService.isStreaming(streamId)) {
        cameraConnectionService.stopStream(streamId);
      }

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

      // If deactivating camera, stop its stream
      if (!is_active) {
        const streamId = `camera_${req.params.id}`;
        if (cameraConnectionService.isStreaming(streamId)) {
          cameraConnectionService.stopStream(streamId);
        }
      }

      const camera = await cameraService.updateCameraStatus(req.params.id, is_active);
      return ResponseHandler.success(res, camera, "Camera status updated successfully");
    } catch (error) {
      console.error("Update status error:", error);
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
        cameraData = await cameraService.getCameraById(camera_id);
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
        streamUrl = buildStreamUrl(testConfig);
      }

      console.log('🔍 Testing camera connection:', streamUrl.replace(/:[^:@]*@/, ':***@'));
      
      const result = await cameraConnectionService.testConnection(streamUrl, 15000);
      
      // Update camera status if it's a DB camera
      if (camera_id && cameraData) {
        await cameraData.updateConnectionStatus('connected');
      }

      return ResponseHandler.success(res, { 
        connected: true, 
        message: "Camera connection successful",
        details: result
      });

    } catch (error) {
      console.error("❌ Connection test error:", error);
      
      // Update camera status if it's a DB camera
      if (req.body.camera_id) {
        try {
          const camera = await cameraService.getCameraById(req.body.camera_id);
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
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");
      
      if (!camera.is_active) {
        return ResponseHandler.badRequest(res, "Camera is not active");
      }

      const streamId = `camera_${camera.camera_id}`;
      const isStreaming = cameraConnectionService.isStreaming(streamId);

      return ResponseHandler.success(res, {
        camera_id: camera.camera_id,
        camera_name: camera.camera_name,
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
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");
      
      if (!camera.is_active) {
        return ResponseHandler.badRequest(res, "Camera is not active");
      }

      const streamId = `camera_${camera.camera_id}`;
      
      // Check if already streaming
      if (cameraConnectionService.isStreaming(streamId)) {
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

      // Start the stream
      const result = await cameraConnectionService.startStream(streamId, streamUrl, {
        fps: camera.processing_fps || 1,
        resolution: camera.resolution || '1280x720',
        onFrame: (frameData, camId) => {
          global.cameraFrames = global.cameraFrames || new Map();
          global.cameraFrames.set(camId, frameData);
        },
        onError: async (error) => {
          console.error(`❌ Stream error for camera ${camera.camera_id}:`, error);
          await camera.updateConnectionStatus('error', error.message);
        }
      });

      if (result.success) {
        await camera.updateConnectionStatus('connected');
        
        return ResponseHandler.success(res, {
          message: "Stream started successfully",
          stream_endpoint: `/api/camera-stream/video/${streamId}`,
          snapshot_endpoint: `/api/camera-stream/snapshot/${streamId}`,
          stream_id: streamId,
          camera: {
            camera_id: camera.camera_id,
            camera_name: camera.camera_name,
            resolution: camera.resolution,
            fps: camera.processing_fps
          }
        });
      } else {
        await camera.updateConnectionStatus('error', 'Failed to start stream');
        return ResponseHandler.badRequest(res, result.message || "Failed to start stream");
      }

    } catch (error) {
      console.error("Start stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Stop streaming for a camera
  async stopStream(req, res) {
    try {
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      const streamId = `camera_${camera.camera_id}`;
      const result = cameraConnectionService.stopStream(streamId);
      
      // Clean up frame data
      if (global.cameraFrames) {
        global.cameraFrames.delete(streamId);
      }
      
      await camera.updateConnectionStatus('disconnected');

      return ResponseHandler.success(res, result, "Stream stopped successfully");
    } catch (error) {
      console.error("Stop stream error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // 🆕 Get camera health/status
  async getHealth(req, res) {
    try {
      const camera = await cameraService.getCameraById(req.params.id);
      if (!camera) return ResponseHandler.notFound(res, "Camera not found");

      const streamId = `camera_${camera.camera_id}`;
      const isStreaming = cameraConnectionService.isStreaming(streamId);

      return ResponseHandler.success(res, {
        camera_id: camera.camera_id,
        camera_name: camera.camera_name,
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
      const { camera_ids, is_active } = req.body;
      
      if (!Array.isArray(camera_ids) || camera_ids.length === 0) {
        return ResponseHandler.badRequest(res, "camera_ids array is required");
      }

      if (typeof is_active !== 'boolean') {
        return ResponseHandler.badRequest(res, "is_active must be a boolean");
      }

      // If deactivating, stop all streams
      if (!is_active) {
        for (const cameraId of camera_ids) {
          const streamId = `camera_${cameraId}`;
          if (cameraConnectionService.isStreaming(streamId)) {
            cameraConnectionService.stopStream(streamId);
          }
        }
      }

      const results = await Promise.all(
        camera_ids.map(id => cameraService.updateCameraStatus(id, is_active))
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

  // 🆕 Get streaming statistics
  async getStreamingStats(req, res) {
    try {
      const { tenant_id } = req.query;
      
      const activeStreams = cameraConnectionService.getActiveStreams();
      const stats = await cameraService.getCameraStats(tenant_id);

      return ResponseHandler.success(res, {
        ...stats,
        currently_streaming: activeStreams.length,
        stream_ids: activeStreams
      });
    } catch (error) {
      console.error("Get stats error:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

// Helper function (same as in routes)
function buildStreamUrl(camera) {
  const { protocol, username, password, ip_address, port, channel, stream_path } = camera;
  
  if (!ip_address) return null;
  
  if (protocol === 'RTSP' || !protocol) {
    const auth = username && password ? `${username}:${password}@` : '';
    const path = stream_path || `/cam/realmonitor?channel=${channel || 1}&subtype=0`;
    return `rtsp://${auth}${ip_address}:${port || 554}${path}`;
  } else if (protocol === 'HTTP') {
    const auth = username && password ? `${username}:${password}@` : '';
    return `http://${auth}${ip_address}:${port || 80}/video.cgi`;
  }
  
  return camera.stream_url;
}

module.exports = new CameraController();