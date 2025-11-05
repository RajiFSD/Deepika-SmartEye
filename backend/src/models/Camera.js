const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const Camera = sequelize.define(
  "Camera",
  {
    camera_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    camera_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    camera_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    camera_type: {
      type: DataTypes.ENUM("IP", "USB", "RTSP", "DVR", "NVR"),
      defaultValue: "IP",
    },
    stream_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    
    // 🆕 Connection & Authentication
    ip_address: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    port: {
      type: DataTypes.STRING(10),
      defaultValue: "554",
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    protocol: {
      type: DataTypes.ENUM("RTSP", "HTTP", "RTMP", "ONVIF", "HLS"),
      defaultValue: "RTSP",
    },
    channel: {
      type: DataTypes.STRING(10),
      defaultValue: "1",
    },
    
    // 🆕 Stream Configuration
    stream_path: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Custom stream path like /cam/realmonitor?channel=1&subtype=0"
    },
    secondary_stream_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Backup/sub-stream URL"
    },
    recording_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    motion_detection_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    
    // 🆕 Connection Status & Health
    connection_status: {
      type: DataTypes.ENUM("connected", "disconnected", "error", "connecting"),
      defaultValue: "disconnected",
    },
    last_connected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    uptime_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0.00,
    },
    
    // 🆕 Hardware Information
    manufacturer: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    firmware_version: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    mac_address: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    
    // 🆕 PTZ Capabilities
    ptz_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    zoom_level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    pan_position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    tilt_position: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    
    // 🆕 AI Processing Configuration
    ai_processing_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    processing_fps: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: "Frames per second for AI processing"
    },
    detection_zones: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "JSON array of zone coordinates for detection"
    },
    
    // Original fields
    location_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    fps: {
      type: DataTypes.INTEGER,
      defaultValue: 25,
    },
    resolution: {
      type: DataTypes.STRING(20),
      defaultValue: "1920x1080",
    },
    
    // 🆕 Metadata
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tags: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Comma-separated tags"
    },
    
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "cameras",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "unique_camera_code",
        unique: true,
        fields: ["tenant_id", "camera_code"],
      },
      {
        name: "idx_tenant_camera",
        fields: ["tenant_id", "camera_id"],
      },
      {
        name: "idx_branch_camera",
        fields: ["branch_id", "camera_id"],
      },
      {
        name: "idx_is_active",
        fields: ["is_active"],
      },
      {
        name: "idx_ip_address",
        fields: ["ip_address"],
      },
      {
        name: "idx_connection_status",
        fields: ["connection_status"],
      },
      {
        name: "idx_recording_enabled",
        fields: ["recording_enabled"],
      },
    ],
    hooks: {
      beforeCreate: (camera, options) => {
        // Auto-generate stream_url if not provided but we have connection details
        if (!camera.stream_url && camera.ip_address) {
          camera.stream_url = buildStreamUrl(camera);
        }
      },
      beforeUpdate: (camera, options) => {
        // Update stream_url if connection details changed
        if (camera.changed('ip_address') || camera.changed('port') || 
            camera.changed('username') || camera.changed('password') || 
            camera.changed('protocol')) {
          camera.stream_url = buildStreamUrl(camera);
        }
      }
    }
  }
);

/**
 * Helper function to build stream URL from camera details
 */
function buildStreamUrl(camera) {
  const { protocol, username, password, ip_address, port, channel, stream_path } = camera;
  
  if (!ip_address) return null;
  
  if (protocol === 'RTSP') {
    const auth = username && password ? `${username}:${password}@` : '';
    const path = stream_path || `/cam/realmonitor?channel=${channel}&subtype=0`;
    return `rtsp://${auth}${ip_address}:${port}${path}`;
  } else if (protocol === 'HTTP') {
    const auth = username && password ? `${username}:${password}@` : '';
    return `http://${auth}${ip_address}:${port}/video.cgi`;
  } else if (protocol === 'RTMP') {
    return `rtmp://${ip_address}:${port}/live/stream${channel}`;
  }
  
  return null;
}

// Instance methods
Camera.prototype.buildStreamUrl = function() {
  return buildStreamUrl(this);
};

Camera.prototype.updateConnectionStatus = async function(status, errorMessage = null) {
  this.connection_status = status;
  if (status === 'connected') {
    this.last_connected_at = new Date();
  }
  if (errorMessage) {
    this.last_error_message = errorMessage;
  }
  await this.save();
};

Camera.prototype.isConnected = function() {
  return this.connection_status === 'connected';
};

Camera.prototype.getStreamConfig = function() {
  return {
    ip: this.ip_address,
    port: this.port,
    username: this.username,
    password: this.password,
    protocol: this.protocol,
    channel: this.channel,
    streamUrl: this.stream_url || this.buildStreamUrl(),
    fps: this.processing_fps || 1,
    resolution: this.resolution
  };
};

// Define associations (add these after all models are defined)
// Camera.belongsTo(Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
// Camera.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
// Camera.hasMany(ZoneConfig, { foreignKey: 'camera_id', as: 'zones' });

module.exports = Camera;