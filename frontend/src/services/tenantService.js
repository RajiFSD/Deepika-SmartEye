// src/services/tenantService.js
import api from './api';

const tenantService = {
  // Get all tenants (super admin only)
  getAllTenants: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '' } = params;
      
      console.log('🔵 Fetching tenants from:', api.defaults.baseURL + '/tenants');
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
      });
      
      console.log('🔵 Query Params:', queryParams.toString());
      const response = await api.get(`/tenants?${queryParams}`);
      
      console.log('✅ Full Response Object:', response);
      console.log('✅ Response Data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenants:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch tenants';
    }
  },

  // Get single tenant by ID
  getTenantById: async (tenantId) => {
    try {   
      const response = await api.get(`/tenants/${tenantId}`);              
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch tenant';
    }
  },

  // Get current tenant info
  getCurrentTenant: async () => {
    try {           
      const response = await api.get('/tenants/current');          
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching current tenant:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch current tenant';
    }
  },

  // Create new tenant (super admin only)
  createTenant: async (tenantData) => {
    try {      
      const response = await api.post('/tenants', tenantData);      
      return response.data;
    } catch (error) {
      console.error('❌ Error creating tenant:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create tenant';
    }
  },

  // Update tenant
  updateTenant: async (tenantId, tenantData) => {
    try {     
      const response = await api.put(`/tenants/${tenantId}`, tenantData);      
      return response.data;
    } catch (error) {
      console.error('❌ Error updating tenant:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update tenant';
    }
  },

  // Delete tenant (soft delete)
  deleteTenant: async (tenantId) => {
    try {   
      const response = await api.delete(`/tenants/${tenantId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting tenant:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete tenant';
    }
  },

  // Get tenant statistics
  getTenantStats: async (tenantId) => {
    try {      
      const response = await api.get(`/tenants/${tenantId}/stats`);      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch tenant stats';
    }
  },

  // Check subscription limits
  checkSubscriptionLimits: async (tenantId) => {
    try {
      const response = await api.get(`/tenants/${tenantId}/subscription-limits`);
       return response.data;
    } catch (error) {
      console.error('❌ Error checking subscription limits:', error);
      throw error.response?.data?.message || error.message || 'Failed to check subscription limits';
    }
  },
};

export default tenantService;