const express = require("express");
const router = express.Router();
const cameraController = require("../controllers/cameraController");

// ========================================
// 📹 CRUD Operations
// ========================================
router.post("/", cameraController.create); // Create a new camera
router.get("/", cameraController.getAll); // Get all cameras
router.get("/:id", cameraController.getById); // Get camera by ID
router.put("/:id", cameraController.update); // Update a camera
router.delete("/:id", cameraController.delete); // Delete a camera

// ========================================
// 🏢 Tenant & Branch Operations
// ========================================
router.get("/tenant/:tenantId", cameraController.getByTenant); // Get cameras by tenant
router.get("/branch/:branchId", cameraController.getByBranch); // Get cameras by branch

// ========================================
// ⚙️ Status Management
// ========================================
router.put("/:id/status", cameraController.updateStatus); // Update camera status
router.put("/bulk/status", cameraController.bulkUpdateStatus); // Bulk update status

// ========================================
// 🎥 Streaming Operations (NEW)
// ========================================
router.post("/test-connection", cameraController.testConnection); // Test camera connection
router.get("/:id/stream-info", cameraController.getLiveStream); // Get stream info
router.post("/:id/start-stream", cameraController.startStream); // Start streaming
router.post("/:id/stop-stream", cameraController.stopStream); // Stop streaming
router.get("/:id/health", cameraController.getHealth); // Get camera health status

// ========================================
// 📊 Statistics & Analytics
// ========================================
router.get("/stats/streaming", cameraController.getStreamingStats); // Get streaming stats

module.exports = router;