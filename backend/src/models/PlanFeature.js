const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const PlanFeature = sequelize.define(
  "PlanFeature",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    plan_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: 'plans',
        key: 'id'
      },
      onDelete: 'CASCADE',
    },
    feature_text: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_included: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    display_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "plan_features",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_plan_id",
        fields: ["plan_id"],
      },
      {
        name: "idx_display_order",
        fields: ["display_order"],
      },
    ],
  }
);

module.exports = PlanFeature;