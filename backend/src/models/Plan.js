const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const Plan = sequelize.define(
  "Plan",
  {
    id: {
      type: DataTypes.STRING(50),
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    price_custom: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    period: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    cameras_limit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    users_limit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    storage_limit: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    retention_limit: {
      type: DataTypes.STRING(50),
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
    tableName: "plans",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_plan_name",
        fields: ["name"],
      },
      {
        name: "idx_is_popular",
        fields: ["is_popular"],
      },
    ],
  }
);

module.exports = Plan;