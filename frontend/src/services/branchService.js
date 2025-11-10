// src/services/branchService.js
import api from './api';

const branchService = {
  // Get all branches with pagination and filters
  getBranches: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '' } = params;
      
      console.log('🔵 Fetching branches from:', api.defaults.baseURL + '/branches');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
      });
     
      
      const response = await api.get(`/branches?${queryParams}`);
      
    
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching branches:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch branches';
    }
  },

  // Get single branch by ID
  getBranchById: async (branchId) => {
    try {
      console.log('🔵 Fetching branch:', branchId);
      
      const response = await api.get(`/branches/${branchId}`);
      
      console.log('✅ Branch fetched:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching branch:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch branch';
    }
  },

  // Get active branches (for dropdowns)
  getActiveBranches: async () => {
    try {
           
      const response = await api.get('/branches/active');
      
          
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching active branches:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch active branches';
    }
  },

  // Create new branch
  createBranch: async (branchData) => {
    try {
            
      const response = await api.post('/branches', branchData);
            
      return response.data;
    } catch (error) {
      console.error('❌ Error creating branch:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create branch';
    }
  },

  // Update branch
  updateBranch: async (branchId, branchData) => {
    try {
      const response = await api.put(`/branches/${branchId}`, branchData);     
          
      return response.data;
    } catch (error) {
      console.error('❌ Error updating branch:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update branch';
    }
  },

  // Delete branch (soft delete)
  deleteBranch: async (branchId) => {
    try {
       
      const response = await api.delete(`/branches/${branchId}`);
           
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting branch:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete branch';
    }
  },

  // Get branch statistics
  getBranchStats: async (branchId) => {
    try {
      console.log('🔵 Fetching branch stats:', branchId);
      
      const response = await api.get(`/branches/${branchId}/stats`);
      
     
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching branch stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch branch stats';
    }
  },
};

export default branchService;