const express = require("express");
const router = express.Router();
const peopleCountController = require("../controllers/peopleCountController");

router.post("/", peopleCountController.create);
router.get("/", peopleCountController.getAll);

// CRITICAL: Analytics routes MUST be before /:id route
router.get("/analytics/hourly", peopleCountController.getHourlyAnalytics);
router.get("/analytics/daily", peopleCountController.getDailyAnalytics);

router.get("/camera/:cameraId", peopleCountController.getByCamera);
router.get("/tenant/:tenantId", peopleCountController.getByTenant);
router.get("/branch/:branchId", peopleCountController.getByBranch);

// This MUST be last
router.get("/:id", peopleCountController.getById);

module.exports = router;