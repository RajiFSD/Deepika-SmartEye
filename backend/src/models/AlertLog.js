const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const AlertLog = sequelize.define(
  "AlertLog",
  {
    alert_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    threshold_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    camera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    current_occupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    max_occupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alert_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("triggered", "resolved"),
      defaultValue: "triggered",
    },
  },
  {
    tableName: "alert_logs",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_tenant_alerts",
        fields: ["tenant_id", "alert_time"],
      },
      {
        name: "idx_camera_alerts",
        fields: ["camera_id", "alert_time"],
      },
      {
        name: "idx_status",
        fields: ["status"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// AlertLog.belongsTo(AlertThreshold, { foreignKey: 'threshold_id' });
// AlertLog.belongsTo(Camera, { foreignKey: 'camera_id' });
// AlertLog.belongsTo(Tenant, { foreignKey: 'tenant_id' });

module.exports = AlertLog;