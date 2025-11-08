const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const User = sequelize.define(
  "User",
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenant_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    // ✅ FIXED: Changed from ENUM to INTEGER to match database schema
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Foreign key to role_plugin table",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    last_login: {
      type: DataTypes.DATE,
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
    tableName: "users",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_tenant_user",
        fields: ["tenant_id", "user_id"],
      },
      {
        name: "idx_email",
        fields: ["email"],
      },
      {
        name: "idx_username",
        fields: ["username"],
      },
      {
        name: "fk_users_role_id",
        fields: ["role_id"],
      },
    ],
  }
);

// ✅ Instance method to get role information
User.prototype.getRoleInfo = async function () {
  const RolePlugin = require('./RolePlugin');
  if (!this.role_id) return null;
  
  const role = await RolePlugin.findByPk(this.role_id);
  return role ? role.toPermissionObject() : null;
};

// ✅ Instance method to check if user has access to a screen
User.prototype.hasAccessTo = async function (screenName) {
  const RolePlugin = require('./RolePlugin');
  if (!this.role_id) return false;
  
  const role = await RolePlugin.findByPk(this.role_id);
  return role ? role.hasAccessTo(screenName) : false;
};

// ✅ Safe user object (without password)
User.prototype.toSafeObject = function () {
  return {
    user_id: this.user_id,
    tenant_id: this.tenant_id,
    username: this.username,
    email: this.email,
    full_name: this.full_name,
    role_id: this.role_id,
    is_active: this.is_active,
    last_login: this.last_login,
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

module.exports = User;