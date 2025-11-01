const express = require("express");
const router = express.Router();
const zoneController = require("../controllers/zoneController");

router.post("/", zoneController.create); // Create a new zone
router.get("/", zoneController.getAll); // Get all zones
router.get("/:id", zoneController.getById); // Get zone by ID
router.put("/:id", zoneController.update); // Update a zone
router.delete("/:id", zoneController.delete); // Delete a zone
router.get("/camera/:cameraId", zoneController.getByCamera); // Get zones by camera
router.get("/tenant/:tenantId", zoneController.getByTenant); // Get zones by tenant
router.put("/:id/status", zoneController.updateStatus); // Update zone status

module.exports = router;