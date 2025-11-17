const express = require("express");
const router = express.Router();
const cameraController = require("../controllers/cameraController");
const cameraStreamController = require('../controllers/cameraStreamController');

// ========================================
// 📹 CRUD Operations
// ========================================
router.post("/", cameraController.create); // Create a new camera
router.get("/", cameraController.getAll); // Get all cameras (supports user_id filter)
router.get("/:id", cameraController.getById); // Get camera by ID
router.put("/:id", cameraController.update); // Update a camera (can update user_id)
router.delete("/:id", cameraController.delete); // Delete a camera

// ========================================
// 🏢 Tenant & Branch Operations
// ========================================
router.get("/tenant/:tenantId", cameraController.getByTenant); // Get cameras by tenant (supports user_id filter)
router.get("/branch/:branchId", cameraController.getByBranch); // Get cameras by branch (supports user_id filter)

// ========================================
// 👤 User Operations (NEW)
// ========================================
router.get("/user/:userId", cameraController.getByUser); // 🆕 Get cameras by user
router.put("/:id/assign-user", cameraController.assignToUser); // 🆕 Assign/unassign camera to user
router.post("/bulk/assign-user", cameraController.bulkAssignToUser); // 🆕 Bulk assign cameras to user

// ========================================
// ⚙️ Status Management
// ========================================
router.put("/:id/status", cameraController.updateStatus); // Update camera status
router.put("/bulk/status", cameraController.bulkUpdateStatus); // Bulk update status

// ========================================
// 🎥 Streaming Operations
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
router.get("/stats/disconnected", cameraController.getDisconnectedCameras); // 🆕 Get disconnected cameras

// ========================================
// 🎬 Stream Endpoints (if using cameraStreamController)
// ========================================
router.get("/:id/stream/mjpeg", cameraStreamController.streamMjpeg);
router.get("/:id/snapshot", cameraStreamController.getSnapshot);
router.get("/:id/stream/hls", cameraStreamController.streamHls);
router.post("/stream/test-connection", cameraStreamController.testConnection);

module.exports = router;