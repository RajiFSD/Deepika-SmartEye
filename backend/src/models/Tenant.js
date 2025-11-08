const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database"); // Import from database config

const Tenant = sequelize.define(
  "Tenant",
  {
    tenant_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenant_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tenant_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    subscription_type: {
      type: DataTypes.ENUM("basic", "premium", "enterprise"),
      defaultValue: "basic",
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

    // Add after the existing fields in the Tenant model definition
subscription_plan_id: {
  type: DataTypes.STRING(50),
  allowNull: true,
  references: {
    model: 'plans',
    key: 'id'
  },
},
subscription_start_date: {
  type: DataTypes.DATE,
  allowNull: true,
},
subscription_end_date: {
  type: DataTypes.DATE,
  allowNull: true,
},
subscription_status: {
  type: DataTypes.ENUM("active", "expired", "trial", "suspended"),
  defaultValue: "trial",
},
    
  },
  {
    tableName: "tenants",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_tenant_code",
        fields: ["tenant_code"],
      },
      {
        name: "idx_is_active",
        fields: ["is_active"],
      },
    ],
  }
);

module.exports = Tenant;