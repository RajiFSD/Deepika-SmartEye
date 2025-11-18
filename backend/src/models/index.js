const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// ✅ Import all models
const Tenant = require('./Tenant');
const User = require('./User');
const Branch = require('./Branch');
const Camera = require('./Camera');
const ZoneConfig = require('./ZoneConfig');
const AlertThreshold = require('./AlertThreshold');
const AlertLog = require('./AlertLog');
const PeopleCountLog = require('./PeopleCountLog');
const CurrentOccupancy = require('./CurrentOccupancy');
const PluginJob = require('./PluginJob');
const DetectionAccuracy = require('./DetectionAccuracy');
const Plan = require('./Plan');
const PlanFeature = require('./PlanFeature');
const ObjectCountingJob = require('./objectCountingJob.model');
const RolePlugin = require('./RolePlugin');
// 🆕 Product-related Models
const Product = require("./Product");
const ProductConfiguration = require("./ProductConfiguration");
const TenantProduct = require("./TenantProduct");
const ProductScanResult = require("./ProductScanResult");
const FireAlert = require("./fireAlert.model");

// ✅ Verify all models are loaded
console.log('📦 Verifying models loaded:', {
  Tenant: !!Tenant,
  User: !!User,
  RolePlugin: !!RolePlugin,
  Branch: !!Branch,
  Camera: !!Camera,
  ObjectCountingJob: !!ObjectCountingJob
});

const models = {
  Tenant,
  User,
  Branch,
  Camera,
  ZoneConfig,
  AlertThreshold,
  AlertLog,
  PeopleCountLog,
  CurrentOccupancy,
  PluginJob,
  DetectionAccuracy,
  Plan,
  PlanFeature,
  ObjectCountingJob,
  RolePlugin,
  Product,
  ProductConfiguration,
  TenantProduct,
  ProductScanResult,
  FireAlert,
};

// ✅ ============================================
// ASSOCIATIONS - Define all relationships here
// ============================================

console.log('🔗 Setting up model associations...');

// ============================================
// RolePlugin Associations (MUST BE FIRST)
// ============================================
RolePlugin.hasMany(User, { 
  foreignKey: "role_id", 
  as: "users" 
});

// ============================================
// Tenant Associations
// ============================================
Tenant.hasMany(User, { foreignKey: "tenant_id", as: "users" });
Tenant.hasMany(Branch, { foreignKey: "tenant_id", as: "branches" });
Tenant.hasMany(Camera, { foreignKey: "tenant_id", as: "cameras" });
Tenant.hasMany(ZoneConfig, { foreignKey: "tenant_id", as: "zones" });
Tenant.hasMany(AlertThreshold, { foreignKey: "tenant_id", as: "alertThresholds" });
Tenant.hasMany(AlertLog, { foreignKey: "tenant_id", as: "alertLogs" });
Tenant.hasMany(PeopleCountLog, { foreignKey: "tenant_id", as: "peopleCountLogs" });
Tenant.hasMany(CurrentOccupancy, { foreignKey: "tenant_id", as: "currentOccupancies" });
Tenant.hasMany(PluginJob, { foreignKey: "tenant_id", as: "pluginJobs" });
Tenant.hasMany(DetectionAccuracy, { foreignKey: "tenant_id", as: "detectionAccuracies" });
Tenant.belongsTo(Plan, { foreignKey: 'subscription_plan_id', as: 'subscriptionPlan',});
Tenant.hasMany(TenantProduct, { foreignKey: "tenant_id", as: "tenantProducts", onDelete: "CASCADE", onUpdate: "CASCADE"});
Tenant.hasMany(ProductScanResult, { foreignKey: "tenant_id", as: "productScanResults", onDelete: "SET NULL", onUpdate: "CASCADE"});
// ============================================
// User Associations
// ============================================
User.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
User.belongsTo(RolePlugin, { foreignKey: "role_id", as: "role" }); // ✅ CRITICAL
User.hasMany(ZoneConfig, { foreignKey: "created_by", as: "createdZones" });
User.hasMany(PluginJob, { foreignKey: "user_id", as: "pluginJobs" });
User.hasMany(ObjectCountingJob, { foreignKey: "user_id", as: "objectCountingJobs" });
User.belongsTo(Branch, { foreignKey: 'branch_id', as: 'branch' });
User.hasMany(ProductScanResult, { foreignKey: "scanned_by", as: "scannedProducts", onDelete: "SET NULL", onUpdate: "CASCADE"});
User.hasMany(TenantProduct, { foreignKey: "user_id", as: "userProducts", onDelete: "CASCADE", onUpdate: "CASCADE"});
User.hasMany(Camera, { foreignKey: "user_id", as: "assignedCameras" });


