const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const Branch = sequelize.define(
  "Branch",
  {
    branch_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    branch_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    branch_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    timezone: {
      type: DataTypes.STRING(50),
      defaultValue: 'UTC',
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: "branches",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "unique_branch_code",
        unique: true,
        fields: ["tenant_id", "branch_code"],
      },
      {
        name: "idx_tenant_branch",
        fields: ["tenant_id", "branch_id"],
      },
      {
        name: "idx_is_active",
        fields: ["is_active"],
      },
    ],
  }
);

// Define associations (add these after all models are defined)
// Branch.belongsTo(Tenant, { foreignKey: 'tenant_id' });

module.exports = Branch;