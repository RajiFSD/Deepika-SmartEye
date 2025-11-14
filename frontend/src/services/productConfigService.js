// src/services/productConfigService.js
import api from './api';

const productConfigService = {
  // Get all product configurations with pagination and filters
  getConfigs: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
      });   
      
      //const response = await api.get(`/product-config?${queryParams}`); 
      const response = await api.get("/product-config");
      return response.data;
    } catch (error) {
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch configs';
    }
  },

  // Get single product-configs by ID
  getConfigById: async (configId) => {
    try {
      const response = await api.get(`/product-config/${configId}`);      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching product-config:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch product-config';
    }
  },

  // Get active configs (for dropdowns)
  getActiveProductConfigs: async () => {
    try {           
      const response = await api.get('/product-config/active');      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching active configs:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch active configs';
    }
  },

  // Create new product
  createConfig: async (configData) => {
    try {
      const { is_active, ...body } = configData;
      const response = await api.post('/product-config', body);

      return response.data;
    } catch (error) {
      console.error('❌ Error creating config:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create config';
    }
  },

  // Update config
  updateConfig: async (configId, configData) => {
    try {
      const { product_id, ...body } = configData;
      const response = await api.put(`/product-config/${configId}`, body);

      return response.data;
    } catch (error) {
      console.error('❌ Error updating config:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update config';
    }
  },

  // Delete config (soft delete)
  deleteConfig: async (configId) => {
    try {
      const response = await api.delete(`/product-config/${configId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting config:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete config';
    }
  },

  // Get config statistics
  getConfigStats: async (configId) => {
    try {
      const response = await api.get(`/product-config/${configId}/stats`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching config stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch config stats';
    }
  },
};

export default productConfigService;