// ============================================
// Branch Associations
// ============================================
Branch.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
Branch.hasMany(Camera, { foreignKey: "branch_id", as: "cameras" });
Branch.hasMany(PeopleCountLog, { foreignKey: "branch_id", as: "peopleCountLogs" });
Branch.hasMany(CurrentOccupancy, { foreignKey: "branch_id", as: "currentOccupancies" });
Branch.hasMany(ObjectCountingJob, { foreignKey: "branch_id", as: "objectCountingJobs" });
Branch.hasMany(User, { foreignKey: 'branch_id', as: 'users' });
Branch.hasMany(TenantProduct, { foreignKey: "branch_id", as: "branchProducts", onDelete: "CASCADE", onUpdate: "CASCADE"});
Branch.hasMany(ProductScanResult, { foreignKey: "branch_id", as: "branchScanResults", onDelete: "SET NULL", onUpdate: "CASCADE"});

// ============================================
// Camera Associations
// ============================================
Camera.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
Camera.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });
Camera.hasMany(ZoneConfig, { foreignKey: "camera_id", as: "zones" });
Camera.hasMany(AlertThreshold, { foreignKey: "camera_id", as: "alertThresholds" });
Camera.hasMany(AlertLog, { foreignKey: "camera_id", as: "alertLogs" });
Camera.hasMany(PeopleCountLog, { foreignKey: "camera_id", as: "peopleCountLogs" });
Camera.hasMany(CurrentOccupancy, { foreignKey: "camera_id", as: "currentOccupancies" });
Camera.hasMany(PluginJob, { foreignKey: "camera_id", as: "pluginJobs" });
Camera.hasMany(DetectionAccuracy, { foreignKey: "camera_id", as: "detectionAccuracies" });
Camera.hasMany(ObjectCountingJob, { foreignKey: "camera_id", as: "objectCountingJobs" });
Camera.hasMany(TenantProduct, { foreignKey: "camera_id", as: "cameraProducts", onDelete: "CASCADE", onUpdate: "CASCADE" });
Camera.hasMany(ProductScanResult, { foreignKey: "camera_id", as: "cameraScanResults", onDelete: "SET NULL", onUpdate: "CASCADE" });
Camera.belongsTo(User, { foreignKey: "user_id", as: "assignedUser" });

// ============================================
// ZoneConfig Associations
// ============================================
ZoneConfig.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
ZoneConfig.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
ZoneConfig.belongsTo(User, { foreignKey: "created_by", as: "creator" });
ZoneConfig.hasMany(AlertThreshold, { foreignKey: "zone_id", as: "alertThresholds" });
ZoneConfig.hasMany(PeopleCountLog, { foreignKey: "zone_id", as: "peopleCountLogs" });
ZoneConfig.hasMany(CurrentOccupancy, { foreignKey: "zone_id", as: "currentOccupancies" });
ZoneConfig.hasMany(ObjectCountingJob, { foreignKey: "zone_id", as: "objectCountingJobs" });

// ============================================
// AlertThreshold Associations
// ============================================
AlertThreshold.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
AlertThreshold.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
AlertThreshold.belongsTo(ZoneConfig, { foreignKey: "zone_id", as: "zone" });
AlertThreshold.hasMany(AlertLog, { foreignKey: "threshold_id", as: "alertLogs" });

// ============================================
// AlertLog Associations
// ============================================
AlertLog.belongsTo(AlertThreshold, { foreignKey: "threshold_id", as: "alertThreshold" });
AlertLog.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
AlertLog.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });

// ============================================
// PeopleCountLog Associations
// ============================================
PeopleCountLog.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
PeopleCountLog.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
PeopleCountLog.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });
PeopleCountLog.belongsTo(ZoneConfig, { foreignKey: "zone_id", as: "zone" });

// ============================================
// CurrentOccupancy Associations
// ============================================
CurrentOccupancy.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
CurrentOccupancy.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
CurrentOccupancy.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });
CurrentOccupancy.belongsTo(ZoneConfig, { foreignKey: "zone_id", as: "zone" });

// ============================================
// PluginJob Associations
// ============================================
PluginJob.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
PluginJob.belongsTo(User, { foreignKey: "user_id", as: "user" });
PluginJob.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });

