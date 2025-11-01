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
    ],
  }
);

// Define associations (add these after all models are defined)
// Camera.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// Camera.belongsTo(Branch, { foreignKey: 'branch_id' });

module.exports = Camera;