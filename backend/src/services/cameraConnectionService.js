// services/cameraConnectionService.js
// Complete unified service with database operations AND streaming

const { Camera, Tenant, Branch, ZoneConfig, sequelize } = require("@models");
const { Op } = require("sequelize");
const { spawn } = require('child_process');
const http = require('http');
const https = require('https');

// FFmpeg path - Windows requires full path sometimes
const FFMPEG_PATH = process.env.FFMPEG_PATH || 
  (process.platform === 'win32' ? 'C:\\ffmpeg\\bin\\ffmpeg.exe' : 'ffmpeg');

class CameraConnectionService {
  constructor() {
    // Store active FFmpeg processes and HTTP streams
    this.activeStreams = new Map();
  }

  // ============================================
  // STREAMING METHODS
  // ============================================

  /**
   * Start streaming from a camera
   */
  async startStream(streamId, streamUrl, options = {}) {
    try {
      // Check if already streaming
      if (this.activeStreams.has(streamId)) {
        console.log(`Stream ${streamId} already active`);
        return {
          success: true,
          message: 'Stream already active',
          streamId,
          streamType: this.activeStreams.get(streamId).type
        };
      }

      console.log(`🎬 Starting stream ${streamId} from ${streamUrl}`);

      // Check if streamUrl is valid
      if (!streamUrl) {
        throw new Error('Stream URL is required but was null or undefined');
      }

      const {
        fps = 1,
        resolution = '1280x720',
        onFrame = () => {},
        onError = () => {}
      } = options;

      // For HTTP/MJPEG streams, fetch and forward the stream
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
        console.log(`📡 HTTP/MJPEG stream detected for ${streamId}`);
        
        // Store HTTP stream info
        const streamData = {
          type: 'http',
          streamUrl,
          startTime: new Date(),
          fps,
          resolution,
          isActive: true
        };
        
        this.activeStreams.set(streamId, streamData);

        // Start fetching frames from HTTP stream
        this.startHttpStreamFetch(streamId, streamUrl, onFrame, onError);
        
        return {
          success: true,
          message: 'HTTP/MJPEG stream started',
          streamId,
          streamType: 'http'
        };
      }

      // For RTSP streams, use FFmpeg to convert to MJPEG
      console.log(`📹 RTSP stream detected, using FFmpeg for ${streamId}`);

      const ffmpeg = spawn(FFMPEG_PATH, [
        '-rtsp_transport', 'tcp',
        '-i', streamUrl,
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '5',
        '-r', fps.toString(),
        '-vf', `scale=${resolution}`,
        '-'
      ]);

      const streamData = {
        type: 'rtsp',
        process: ffmpeg,
        streamUrl,
        startTime: new Date(),
        fps,
        resolution,
        isActive: true
      };

      // Handle FFmpeg output (frames)
      ffmpeg.stdout.on('data', (data) => {
        onFrame(data, streamId);
      });

      // Handle errors
      ffmpeg.stderr.on('data', (data) => {
        const message = data.toString();
        // Only log actual errors, not info messages
        if (message.includes('error') || message.includes('Error')) {
          console.error(`FFmpeg error for ${streamId}:`, message);
        }
      });

      ffmpeg.on('error', (error) => {
        console.error(`FFmpeg process error for ${streamId}:`, error);
        this.activeStreams.delete(streamId);
        onError(error);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg process for ${streamId} closed with code ${code}`);
        this.activeStreams.delete(streamId);
        if (code !== 0 && code !== null) {
          onError(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      // Store the stream
      this.activeStreams.set(streamId, streamData);

      return {
        success: true,
        message: 'RTSP stream started',
        streamId,
        streamType: 'rtsp'
      };

    } catch (error) {
      console.error(`Failed to start stream ${streamId}:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Fetch HTTP/MJPEG stream and convert to frames
   */
  startHttpStreamFetch(streamId, streamUrl, onFrame, onError) {
    try {
      const httpModule = streamUrl.startsWith('https://') ? https : http;
      
      const request = httpModule.get(streamUrl, (response) => {
        if (response.statusCode !== 200) {
          onError(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          this.activeStreams.delete(streamId);
          return;
        }

        console.log(`✅ Connected to HTTP stream: ${streamId}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);

        let buffer = Buffer.alloc(0);
        const boundary = this.extractBoundary(response.headers['content-type']);

        response.on('data', (chunk) => {
          // Check if stream is still active
          const streamData = this.activeStreams.get(streamId);
          if (!streamData || !streamData.isActive) {
            request.abort();
            return;
          }

          buffer = Buffer.concat([buffer, chunk]);

          // Extract JPEG frames from MJPEG stream
          if (boundary) {
            const frames = this.extractFrames(buffer, boundary);
            frames.forEach(frame => {
              if (frame && frame.length > 0) {
                onFrame(frame, streamId);
              }
            });
          } else {
            // If no boundary, assume single JPEG or continuous stream
            const jpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8])); // JPEG SOI
            const jpegEnd = buffer.indexOf(Buffer.from([0xFF, 0xD9])); // JPEG EOI
            
            if (jpegStart !== -1 && jpegEnd !== -1 && jpegEnd > jpegStart) {
              const frame = buffer.slice(jpegStart, jpegEnd + 2);
              onFrame(frame, streamId);
              buffer = buffer.slice(jpegEnd + 2);
            }
          }
        });

        response.on('end', () => {
          console.log(`HTTP stream ended: ${streamId}`);
          this.activeStreams.delete(streamId);
        });

        response.on('error', (error) => {
          console.error(`HTTP stream error for ${streamId}:`, error);
          onError(error);
          this.activeStreams.delete(streamId);
        });
      });

      request.on('error', (error) => {
        console.error(`HTTP request error for ${streamId}:`, error);
        onError(error);
        this.activeStreams.delete(streamId);
      });

      // Store the request so we can abort it later
      const streamData = this.activeStreams.get(streamId);
      if (streamData) {
        streamData.request = request;
      }

    } catch (error) {
      console.error(`Failed to fetch HTTP stream ${streamId}:`, error);
      onError(error);
      this.activeStreams.delete(streamId);
    }
  }

  /**
   * Extract boundary from Content-Type header
   */
  extractBoundary(contentType) {
    if (!contentType) return null;
    const match = contentType.match(/boundary=([^;]+)/i);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract JPEG frames from MJPEG buffer
   */
  extractFrames(buffer, boundary) {
    const frames = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    
    let startIndex = 0;
    while (true) {
      const boundaryIndex = buffer.indexOf(boundaryBuffer, startIndex);
      if (boundaryIndex === -1) break;

      // Find JPEG start (0xFFD8)
      const jpegStart = buffer.indexOf(Buffer.from([0xFF, 0xD8]), boundaryIndex);
      if (jpegStart === -1) break;

      // Find JPEG end (0xFFD9)
      const jpegEnd = buffer.indexOf(Buffer.from([0xFF, 0xD9]), jpegStart);
      if (jpegEnd === -1) break;

      // Extract frame
      const frame = buffer.slice(jpegStart, jpegEnd + 2);
      frames.push(frame);

      startIndex = jpegEnd + 2;
    }

    return frames;
  }

  /**
   * Stop a streaming camera
   */
  stopStream(streamId) {
    try {
      const streamData = this.activeStreams.get(streamId);
      
      if (!streamData) {
        return {
          success: false,
          message: 'Stream not found'
        };
      }

      // Mark as inactive
      streamData.isActive = false;

      // Stop FFmpeg process
      if (streamData.process) {
        streamData.process.kill('SIGTERM');
      }

      // Abort HTTP request
      if (streamData.request) {
        streamData.request.abort();
      }

      this.activeStreams.delete(streamId);

      console.log(`🛑 Stopped stream ${streamId}`);

      return {
        success: true,
        message: 'Stream stopped',
        streamId
      };

    } catch (error) {
      console.error(`Error stopping stream ${streamId}:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Check if a stream is active
   */
  isStreaming(streamId) {
    const streamData = this.activeStreams.get(streamId);
    return streamData && streamData.isActive;
  }

  /**
   * Get all active stream IDs
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.keys());
  }

  /**
   * Stop all active streams
   */
  stopAllStreams() {
    console.log(`🛑 Stopping all ${this.activeStreams.size} active streams`);
    
    for (const [streamId, streamData] of this.activeStreams) {
      try {
        streamData.isActive = false;
        if (streamData.process) {
          streamData.process.kill('SIGTERM');
        }
        if (streamData.request) {
          streamData.request.abort();
        }
      } catch (error) {
        console.error(`Error stopping stream ${streamId}:`, error);
      }
    }

    this.activeStreams.clear();
  }

  /**
   * Get stream info
   */
  getStreamInfo(streamId) {
    const streamData = this.activeStreams.get(streamId);
    
    if (!streamData) {
      return null;
    }

    return {
      streamId,
      type: streamData.type,
      streamUrl: streamData.streamUrl,
      startTime: streamData.startTime,
      fps: streamData.fps,
      resolution: streamData.resolution,
      uptime: Date.now() - streamData.startTime.getTime(),
      isActive: streamData.isActive
    };
  }

  /**
   * Test camera connection
   */
  async testConnection(streamUrl, timeout = 15000) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 Testing connection to ${streamUrl.replace(/:[^:@]*@/, ':***@')}`);

      // Test HTTP streams differently
      if (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')) {
        const httpModule = streamUrl.startsWith('https://') ? https : http;
        const request = httpModule.get(streamUrl, (response) => {
          if (response.statusCode === 200) {
            resolve({ success: true, message: 'HTTP connection successful' });
          } else {
            reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          }
          request.abort();
        });

        request.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          request.abort();
          reject(new Error('Connection timeout'));
        }, timeout);

        return;
      }

      // Test RTSP with FFmpeg
      const ffmpeg = spawn(FFMPEG_PATH, [
        '-rtsp_transport', 'tcp',
        '-i', streamUrl,
        '-vframes', '1',
        '-f', 'null',
        '-'
      ]);

      let hasResponded = false;

      const cleanup = () => {
        if (!hasResponded) {
          hasResponded = true;
          try {
            ffmpeg.kill('SIGTERM');
          } catch (e) {
            // Ignore
          }
        }
      };

      // Timeout
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Connection timeout'));
      }, timeout);

      ffmpeg.on('close', (code) => {
        clearTimeout(timer);
        if (!hasResponded) {
          hasResponded = true;
          if (code === 0 || code === null) {
            resolve({ success: true, message: 'Connection successful' });
          } else {
            reject(new Error(`Connection failed with code ${code}`));
          }
        }
      });

      ffmpeg.on('error', (error) => {
        clearTimeout(timer);
        cleanup();
        if (!hasResponded) {
          hasResponded = true;
          reject(error);
        }
      });
    });
  }

  // ============================================
  // DATABASE OPERATIONS - CAMERA MANAGEMENT
  // ============================================

  /**
   * Create a new camera with streaming configuration
   */
  async createCamera(data) {
    try {
      console.log("📹 Creating camera with data:", data);

      // ✅ Validate required fields
      if (!data.tenant_id) throw new Error("tenant_id is required");
      if (!data.branch_id) throw new Error("branch_id is required");
      if (!data.camera_name) throw new Error("camera_name is required");
      if (!data.camera_code) throw new Error("camera_code is required");

      // ✅ Check if camera code already exists for this tenant
      const existingCamera = await Camera.findOne({
        where: {
          tenant_id: data.tenant_id,
          camera_code: data.camera_code
        }
      });

      if (existingCamera) {
        throw new Error(`Camera with code '${data.camera_code}' already exists for this tenant`);
      }

      // ✅ Verify branch exists and belongs to tenant
      const branch = await Branch.findOne({
        where: {
          branch_id: data.branch_id,
          tenant_id: data.tenant_id
        }
      });

      if (!branch) {
        throw new Error("Branch not found or does not belong to this tenant");
      }

      // 🆕 Auto-generate stream_url if IP address is provided
      if (data.ip_address && !data.stream_url) {
        data.stream_url = this.buildStreamUrl(data);
      }

      // 🆕 Set default values for new fields
      const cameraData = {
        ...data,
        connection_status: data.connection_status || 'disconnected',
        protocol: data.protocol || 'RTSP',
        port: data.port || '554',
        channel: data.channel || '1',
        processing_fps: data.processing_fps || 1,
        ai_processing_enabled: data.ai_processing_enabled !== undefined ? data.ai_processing_enabled : true
      };

      const camera = await Camera.create(cameraData);
      console.log("✅ Camera created successfully:", camera.camera_id);
      
      return camera;
    } catch (error) {
      console.error("❌ Error creating camera:", error.message);
      throw error;
    }
  }

  /**
   * Get all cameras with optional filters
   */
  async getAllCameras({ page = 1, limit = 10, is_active, tenant_id, connection_status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = {};
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }
      
      if (tenant_id) {
        where.tenant_id = tenant_id;
      }

      // 🆕 Filter by connection status
      if (connection_status) {
        where.connection_status = connection_status;
      }
      
      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'city']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras:", error);
      throw new Error("Failed to retrieve cameras: " + error.message);
    }
  }

  /**
   * Get cameras by user ID
   */
  async getCamerasByUser(userId, { page = 1, limit = 10, is_active, connection_status } = {}) {
    try {
      const offset = (page - 1) * limit;

      // WHERE conditions
      const where = { user_id: userId };

      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      if (connection_status) {
        where.connection_status = connection_status;
      }

      const result = await Camera.findAndCountAll({
        where,
        include: [
          {
            model: Tenant,
            as: "tenant",
            attributes: ["tenant_id", "tenant_name"]
          },
          {
            model: Branch,
            as: "branch",
            attributes: ["branch_id", "branch_name"]
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["created_at", "DESC"]]
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };

    } catch (error) {
      console.error("Error fetching cameras by user:", error);
      throw new Error("Failed to retrieve cameras by user");
    }
  }

  /**
   * Get camera by ID with full details
   */
  async getCameraById(id) {
    try {
      const camera = await Camera.findByPk(id, {
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'address', 'city']
          },
          { 
            model: ZoneConfig, 
            as: 'zones',
            where: { is_active: true },
            required: false
          }
        ]
      });

      if (!camera) {
        throw new Error("Camera not found");
      }

      return camera;
    } catch (error) {
      console.error("Error fetching camera by ID:", error);
      throw error;
    }
  }

  /**
   * Update camera with streaming config validation
   */
  async updateCamera(id, data) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      // ✅ If updating camera_code, check for duplicates
      if (data.camera_code && data.camera_code !== camera.camera_code) {
        const existingCamera = await Camera.findOne({
          where: {
            tenant_id: camera.tenant_id,
            camera_code: data.camera_code,
            camera_id: { [Op.ne]: id }
          }
        });

        if (existingCamera) {
          throw new Error(`Camera with code '${data.camera_code}' already exists`);
        }
      }

      // ✅ If updating branch, verify it belongs to the same tenant
      if (data.branch_id && data.branch_id !== camera.branch_id) {
        const branch = await Branch.findOne({
          where: {
            branch_id: data.branch_id,
            tenant_id: camera.tenant_id
          }
        });

        if (!branch) {
          throw new Error("Branch not found or does not belong to this tenant");
        }
      }

      // 🆕 Regenerate stream_url if connection details changed
      if (data.ip_address || data.port || data.username || data.password || data.protocol || data.channel) {
        const updatedConfig = { ...camera.toJSON(), ...data };
        data.stream_url = this.buildStreamUrl(updatedConfig);
      }

      await camera.update(data);
      
      // Return updated camera with associations
      return await this.getCameraById(id);
    } catch (error) {
      console.error("Error updating camera:", error);
      throw error;
    }
  }

  /**
   * Delete camera (with stream check)
   */
  async deleteCamera(id) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      // ✅ Check if camera has associated zones
      const zones = await ZoneConfig.findAll({
        where: { camera_id: id }
      });

      if (zones.length > 0) {
        throw new Error("Cannot delete camera with existing zones. Delete zones first.");
      }

      // 🆕 Stop stream if active
      if (this.isStreaming(id.toString())) {
        this.stopStream(id.toString());
      }
      
      await camera.destroy();
      return { 
        success: true,
        message: "Camera deleted successfully",
        camera_id: id
      };
    } catch (error) {
      console.error("Error deleting camera:", error);
      throw error;
    }
  }

  /**
   * Get cameras by tenant
   */
  async getCamerasByTenant(tenantId, { page = 1, limit = 10, is_active, connection_status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { tenant_id: tenantId };
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      // 🆕 Filter by connection status
      if (connection_status) {
        where.connection_status = connection_status;
      }

      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras by tenant:", error);
      throw new Error("Failed to retrieve cameras");
    }
  }

  /**
   * Get cameras by branch
   */
  async getCamerasByBranch(branchId, { page = 1, limit = 10, is_active, connection_status } = {}) {
    try {
      const offset = (page - 1) * limit;
      const where = { branch_id: branchId };
      
      if (is_active !== undefined) {
        where.is_active = is_active === 'true' || is_active === true;
      }

      // 🆕 Filter by connection status
      if (connection_status) {
        where.connection_status = connection_status;
      }

      const result = await Camera.findAndCountAll({
        where,
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name']
          },
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_id', 'branch_name']
          }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
      });

      return {
        cameras: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.count,
          totalPages: Math.ceil(result.count / limit)
        }
      };
    } catch (error) {
      console.error("Error fetching cameras by branch:", error);
      throw new Error("Failed to retrieve cameras");
    }
  }

  /**
   * Update camera status
   */
  async updateCameraStatus(id, is_active) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      await camera.update({ is_active });
      
      return await this.getCameraById(id);
    } catch (error) {
      console.error("Error updating camera status:", error);
      throw error;
    }
  }

  /**
   * Update camera connection status
   */
  async updateConnectionStatus(id, status, errorMessage = null) {
    try {
      const camera = await Camera.findByPk(id);
      if (!camera) throw new Error("Camera not found");

      const updateData = {
        connection_status: status
      };

      if (status === 'connected') {
        updateData.last_connected_at = new Date();
      }

      if (errorMessage) {
        updateData.last_error_message = errorMessage;
      }

      await camera.update(updateData);
      
      return camera;
    } catch (error) {
      console.error("Error updating connection status:", error);
      throw error;
    }
  }

  /**
   * Get camera statistics with streaming info
   */
  async getCameraStats(tenantId) {
    try {
      const totalCameras = await Camera.count({
        where: { tenant_id: tenantId }
      });

      const activeCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          is_active: true 
        }
      });

      // Connection status breakdown
      const connectedCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          connection_status: 'connected'
        }
      });

      const disconnectedCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          connection_status: 'disconnected'
        }
      });

      const errorCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          connection_status: 'error'
        }
      });

      // Recording enabled cameras
      const recordingCameras = await Camera.count({
        where: { 
          tenant_id: tenantId,
          recording_enabled: true
        }
      });

      const camerasByBranch = await Camera.findAll({
        where: { tenant_id: tenantId },
        attributes: [
          'branch_id',
          [sequelize.fn('COUNT', sequelize.col('camera_id')), 'count']
        ],
        include: [
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_name']
          }
        ],
        group: ['branch_id', 'branch.branch_id', 'branch.branch_name']
      });

      // Cameras by protocol
      const camerasByProtocol = await Camera.findAll({
        where: { tenant_id: tenantId },
        attributes: [
          'protocol',
          [sequelize.fn('COUNT', sequelize.col('camera_id')), 'count']
        ],
        group: ['protocol']
      });

      return {
        total: totalCameras,
        active: activeCameras,
        inactive: totalCameras - activeCameras,
        connected: connectedCameras,
        disconnected: disconnectedCameras,
        error: errorCameras,
        recording: recordingCameras,
        byBranch: camerasByBranch,
        byProtocol: camerasByProtocol
      };
    } catch (error) {
      console.error("Error fetching camera stats:", error);
      throw new Error("Failed to retrieve camera statistics");
    }
  }

  /**
   * Search cameras
   */
  async searchCameras(searchTerm, tenantId) {
    try {
      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId,
          [Op.or]: [
            { camera_name: { [Op.like]: `%${searchTerm}%` } },
            { camera_code: { [Op.like]: `%${searchTerm}%` } },
            { location_description: { [Op.like]: `%${searchTerm}%` } },
            { ip_address: { [Op.like]: `%${searchTerm}%` } }
          ]
        },
        include: [
          { model: Branch, as: 'branch' }
        ],
        limit: 20
      });

      return cameras;
    } catch (error) {
      console.error("Error searching cameras:", error);
      throw new Error("Failed to search cameras");
    }
  }

  /**
   * Get cameras ready for streaming
   */
  async getStreamReadyCameras(tenantId) {
    try {
      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId,
          is_active: true,
          ip_address: { [Op.ne]: null }
        },
        attributes: [
          'camera_id', 'camera_name', 'camera_code',
          'ip_address', 'port', 'protocol', 'username',
          'stream_url', 'resolution', 'fps', 'processing_fps',
          'connection_status', 'last_connected_at'
        ],
        order: [['camera_name', 'ASC']]
      });

      return cameras;
    } catch (error) {
      console.error("Error fetching stream-ready cameras:", error);
      throw new Error("Failed to retrieve cameras");
    }
  }

  /**
   * Get cameras by connection status
   */
  async getCamerasByConnectionStatus(tenantId, status) {
    try {
      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId,
          connection_status: status
        },
        include: [
          { model: Branch, as: 'branch', attributes: ['branch_name'] }
        ],
        order: [['last_connected_at', 'DESC']]
      });

      return cameras;
    } catch (error) {
      console.error("Error fetching cameras by status:", error);
      throw error;
    }
  }

  /**
   * Bulk update camera connection status
   */
  async bulkUpdateConnectionStatus(cameraIds, status) {
    try {
      await Camera.update(
        { 
          connection_status: status,
          ...(status === 'connected' ? { last_connected_at: new Date() } : {})
        },
        {
          where: {
            camera_id: {
              [Op.in]: cameraIds
            }
          }
        }
      );

      return {
        success: true,
        updated: cameraIds.length,
        status
      };
    } catch (error) {
      console.error("Error bulk updating status:", error);
      throw error;
    }
  }

  /**
   * Get camera uptime report
   */
  async getCameraUptimeReport(tenantId, days = 7) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);

      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId
        },
        attributes: [
          'camera_id',
          'camera_name',
          'camera_code',
          'uptime_percentage',
          'connection_status',
          'last_connected_at',
          'last_error_message'
        ],
        order: [['uptime_percentage', 'DESC']]
      });

      return cameras;
    } catch (error) {
      console.error("Error fetching uptime report:", error);
      throw error;
    }
  }

  /**
   * Get disconnected cameras that need attention
   */
  async getDisconnectedCameras(tenantId) {
    try {
      const cameras = await Camera.findAll({
        where: {
          tenant_id: tenantId,
          is_active: true,
          [Op.or]: [
            { connection_status: 'disconnected' },
            { connection_status: 'error' }
          ]
        },
        include: [
          { 
            model: Branch, 
            as: 'branch',
            attributes: ['branch_name']
          }
        ],
        order: [['last_connected_at', 'ASC']]
      });

      return cameras;
    } catch (error) {
      console.error("Error fetching disconnected cameras:", error);
      throw error;
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Build stream URL from camera configuration
   */
  buildStreamUrl(camera) {
    const { protocol, username, password, ip_address, port, channel, stream_path } = camera;
    
    if (!ip_address) return null;
    
    if (protocol === 'RTSP' || !protocol) {
      const auth = username && password ? `${username}:${password}@` : '';
      const path = stream_path || `/cam/realmonitor?channel=${channel || 1}&subtype=0`;
      return `rtsp://${auth}${ip_address}:${port || 554}${path}`;
    } else if (protocol === 'HTTP') {
      const auth = username && password ? `${username}:${password}@` : '';
      return `http://${auth}${ip_address}:${port || 80}/video.cgi`;
    } else if (protocol === 'RTMP') {
      return `rtmp://${ip_address}:${port || 1935}/live/stream${channel || 1}`;
    } else if (protocol === 'HLS') {
      return `http://${ip_address}:${port || 8080}/hls/stream${channel || 1}.m3u8`;
    }
    
    return camera.stream_url;
  }

  /**
   * Validate camera configuration
   */
  validateCameraConfig(camera) {
    const errors = [];

    if (!camera.ip_address) {
      errors.push("IP address is required for streaming");
    }

    if (!camera.protocol) {
      errors.push("Protocol is required");
    }

    if (camera.protocol === 'RTSP' && !camera.port) {
      errors.push("Port is required for RTSP protocol");
    }

    // Validate IP address format
    if (camera.ip_address) {
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(camera.ip_address)) {
        errors.push("Invalid IP address format");
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Cleanup on service shutdown
   */
  cleanup() {
    console.log('🧹 Cleaning up camera connection service...');
    this.stopAllStreams();
  }
}

module.exports = new CameraConnectionService();