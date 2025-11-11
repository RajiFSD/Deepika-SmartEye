const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");
const Product = require("./Product");

const ProductScanResult = sequelize.define("ProductScanResult", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  tenant_id: { type: DataTypes.INTEGER },
  branch_id: { type: DataTypes.INTEGER },
  camera_id: { type: DataTypes.INTEGER },
  product_id: { type: DataTypes.BIGINT.UNSIGNED },
  scanned_by: { type: DataTypes.INTEGER },
  total_expected: { type: DataTypes.INTEGER },
  total_detected: { type: DataTypes.INTEGER },
  missing_count: { type: DataTypes.INTEGER },
  qr_code: { type: DataTypes.STRING(255) },
  manufacturing_date: { type: DataTypes.DATE },
  expiry_date: { type: DataTypes.DATE },
  batch_number: { type: DataTypes.STRING(100) },
  result_status: { type: DataTypes.STRING(20) },
  alarm_triggered: { type: DataTypes.BOOLEAN, defaultValue: false },
  remarks: { type: DataTypes.TEXT },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: "product_scan_result",
  timestamps: true,
  underscored: false,
});

ProductScanResult.belongsTo(Product, { foreignKey: "product_id", as: "product" });

module.exports = ProductScanResult;
