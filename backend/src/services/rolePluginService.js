const RolePlugin = require("@models/RolePlugin");

async function getAllRolePlugins() {
  return RolePlugin.getAllRolePlugins();
}

async function getRolePluginById(id) {
  return RolePlugin.getRolePluginById(id);
}

async function createRolePlugin(data) {
  return RolePlugin.createRolePlugin(data);
}

async function updateRolePlugin(id, data) {
  return RolePlugin.updateRolePlugin(id, data);
}

async function deleteRolePlugin(id) {
  return RolePlugin.deleteRolePlugin(id);
}

// 👇 New Service Function
async function getScreensByRoleName(role_name) {
  return RolePlugin.getScreensByRoleName(role_name);
}

module.exports = {
  getAllRolePlugins,
  getRolePluginById,
  createRolePlugin,
  updateRolePlugin,
  deleteRolePlugin,
  getScreensByRoleName,
};
