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

// ✅ Verify all models are loaded
console.log('📦 Verifying models loaded:', {
  Tenant: !!Tenant,
  User: !!User,
  RolePlugin: !!RolePlugin,
  Branch: !!Branch,
  Camera: !!Camera
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

// ============================================
// User Associations
// ============================================
User.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
User.belongsTo(RolePlugin, { foreignKey: "role_id", as: "role" }); // ✅ CRITICAL
User.hasMany(ZoneConfig, { foreignKey: "created_by", as: "createdZones" });
User.hasMany(PluginJob, { foreignKey: "user_id", as: "pluginJobs" });

// ============================================
// Branch Associations
// ============================================
Branch.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
Branch.hasMany(Camera, { foreignKey: "branch_id", as: "cameras" });
Branch.hasMany(PeopleCountLog, { foreignKey: "branch_id", as: "peopleCountLogs" });
Branch.hasMany(CurrentOccupancy, { foreignKey: "branch_id", as: "currentOccupancies" });

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

// ============================================
// ZoneConfig Associations
// ============================================
ZoneConfig.belongsTo(Camera, { foreignKey: "camera_id", as: "camera" });
ZoneConfig.belongsTo(Tenant, { foreignKey: "tenant_id", as: "tenant" });
ZoneConfig.belongsTo(User, { foreignKey: "created_by", as: "creator" });
ZoneConfig.hasMany(AlertThreshold, { foreignKey: "zone_id", as: "alertThresholds" });
ZoneConfig.hasMany(PeopleCountLog, { foreignKey: "zone_id", as: "peopleCountLogs" });
ZoneConfig.hasMany(CurrentOccupancy, { foreignKey: "zone_id", as: "currentOccupancies" });

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

Tenant.belongsTo(Plan, {
  foreignKey: 'subscription_plan_id',
  as: 'subscriptionPlan',
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