const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

router.post("/", alertController.create); // Create a new alert
router.get("/", alertController.getAll); // Get all alerts
router.get("/:id", alertController.getById); // Get alert by ID
router.put("/:id", alertController.update); // Update an alert
router.delete("/:id", alertController.delete); // Delete an alert
router.get("/tenant/:tenantId", alertController.getByTenant); // Get alerts by tenant
router.get("/camera/:cameraId", alertController.getByCamera); // Get alerts by camera
router.put("/:id/resolve", alertController.resolveAlert); // Resolve an alert

module.exports = router;