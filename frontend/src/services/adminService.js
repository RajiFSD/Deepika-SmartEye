// src/services/adminService.js - UPDATED
import api from './api';

const adminService = {
  // Get all users
  getUsers: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', role = '', isActive = '' } = params;
      
      console.log('🔵 Fetching users from:', api.defaults.baseURL + '/admin/users');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && { role }),
        ...(isActive !== '' && { is_active: isActive }),
      });
      
      console.log('🔵 Query Params:', queryParams.toString());
      const response = await api.get(`/admin/users?${queryParams}`);
      
      console.log('✅ Users fetched:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to fetch users';
    }
  },

  // ✅ NEW: Get users by tenant ID
  getUsersByTenantId: async (tenantId, params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', role = '', isActive = '' } = params;
      
      console.log('🔵 Fetching users for tenant:', tenantId);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(role && { role }),
        ...(isActive !== '' && { is_active: isActive }),
      });
      
      const response = await api.get(`/admin/tenants/${tenantId}/users?${queryParams}`);
      
      console.log('✅ Tenant users fetched:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant users:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch tenant users';
    }
  },

  // ✅ NEW: Get user count by tenant ID
  getUserCountByTenantId: async (tenantId) => {
    try {
      console.log('🔵 Fetching user count for tenant:', tenantId);
      
      const response = await api.get(`/admin/tenants/${tenantId}/users/count`);
      
      console.log('✅ User count fetched:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching user count:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch user count';
    }
  },

  login: async (email, password) => {
    try {
      console.log('🔵 Attempting login to:', api.defaults.baseURL + '/admin/auth/login');
            
      const response = await api.post('/admin/auth/login', { email, password });
      
      console.log('✅ Login response:', response);
      
      const { user, token, refreshToken } = response.data.data;
      
      // Store tokens and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Login failed';
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      console.log('🔵 Fetching user:', userId);
      const response = await api.get(`/admin/users/${userId}`);
      console.log('✅ User fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch user';
    }
  },

  // Create new user
  createUser: async (userData) => {
    try {
      console.log('🔵 Creating user:', userData);
      const response = await api.post('/admin/users', userData);
      console.log('✅ User created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create user';
    }
  },

  // Update user
  updateUser: async (userId, userData) => {
    try {
      console.log('🔵 Updating user:', userId, userData);
      const response = await api.put(`/admin/users/${userId}`, userData);
      console.log('✅ User updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update user';
    }
  },

  // Delete user
  deleteUser: async (userId) => {
    try {
      console.log('🔵 Deleting user:', userId);
      const response = await api.delete(`/admin/users/${userId}`);
      console.log('✅ User deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting user:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete user';
    }
  },

  // Update user status
  updateUserStatus: async (userId, isActive) => {
    try {
      console.log('🔵 Updating user status:', userId, isActive);
      const response = await api.put(`/admin/users/${userId}/status`, { is_active: isActive });
      console.log('✅ User status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      throw error.response?.data?.message || error.message || 'Failed to update user status';
    }
  },

  // Get dashboard statistics
  getDashboardStats: async () => {
    try {
      console.log('🔵 Fetching dashboard stats');
      const response = await api.get('/admin/dashboard/stats');
      console.log('✅ Dashboard stats fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch dashboard stats';
    }
  },
};

export default adminService;