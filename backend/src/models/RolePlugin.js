const { DataTypes } = require("sequelize");
const { sequelize } = require("@config/database");

/**
 * RolePlugin Model
 * ----------------
 * Stores role definitions and their assigned screens (modules)
 * for dynamic menu and permission management.
 */
const RolePlugin = sequelize.define(
  "RolePlugin",
  {
    role_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    role_name: {
      type: DataTypes.ENUM("super_admin", "admin", "manager", "viewer", "branch_admin"),
      allowNull: false,
      comment: "Defines the system role type",
    },
    screen_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Comma-separated list of accessible screens (e.g., Dashboard, Branches)",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "role_plugin",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_role_name",
        fields: ["role_name"],
      },
    ],
    hooks: {
      beforeCreate: (role, options) => {
        // Sanitize screen names (trim spaces, capitalize first letters)
        if (role.screen_name) {
          role.screen_name = sanitizeScreenList(role.screen_name);
        }
      },
      beforeUpdate: (role, options) => {
        if (role.changed("screen_name")) {
          role.screen_name = sanitizeScreenList(role.screen_name);
        }
      },
    },
  }
);

/**
 * Helper: sanitize and normalize screen names.
 * Converts "dashboard , branches" → "Dashboard, Branches"
 */
function sanitizeScreenList(screenString) {
  return screenString
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(", ");
}

/**
 * Static Methods (Class Methods for CRUD operations)
 */

// Get all role plugins
RolePlugin.getAllRolePlugins = async function () {
  try {
    const rolePlugins = await this.findAll({
      order: [['role_name', 'ASC']],
    });
    return rolePlugins.map(rp => rp.toPermissionObject());
  } catch (error) {
    console.error("Error in getAllRolePlugins:", error);
    throw error;
  }
};

// Get role plugin by ID
RolePlugin.getRolePluginById = async function (id) {
  try {
    const rolePlugin = await this.findByPk(id);
    return rolePlugin ? rolePlugin.toPermissionObject() : null;
  } catch (error) {
    console.error("Error in getRolePluginById:", error);
    throw error;
  }
};

// Create new role plugin
RolePlugin.createRolePlugin = async function (data) {
  try {
    const newRolePlugin = await this.create({
      role_name: data.role_name,
      screen_name: data.screen_name,
    });
    return newRolePlugin.toPermissionObject();
  } catch (error) {
    console.error("Error in createRolePlugin:", error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new Error("Duplicate role plugin entry");
    }
    throw error;
  }
};

// Update role plugin
RolePlugin.updateRolePlugin = async function (id, data) {
  try {
    const rolePlugin = await this.findByPk(id);
    
    if (!rolePlugin) {
      return null;
    }

    // Update fields
    if (data.role_name) rolePlugin.role_name = data.role_name;
    if (data.screen_name) rolePlugin.screen_name = data.screen_name;
    
    rolePlugin.updated_at = new Date();
    await rolePlugin.save();
    
    return rolePlugin.toPermissionObject();
  } catch (error) {
    console.error("Error in updateRolePlugin:", error);
    throw error;
  }
};

// Delete role plugin
RolePlugin.deleteRolePlugin = async function (id) {
  try {
    const rolePlugin = await this.findByPk(id);
    
    if (!rolePlugin) {
      return null;
    }

    await rolePlugin.destroy();
    return { message: "Role plugin deleted successfully", role_id: id };
  } catch (error) {
    console.error("Error in deleteRolePlugin:", error);
    throw error;
  }
};

// Get screens by role name (for menu building)
RolePlugin.getScreensByRoleName = async function (role_name) {
  try {
    const rolePlugins = await this.findAll({
      where: { role_name },
      attributes: ['role_id', 'role_name', 'screen_name'],
    });

    if (!rolePlugins || rolePlugins.length === 0) {
      return [];
    }

    // Combine all screens from all matching role records
    const allScreens = new Set();
    rolePlugins.forEach(rp => {
      const screens = rp.getScreens();
      screens.forEach(screen => allScreens.add(screen));
    });

    return {
      role_name,
      screens: Array.from(allScreens),
      role_plugins: rolePlugins.map(rp => rp.toPermissionObject()),
    };
  } catch (error) {
    console.error("Error in getScreensByRoleName:", error);
    throw error;
  }
};

/**
 * Instance Methods
 */

// ➤ Get list of screens as array
RolePlugin.prototype.getScreens = function () {
  return this.screen_name ? this.screen_name.split(",").map((s) => s.trim()) : [];
};

// ➤ Add new screen to role (auto-trims and avoids duplicates)
RolePlugin.prototype.addScreen = async function (newScreen) {
  const currentScreens = new Set(this.getScreens());
  currentScreens.add(newScreen.trim());
  this.screen_name = Array.from(currentScreens).join(", ");
  await this.save();
  return this;
};

// ➤ Remove a screen from role
RolePlugin.prototype.removeScreen = async function (screenToRemove) {
  const updated = this.getScreens().filter(
    (s) => s.toLowerCase() !== screenToRemove.toLowerCase()
  );
  this.screen_name = updated.join(", ");
  await this.save();
  return this;
};

// ➤ Check if role has access to a given screen
RolePlugin.prototype.hasAccessTo = function (screen) {
  return this.getScreens().some((s) => s.toLowerCase() === screen.toLowerCase());
};

// ➤ Export permissions as structured JSON
RolePlugin.prototype.toPermissionObject = function () {
  return {
    role_id: this.role_id,
    role_name: this.role_name,
    screens: this.getScreens(),
    created_at: this.created_at,
    updated_at: this.updated_at,
  };
};

module.exports = RolePlugin;