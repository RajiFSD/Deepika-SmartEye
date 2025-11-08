const roleService = require("@services/rolePluginService");
const ResponseHandler = require("@utils/responseHandler");
const { rolePluginValidator } = require("@validators");

class RolePluginController {
  /**
   * GET /api/role-plugins
   * Fetch all role plugins
   */
  async getAllRolePlugins(req, res) {
    try {
      const result = await roleService.getAllRolePlugins();
      return ResponseHandler.success(res, result, "Role plugins fetched successfully");
    } catch (error) {
      console.error("Error in getAllRolePlugins:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/role-plugins/:id
   * Fetch a specific role plugin by ID
   */
  async getRolePluginById(req, res) {
    try {
      const { id } = req.params;
      const rolePlugin = await roleService.getRolePluginById(id);

      if (!rolePlugin) {
        return ResponseHandler.notFound(res, "Role plugin not found");
      }

      return ResponseHandler.success(res, rolePlugin, "Role plugin fetched successfully");
    } catch (error) {
      console.error("Error in getRolePluginById:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * POST /api/role-plugins
   * Create a new role plugin (e.g., assign screens to a role)
   */
  async createRolePlugin(req, res) {
    try {
      const { error } = rolePluginValidator.validate(req.body);
      if (error) {
        return ResponseHandler.badRequest(res, error.details[0].message);
      }

      const newRolePlugin = await roleService.createRolePlugin(req.body);
      return ResponseHandler.created(res, newRolePlugin, "Role plugin created successfully");
    } catch (error) {
      console.error("Error in createRolePlugin:", error);

      if (error.message.includes("Duplicate")) {
        return ResponseHandler.badRequest(res, "This role or screen already exists");
      }

      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * PUT /api/role-plugins/:id
   * Update an existing role plugin
   */
  async updateRolePlugin(req, res) {
    try {
      const { id } = req.params;
      const { error } = rolePluginValidator.validate(req.body);
      if (error) {
        return ResponseHandler.badRequest(res, error.details[0].message);
      }

      const updatedRolePlugin = await roleService.updateRolePlugin(id, req.body);

      if (!updatedRolePlugin) {
        return ResponseHandler.notFound(res, "Role plugin not found");
      }

      return ResponseHandler.success(res, updatedRolePlugin, "Role plugin updated successfully");
    } catch (error) {
      console.error("Error in updateRolePlugin:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * DELETE /api/role-plugins/:id
   * Delete or deactivate a role plugin
   */
  async deleteRolePlugin(req, res) {
    try {
      const { id } = req.params;
      const deleted = await roleService.deleteRolePlugin(id);

      if (!deleted) {
        return ResponseHandler.notFound(res, "Role plugin not found");
      }

      return ResponseHandler.success(res, deleted, "Role plugin deleted successfully");
    } catch (error) {
      console.error("Error in deleteRolePlugin:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  /**
   * GET /api/role-plugins/role/:role_name
   * Get all screens assigned to a given role (for menu building)
   */
  async getScreensByRoleName(req, res) {
    try {
      const { role_name } = req.params;
      const screens = await roleService.getScreensByRoleName(role_name);

      if (!screens || !screens.length) {
        return ResponseHandler.notFound(res, "No screens found for this role");
      }

      return ResponseHandler.success(res, screens, "Screens fetched successfully");
    } catch (error) {
      console.error("Error in getScreensByRoleName:", error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new RolePluginController();