// ============================================
// DetectionAccuracy Associations
// ============================================
DetectionAccuracy.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
DetectionAccuracy.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });


// FireAlert Associations
FireAlert.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
FireAlert.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
FireAlert.belongsTo(Branch, { foreignKey: "branch_id", as: "branch" });
FireAlert.belongsTo(User, { foreignKey: "user_id", as: "user" });

Camera.hasMany(FireAlert, { foreignKey: "camera_id", as: "fire_alerts" });
Tenant.hasMany(FireAlert, { foreignKey: "tenant_id", as: "fire_alerts" });
Branch.hasMany(FireAlert, { foreignKey: "branch_id", as: "fire_alerts" });
User.hasMany(FireAlert, { foreignKey: "user_id", as: "resolved_alerts" });



// ============================================
// ObjectCountingJob Associations
// ============================================
ObjectCountingJob.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE'
});

ObjectCountingJob.belongsTo(Branch, {
  foreignKey: 'branch_id',
  as: 'branch',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ObjectCountingJob.belongsTo(ZoneConfig, {
  foreignKey: 'zone_id',
  as: 'zone',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

ObjectCountingJob.belongsTo(Camera, {
  foreignKey: 'camera_id',
  as: 'camera',
  onDelete: 'SET NULL',
  onUpdate: 'CASCADE'
});

// ============================================
// Plan and PlanFeature Associations
// ============================================
Plan.hasMany(PlanFeature, {
  foreignKey: 'plan_id',
  as: 'features',
  onDelete: 'CASCADE',
});

PlanFeature.belongsTo(Plan, {
  foreignKey: 'plan_id',
  as: 'plan',
});

// ============================================
// Plan and Tenant Associations
// ============================================
Plan.hasMany(Tenant, {
  foreignKey: 'subscription_plan_id',
  as: 'subscribers',
});

// ============================================
// 🆕 PRODUCT MODULE ASSOCIATIONS 
// ============================================

// Product ↔ ProductConfiguration
Product.hasMany(ProductConfiguration, { 
  foreignKey: "product_id", 
  as: "configurations", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
ProductConfiguration.belongsTo(Product, { 
  foreignKey: "product_id", 
  as: "baseProduct", // ✅ unique alias
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
ProductConfiguration.hasMany(TenantProduct, { 
  foreignKey: "configuration_id", 
  as: "tenantMappings", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});

// Product ↔ TenantProduct
Product.hasMany(TenantProduct, { 
  foreignKey: "product_id", 
  as: "tenantProductMappings", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(Product, { 
  foreignKey: "product_id", 
  as: "mappedProduct", // ✅ unique alias
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(ProductConfiguration, { 
  foreignKey: "configuration_id", 
  as: "configDetails", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(Tenant, { 
  foreignKey: "tenant_id", 
  as: "tenant", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(Branch, { 
  foreignKey: "branch_id", 
  as: "branch", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(Camera, { 
  foreignKey: "camera_id", 
  as: "camera", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});
TenantProduct.belongsTo(User, { 
  foreignKey: "user_id", 
  as: "user", 
  onDelete: "CASCADE", 
  onUpdate: "CASCADE"
});

// Product ↔ ProductScanResult
Product.hasMany(ProductScanResult, { 
  foreignKey: "product_id", 
  as: "scanResults", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
ProductScanResult.belongsTo(Product, { 
  foreignKey: "product_id", 
  as: "scannedProduct", // ✅ unique alias
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
ProductScanResult.belongsTo(Tenant, { 
  foreignKey: "tenant_id", 
  as: "tenant", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
ProductScanResult.belongsTo(Branch, { 
  foreignKey: "branch_id", 
  as: "branch", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
ProductScanResult.belongsTo(Camera, { 
  foreignKey: "camera_id", 
  as: "camera", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});
ProductScanResult.belongsTo(User, { 
  foreignKey: "scanned_by", 
  as: "scannedBy", 
  onDelete: "SET NULL", 
  onUpdate: "CASCADE"
});

console.log('✅ All model associations set up successfully');

// ============================================
// Database Sync
// ============================================
const syncDatabase = async () => {
  try {
    // Change to { alter: false } or { force: false } in production
    await sequelize.sync({ alter: false });
    console.log('✅ Database synchronized');
  } catch (error) {
    console.error('❌ Error syncing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  syncDatabase,
  ...models
};