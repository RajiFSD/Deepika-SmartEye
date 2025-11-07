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
    role: {
      type: DataTypes.ENUM("super_admin", "admin", "manager", "viewer"),
      defaultValue: "viewer",
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
    ],
  }
);

// Define associations (add these after all models are defined)
// User.belongsTo(Tenant, { foreignKey: 'tenant_id' });

module.exports = User;