import api from './api';

const planService = {
  // Get all plans with pagination
  getPlans: async (params = {}) => {
    try {
      console.log('🔵 Fetching plans with params:', params);
      const response = await api.get('/plans', { params });
      console.log('✅ Plans fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
      throw error.response?.data?.message || 'Failed to fetch plans';
    }
  },

  // Get plan by ID
  getPlanById: async (id) => {
    try {
      console.log('🔵 Fetching plan:', id);
      const response = await api.get(`/plans/${id}`);
      console.log('✅ Plan fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan:', error);
      throw error.response?.data?.message || 'Failed to fetch plan';
    }
  },

  // Get subscribers by plan
  getSubscribersByPlan: async (id, params = {}) => {
    try {
      console.log('🔵 Fetching plan subscribers:', id, params);
      const response = await api.get(`/plans/${id}/subscribers`, { params });
      console.log('✅ Plan subscribers fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan subscribers:', error);
      throw error.response?.data?.message || 'Failed to fetch plan subscribers';
    }
  },

  // Create new plan (super admin only)
  createPlan: async (planData) => {
    try {
      console.log('🔵 Creating plan:', planData);
      const response = await api.post('/plans', planData);
      console.log('✅ Plan created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating plan:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error.response?.data?.message || 'Failed to create plan';
    }
  },

  // Update plan (super admin only)
  updatePlan: async (id, planData) => {
    try {
      console.log('🔵 Updating plan:', id, planData);
      const response = await api.put(`/plans/${id}`, planData);
      console.log('✅ Plan updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating plan:', error);
      throw error.response?.data?.message || 'Failed to update plan';
    }
  },

  // Delete plan (super admin only)
  deletePlan: async (id) => {
    try {
      console.log('🔵 Deleting plan:', id);
      const response = await api.delete(`/plans/${id}`);
      console.log('✅ Plan deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      throw error.response?.data?.message || 'Failed to delete plan';
    }
  },

  // Get plan statistics (super admin only)
  getPlanStats: async (params = {}) => {
    try {
      console.log('🔵 Fetching plan statistics:', params);
      const response = await api.get('/plans/statistics/all', { params });
      console.log('✅ Plan statistics fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan statistics:', error);
      throw error.response?.data?.message || 'Failed to fetch plan statistics';
    }
  }
};

export default planService;