const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");
const Product = require("./Product");
const ProductConfiguration = require("./ProductConfiguration");

const TenantProduct = sequelize.define("TenantProduct", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER, allowNull: false },
  branch_id: { type: DataTypes.INTEGER, allowNull: false },
  camera_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  configuration_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "tenant_product",
  timestamps: true,
  underscored: false,
});

TenantProduct.belongsTo(Product, { foreignKey: "product_id", as: "product" });
TenantProduct.belongsTo(ProductConfiguration, { foreignKey: "configuration_id", as: "configuration" });

module.exports = TenantProduct;
