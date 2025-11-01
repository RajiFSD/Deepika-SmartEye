const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const AlertThreshold = sequelize.define(
  "AlertThreshold",
  {
    threshold_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    camera_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    zone_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    max_occupancy: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    alert_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    notification_email: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Comma-separated emails',
    },
    notification_webhook: {
      type: DataTypes.STRING(500),
      allowNull: true,
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
    tableName: "alert_thresholds",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "unique_camera_threshold",
        unique: true,
        fields: ["camera_id", "zone_id"],
      },
      {
        name: "idx_tenant_threshold",
        fields: ["tenant_id"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// AlertThreshold.belongsTo(Camera, { foreignKey: 'camera_id' });
// AlertThreshold.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// AlertThreshold.belongsTo(ZoneConfig, { foreignKey: 'zone_id' });

module.exports = AlertThreshold;