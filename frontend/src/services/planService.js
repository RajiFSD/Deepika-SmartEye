import api from './api';

const planService = {
  // Get all plans with pagination
  getPlans: async (params = {}) => {
    try {
      const response = await api.get('/plans', { params });
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plans:', error);
      throw error.response?.data?.message || 'Failed to fetch plans';
    }
  },

  // Get plan by ID
  getPlanById: async (id) => {
    try {  
      const response = await api.get(`/plans/${id}`); 
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan:', error);
      throw error.response?.data?.message || 'Failed to fetch plan';
    }
  },

  // Get subscribers by plan
  getSubscribersByPlan: async (id, params = {}) => {
    try {     
      const response = await api.get(`/plans/${id}/subscribers`, { params });     
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan subscribers:', error);
      throw error.response?.data?.message || 'Failed to fetch plan subscribers';
    }
  },

  // Create new plan (super admin only)
  createPlan: async (planData) => {
    try {      
      const response = await api.post('/plans', planData);     
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
      const response = await api.put(`/plans/${id}`, planData);   
      return response.data;
    } catch (error) {
      console.error('❌ Error updating plan:', error);
      throw error.response?.data?.message || 'Failed to update plan';
    }
  },

  // Delete plan (super admin only)
  deletePlan: async (id) => {
    try {
      const response = await api.delete(`/plans/${id}`);     
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting plan:', error);
      throw error.response?.data?.message || 'Failed to delete plan';
    }
  },

  // Get plan statistics (super admin only)
  getPlanStats: async (params = {}) => {
    try {
      const response = await api.get('/plans/statistics/all', { params });    
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching plan statistics:', error);
      throw error.response?.data?.message || 'Failed to fetch plan statistics';
    }
  }
};

export default planService;