const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const ZoneConfig = sequelize.define(
  "ZoneConfig",
  {
    zone_id: {
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
    zone_name: {
      type: DataTypes.STRING(255),
      defaultValue: "Entry/Exit Zone",
    },
    polygon_json: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: "Array of {x, y} coordinates defining the zone",
    },
    direction_line_json: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Line coordinates for entry/exit direction detection",
    },
    entry_direction: {
      type: DataTypes.STRING(50),
      defaultValue: "UP",
      comment: "Direction considered as entry (UP/DOWN/LEFT/RIGHT)",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
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
    tableName: "zone_config",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_camera_zone",
        fields: ["camera_id", "zone_id"],
      },
      {
        name: "idx_tenant_zone",
        fields: ["tenant_id", "zone_id"],
      },
      {
        name: "idx_is_active",
        fields: ["is_active"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// ZoneConfig.belongsTo(Camera, { foreignKey: 'camera_id' });
// ZoneConfig.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// ZoneConfig.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

module.exports = ZoneConfig;