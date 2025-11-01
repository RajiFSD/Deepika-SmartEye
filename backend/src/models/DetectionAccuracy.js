const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const DetectionAccuracy = sequelize.define(
  "DetectionAccuracy",
  {
    accuracy_id: {
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
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    total_detections: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    successful_detections: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    failed_detections: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    accuracy_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      get() {
        const total = this.getDataValue('total_detections');
        const successful = this.getDataValue('successful_detections');
        if (total > 0) {
          return ((successful * 100.0) / total).toFixed(2);
        }
        return 0;
      }
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "detection_accuracy",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "unique_camera_date",
        unique: true,
        fields: ["camera_id", "date"],
      },
      {
        name: "idx_tenant_accuracy",
        fields: ["tenant_id", "date"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// DetectionAccuracy.belongsTo(Camera, { foreignKey: 'camera_id' });
// DetectionAccuracy.belongsTo(Tenant, { foreignKey: 'tenant_id' });

module.exports = DetectionAccuracy;