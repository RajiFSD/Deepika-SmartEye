const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const PluginJob = sequelize.define(
  "PluginJob",
  {
    job_id: {
      type: DataTypes.STRING(100),
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    camera_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    plugin_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "people_counting",
    },
    input_type: {
      type: DataTypes.ENUM("video", "image", "stream"),
      allowNull: false,
    },
    input_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed"),
      defaultValue: "pending",
    },
    result_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detection results summary",
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    total_detections: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    processing_time_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "plugin_jobs",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_tenant_jobs",
        fields: ["tenant_id", "created_at"],
      },
      {
        name: "idx_status",
        fields: ["status"],
      },
      {
        name: "idx_plugin_type",
        fields: ["plugin_type"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// PluginJob.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// PluginJob.belongsTo(User, { foreignKey: 'user_id' });
// PluginJob.belongsTo(Camera, { foreignKey: 'camera_id' });

module.exports = PluginJob;