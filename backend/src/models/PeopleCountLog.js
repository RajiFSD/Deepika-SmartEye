const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const PeopleCountLog = sequelize.define(
  "PeopleCountLog",
  {
    log_id: {
      type: DataTypes.BIGINT,
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    zone_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    person_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Tracking ID from DeepSORT/ByteTrack",
    },
    direction: {
      type: DataTypes.ENUM("IN", "OUT"),
      allowNull: false,
    },
    detection_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    frame_number: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    confidence_score: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      comment: "Detection confidence (0-1)",
    },
    image_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Path to stored snapshot",
    },
    thumbnail_path: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Path to thumbnail image",
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional detection metadata",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "people_count_logs",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_camera_time",
        fields: ["camera_id", "detection_time"],
      },
      {
        name: "idx_tenant_time",
        fields: ["tenant_id", "detection_time"],
      },
      {
        name: "idx_branch_time",
        fields: ["branch_id", "detection_time"],
      },
      {
        name: "idx_direction",
        fields: ["direction"],
      },
      {
        name: "idx_person_tracking",
        fields: ["person_id", "detection_time"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// PeopleCountLog.belongsTo(Camera, { foreignKey: 'camera_id' });
// PeopleCountLog.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// PeopleCountLog.belongsTo(Branch, { foreignKey: 'branch_id' });
// PeopleCountLog.belongsTo(ZoneConfig, { foreignKey: 'zone_id' });

module.exports = PeopleCountLog;