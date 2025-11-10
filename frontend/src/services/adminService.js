import api from './api';

const adminService = {
  // Get all users
  getUsers: async (params = {}) => {
    try {
      const { page = 1, limit = 100, search = '', role = '', tenant_id = '' } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && { role }),
        ...(tenant_id && { tenant_id }),
      });      
     
      const response = await api.get(`/admin/users?${queryParams}`);
      

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch users';
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to fetch user';
    }
  },

  getUsersByTenantId: async (tenantId) => {
  try {
    const response = await api.get(`/admin/tenants/${tenantId}/users`);
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Failed to fetch users for tenant';
  }
},

    // ✅ NEW: Get user count by tenant ID
  getUserCountByTenantId: async (tenantId) => {
    try {       
      const response = await api.get(`/admin/tenants/${tenantId}/users/count`);      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching user count:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch user count';
    }
  },

  // Create user
  createUser: async (userData) => {
    try {
      const response = await api.post('/admin/users', userData);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating user:', error.response);
      throw error.response?.data?.message || 'Failed to create user';
    }
  },

  // Update user
  updateUser: async (userId, userData) => {
    try {
      const response = await api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating user:', error.response);
      throw error.response?.data?.message || 'Failed to update user';
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      const response = await api.delete(`/admin/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting user:', error.response);
      throw error.response?.data?.message || 'Failed to delete user';
    }
  },

    // Update user status
  updateUserStatus: async (userId, isActive) => {
    try {
      const response = await api.put(`/admin/users/${userId}/status`, { is_active: isActive });
      return response.data;
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      throw error.response?.data?.message || error.message || 'Failed to update user status';
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard/stats'); 
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch dashboard stats';
    }
  },

  // ✅ NEW: Get branches by tenant
  getBranchesByTenant: async (tenantId) => {
    try {
      const response = await api.get(`/admin/tenants/${tenantId}/branches`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      throw error.response?.data?.message || 'Failed to fetch branches';
    }
  },
};

export default adminService;