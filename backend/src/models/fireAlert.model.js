// models/fireAlert.model.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const FireAlert = sequelize.define("FireAlert", {
    firealert_id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    camera_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    alert_timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    confidence: {
      type: DataTypes.DECIMAL(5,2),
      allowNull: false
    },
    snapshot_path: {
      type: DataTypes.STRING(500)
    },
    video_path: {
      type: DataTypes.STRING(500)
    },
    bounding_boxes: {
      type: DataTypes.JSON,
      allowNull: true
    },
    fire_type: {
      type: DataTypes.ENUM("smoke", "flame", "both"),
      defaultValue: "flame"
    },
    severity: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      defaultValue: "high"
    },
    status: {
      type: DataTypes.ENUM("active", "reviewed", "false_positive", "resolved"),
      defaultValue: "active"
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT
    },
    snapshot_base64: {
      type: DataTypes.TEXT('long'),
      allowNull: true
    }
  }, {
    tableName: "fire_alerts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  });

// Add association to Camera model
// FireAlert.associate = function(models) {
//   FireAlert.belongsTo(models.Camera, {
//     foreignKey: 'camera_id',
//     as: 'camera'
//   });
// };

module.exports = FireAlert;