const express = require("express");
const router = express.Router();
const cameraController = require("../controllers/cameraController");

router.post("/", cameraController.create); // Create a new camera
router.get("/", cameraController.getAll); // Get all cameras
router.get("/:id", cameraController.getById); // Get camera by ID
router.put("/:id", cameraController.update); // Update a camera
router.delete("/:id", cameraController.delete); // Delete a camera
router.get("/tenant/:tenantId", cameraController.getByTenant); // Get cameras by tenant
router.get("/branch/:branchId", cameraController.getByBranch); // Get cameras by branch
router.put("/:id/status", cameraController.updateStatus); // Update camera status

module.exports = router;