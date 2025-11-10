const RolePlugin = require("@models/RolePlugin");
const { Op } = require("sequelize");

class RolePluginService {
  /**
   * Get all role plugins
   * @returns {Promise<Array>} Array of role plugin objects
   */
  async getAllRolePlugins() {
    try {
      const rolePlugins = await RolePlugin.findAll({
        order: [['role_name', 'ASC']],
      });
      
      return rolePlugins.map(rp => rp.toPermissionObject());
    } catch (error) {
      console.error("Error in getAllRolePlugins:", error);
      throw new Error("Failed to retrieve role plugins: " + error.message);
    }
  }

  /**
   * Get role plugin by ID
   * @param {number} id - Role plugin ID
   * @returns {Promise<Object|null>} Role plugin object or null
   */
  async getRolePluginById(id) {
    try {
      const rolePlugin = await RolePlugin.findByPk(id);
      
      if (!rolePlugin) {
        return null;
      }
      
      return rolePlugin.toPermissionObject();
    } catch (error) {
      console.error("Error in getRolePluginById:", error);
      throw new Error("Failed to retrieve role plugin: " + error.message);
    }
  }

  /**
   * Create new role plugin
   * @param {Object} data - Role plugin data
   * @param {string} data.role_name - Role name
   * @param {string} data.screen_name - Comma-separated screen names
   * @returns {Promise<Object>} Created role plugin object
   */
  async createRolePlugin(data) {
    try {
      // Validate required fields
      if (!data.role_name) {
        throw new Error("role_name is required");
      }
      if (!data.screen_name) {
        throw new Error("screen_name is required");
      }

      // Check if role already exists
      const existingRole = await RolePlugin.findOne({
        where: { role_name: data.role_name }
      });

      if (existingRole) {
        throw new Error(`Duplicate role: Role '${data.role_name}' already exists`);
      }

      const newRolePlugin = await RolePlugin.create({
        role_name: data.role_name,
        screen_name: data.screen_name,
      });
      
      console.log("✅ Role plugin created successfully:", newRolePlugin.role_id);
      return newRolePlugin.toPermissionObject();
    } catch (error) {
      console.error("Error in createRolePlugin:", error);
      
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error("Duplicate role plugin entry");
      }
      
      throw error;
    }
  }

  /**
   * Update role plugin
   * @param {number} id - Role plugin ID
   * @param {Object} data - Updated role plugin data
   * @returns {Promise<Object|null>} Updated role plugin object or null
   */
  async updateRolePlugin(id, data) {
    try {
      const rolePlugin = await RolePlugin.findByPk(id);
      
      if (!rolePlugin) {
        return null;
      }

      // Update fields if provided
      if (data.role_name) {
        // Check if new role_name conflicts with existing roles
        const existingRole = await RolePlugin.findOne({
          where: {
            role_name: data.role_name,
            role_id: { [Op.ne]: id }
          }
        });

        if (existingRole) {
          throw new Error(`Role name '${data.role_name}' already exists`);
        }
        
        rolePlugin.role_name = data.role_name;
      }
      
      if (data.screen_name) {
        rolePlugin.screen_name = data.screen_name;
      }
      
      rolePlugin.updated_at = new Date();
      await rolePlugin.save();
      
      console.log("✅ Role plugin updated successfully:", id);
      return rolePlugin.toPermissionObject();
    } catch (error) {
      console.error("Error in updateRolePlugin:", error);
      throw error;
    }
  }

  /**
   * Delete role plugin
   * @param {number} id - Role plugin ID
   * @returns {Promise<Object|null>} Deletion result or null
   */
  async deleteRolePlugin(id) {
    try {
      const rolePlugin = await RolePlugin.findByPk(id);
      
      if (!rolePlugin) {
        return null;
      }

      const deletedRoleName = rolePlugin.role_name;
      await rolePlugin.destroy();
      
      console.log("✅ Role plugin deleted successfully:", id);
      return { 
        success: true,
        message: "Role plugin deleted successfully", 
        role_id: id,
        role_name: deletedRoleName
      };
    } catch (error) {
      console.error("Error in deleteRolePlugin:", error);
      throw new Error("Failed to delete role plugin: " + error.message);
    }
  }

  /**
   * Get screens by role name (for menu building)
   * @param {string} role_name - Role name to search for
   * @returns {Promise<Object>} Object containing role info and screens
   */
  async getScreensByRoleName(role_name) {
    try {
      if (!role_name) {
        throw new Error("role_name is required");
      }

      const rolePlugins = await RolePlugin.findAll({
        where: { role_name },
        attributes: ['role_id', 'role_name', 'screen_name'],
      });

      if (!rolePlugins || rolePlugins.length === 0) {
        return {
          role_name,
          screens: [],
          message: "No screens found for this role"
        };
      }

      // Combine all screens from all matching role records (if multiple exist)
      const allScreens = new Set();
      rolePlugins.forEach(rp => {
        const screens = rp.getScreens();
        screens.forEach(screen => allScreens.add(screen));
      });

      return {
        role_name,
        screens: Array.from(allScreens),
        total_screens: allScreens.size,
        role_plugins: rolePlugins.map(rp => rp.toPermissionObject()),
      };
    } catch (error) {
      console.error("Error in getScreensByRoleName:", error);
      throw new Error("Failed to retrieve screens by role: " + error.message);
    }
  }

  /**
   * Add screen to role
   * @param {number} id - Role plugin ID
   * @param {string} screenName - Screen name to add
   * @returns {Promise<Object|null>} Updated role plugin object or null
   */
  async addScreenToRole(id, screenName) {
    try {
      const rolePlugin = await RolePlugin.findByPk(id);
      
      if (!rolePlugin) {
        return null;
      }

      await rolePlugin.addScreen(screenName);
      
      console.log(`✅ Screen '${screenName}' added to role:`, id);
      return rolePlugin.toPermissionObject();
    } catch (error) {
      console.error("Error in addScreenToRole:", error);
      throw new Error("Failed to add screen to role: " + error.message);
    }
  }

  /**
   * Remove screen from role
   * @param {number} id - Role plugin ID
   * @param {string} screenName - Screen name to remove
   * @returns {Promise<Object|null>} Updated role plugin object or null
   */
  async removeScreenFromRole(id, screenName) {
    try {
      const rolePlugin = await RolePlugin.findByPk(id);
      
      if (!rolePlugin) {
        return null;
      }

      await rolePlugin.removeScreen(screenName);
      
      console.log(`✅ Screen '${screenName}' removed from role:`, id);
      return rolePlugin.toPermissionObject();
    } catch (error) {
      console.error("Error in removeScreenFromRole:", error);
      throw new Error("Failed to remove screen from role: " + error.message);
    }
  }

  /**
   * Check if role has access to a screen
   * @param {string} role_name - Role name
   * @param {string} screenName - Screen name to check
   * @returns {Promise<boolean>} True if role has access, false otherwise
   */
  async checkRoleAccess(role_name, screenName) {
    try {
      const rolePlugin = await RolePlugin.findOne({
        where: { role_name }
      });

      if (!rolePlugin) {
        return false;
      }

      return rolePlugin.hasAccessTo(screenName);
    } catch (error) {
      console.error("Error in checkRoleAccess:", error);
      throw new Error("Failed to check role access: " + error.message);
    }
  }

  /**
   * Get role plugin statistics
   * @returns {Promise<Object>} Statistics object
   */
  async getRolePluginStats() {
    try {
      const totalRoles = await RolePlugin.count();
      
      const rolePlugins = await RolePlugin.findAll();
      
      const roleStats = rolePlugins.map(rp => ({
        role_name: rp.role_name,
        screen_count: rp.getScreens().length,
        screens: rp.getScreens()
      }));

      return {
        total_roles: totalRoles,
        roles: roleStats
      };
    } catch (error) {
      console.error("Error in getRolePluginStats:", error);
      throw new Error("Failed to retrieve role plugin statistics: " + error.message);
    }
  }
}

module.exports = new RolePluginService();