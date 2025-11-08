const express = require("express");
const controller = require("../controllers/rolePluginController");

const router = express.Router();

// Get all role plugins
router.get("/", controller.getAllRolePlugins);

// Get role plugin by ID
router.get("/:id", controller.getRolePluginById);

// Get screens by role name (this should come BEFORE /:id to avoid conflicts)
router.get("/role/:role_name", controller.getScreensByRoleName);

// Create new role plugin
router.post("/", controller.createRolePlugin);

// Update role plugin
router.put("/:id", controller.updateRolePlugin);

// Delete role plugin
router.delete("/:id", controller.deleteRolePlugin);

module.exports = router;
