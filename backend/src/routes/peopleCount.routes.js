const express = require("express");
const router = express.Router();
const peopleCountController = require("../controllers/peopleCountController");

router.post("/", peopleCountController.create); // Create a new people count log
router.get("/", peopleCountController.getAll); // Get all people count logs
router.get("/:id", peopleCountController.getById); // Get log by ID
router.get("/camera/:cameraId", peopleCountController.getByCamera); // Get logs by camera
router.get("/tenant/:tenantId", peopleCountController.getByTenant); // Get logs by tenant
router.get("/branch/:branchId", peopleCountController.getByBranch); // Get logs by branch
router.get("/analytics/hourly", peopleCountController.getHourlyAnalytics); // Get hourly analytics
router.get("/analytics/daily", peopleCountController.getDailyAnalytics); // Get daily analytics

module.exports = router;