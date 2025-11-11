const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");
const Product = require("./Product");

const ProductConfiguration = sequelize.define("ProductConfiguration", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  product_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  layers_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  racks_per_layer: { type: DataTypes.INTEGER, defaultValue: 1 },
  items_per_rack: { type: DataTypes.INTEGER, defaultValue: 1 },
  box_capacity: { type: DataTypes.INTEGER },
  bottle_ml: { type: DataTypes.INTEGER },
  arrangement_type: { type: DataTypes.STRING(100) },
  tolerance_limit: { type: DataTypes.INTEGER, defaultValue: 0 },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "product_configuration",
  timestamps: true,
  underscored: false,
});

ProductConfiguration.belongsTo(Product, { foreignKey: "product_id", as: "product" });

module.exports = ProductConfiguration;
