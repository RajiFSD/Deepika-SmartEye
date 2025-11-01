const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.post("/generate", reportController.generateReport); // Generate a report
router.get("/", reportController.getAllReports); // Get all generated reports
router.get("/:id", reportController.getReportById); // Get report by ID
router.delete("/:id", reportController.deleteReport); // Delete a report
router.get("/types/available", reportController.getAvailableReportTypes); // Get available report types
router.post("/occupancy", reportController.generateOccupancyReport); // Generate occupancy report
router.post("/alerts", reportController.generateAlertReport); // Generate alert report

module.exports = router;