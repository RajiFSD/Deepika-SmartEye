const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

const Product = sequelize.define("Product", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_name: { type: DataTypes.STRING(255), allowNull: false },
  product_type: { type: DataTypes.STRING(100), allowNull: true },
  yolo_name: { type: DataTypes.STRING(100), allowNull: true },
  size: { type: DataTypes.STRING(100), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  uom: { type: DataTypes.STRING(50), allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "products",
  timestamps: true,
  underscored: false,
});

module.exports = Product;
