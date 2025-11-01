const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const CurrentOccupancy = sequelize.define(
  "CurrentOccupancy",
  {
    occupancy_id: {
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
    branch_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    zone_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    current_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_entries: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    total_exits: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_updated: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    reset_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      comment: "Last reset time (daily/manual)",
    },
  },
  {
    tableName: "current_occupancy",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "unique_camera_occupancy",
        unique: true,
        fields: ["camera_id", "zone_id"],
      },
      {
        name: "idx_tenant_occupancy",
        fields: ["tenant_id"],
      },
      {
        name: "idx_branch_occupancy",
        fields: ["branch_id"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// CurrentOccupancy.belongsTo(Camera, { foreignKey: 'camera_id' });
// CurrentOccupancy.belongsTo(Tenant, { foreignKey: 'tenant_id' });
// CurrentOccupancy.belongsTo(Branch, { foreignKey: 'branch_id' });
// CurrentOccupancy.belongsTo(ZoneConfig, { foreignKey: 'zone_id' });

module.exports = CurrentOccupancy;