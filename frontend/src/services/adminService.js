// src/services/adminService.js
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

  // Get all tenants
//   getTenants: async (params = {}) => {
//     try {
//       const { page = 1, limit = 10, search = '', isActive = '' } = params;
      
//       console.log('🔵 Fetching tenants from:', api.defaults.baseURL + '/admin/tenants');
      
//       const queryParams = new URLSearchParams({
//         page: page.toString(),
//         limit: limit.toString(),
//         ...(search && { search }),
//         ...(isActive !== '' && { is_active: isActive }),
//       });
      
//       const response = await api.get(`/admin/tenants?${queryParams}`);
//       console.log('✅ Tenants fetched:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching tenants:', error);
//       throw error.response?.data?.message || error.message || 'Failed to fetch tenants';
//     }
//   },

  // Get all branches
//   getBranches: async (params = {}) => {
//     try {
//       const { page = 1, limit = 10, search = '', isActive = '' } = params;
      
//       console.log('🔵 Fetching branches from:', api.defaults.baseURL + '/admin/branches');
      
//       const queryParams = new URLSearchParams({
//         page: page.toString(),
//         limit: limit.toString(),
//         ...(search && { search }),
//         ...(isActive !== '' && { is_active: isActive }),
//       });
      
//       const response = await api.get(`/admin/branches?${queryParams}`);
//       console.log('✅ Branches fetched:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching branches:', error);
//       throw error.response?.data?.message || error.message || 'Failed to fetch branches';
//     }
//   },

  // Get all cameras
//   getCameras: async (params = {}) => {
//     try {
//       const { page = 1, limit = 10, search = '', isActive = '' } = params;
      
//       console.log('🔵 Fetching cameras from:', api.defaults.baseURL + '/admin/cameras');
      
//       const queryParams = new URLSearchParams({
//         page: page.toString(),
//         limit: limit.toString(),
//         ...(search && { search }),
//         ...(isActive !== '' && { is_active: isActive }),
//       });
      
//       const response = await api.get(`/admin/cameras?${queryParams}`);
//       console.log('✅ Cameras fetched:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching cameras:', error);
//       throw error.response?.data?.message || error.message || 'Failed to fetch cameras';
//     }
//   },

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

  // Get system health
//   getSystemHealth: async () => {
//     try {
//       console.log('🔵 Fetching system health');
//       const response = await api.get('/admin/system/health');
//       console.log('✅ System health fetched:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching system health:', error);
//       throw error.response?.data?.message || error.message || 'Failed to fetch system health';
//     }
//   },

  // Get recent activities
//   getRecentActivities: async (limit = 10) => {
//     try {
//       console.log('🔵 Fetching recent activities');
//       const response = await api.get(`/admin/activities?limit=${limit}`);
//       console.log('✅ Recent activities fetched:', response.data);
//       return response.data;
//     } catch (error) {
//       console.error('❌ Error fetching recent activities:', error);
//       throw error.response?.data?.message || error.message || 'Failed to fetch recent activities';
//     }
//   },
};

export default adminService;