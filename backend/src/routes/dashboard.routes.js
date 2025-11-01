const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/overview/:tenantId", dashboardController.getOverview); // Get dashboard overview
router.get("/occupancy/:tenantId", dashboardController.getOccupancyData); // Get occupancy data
router.get("/alerts/:tenantId", dashboardController.getRecentAlerts); // Get recent alerts
router.get("/analytics/:tenantId", dashboardController.getAnalytics); // Get analytics data
router.get("/branch/:branchId", dashboardController.getBranchDashboard); // Get branch-specific dashboard

module.exports = router;