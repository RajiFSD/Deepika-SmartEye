// src/services/productTenantMappingService.js
import api from './api';
import { normalizeArray } from './normalize';

const productTenantMappingService = {
  // Get all Mappings with pagination and filters
  getMappings: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
      });    
      
      const response = await api.get(`/tenant-products?${queryParams}`); 
      return normalizeArray(response, ['data.tenantProducts', 'data.data', 'data']);

    } catch (error) {
      console.error('❌ Error fetching mappings:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch mappings';
    }
  },

  // Get single Mapping by ID
  getMappingById: async (mappingId) => {
    try {
      const response = await api.get(`/tenant-products/${mappingId}`);
      return response.data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching mapping:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch mapping';
    }
  },

  // Get active Mappings (for dropdowns)
  getActiveMappings: async () => {
    try {           
      const response = await api.get('/tenant-products/active');           
      //return response.data;
      return response.data?.data || [];

    } catch (error) {
      console.error('❌ Error fetching active Mappings:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch active Mappings';
    }
  },

  // Create new Mapping
  createMapping: async (mappingData) => {
    try {            
      console.log('🔵 Creating mapping with data:', mappingData);
      const response = await api.post('/tenant-products', mappingData);            
      return response.data;
    } catch (error) {
      console.error('❌ Error creating mapping:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create mapping';
    }
  },

  // Update mapping
  updateMapping: async (mappingId, mappingData) => {
    try {
      const response = await api.put(`/tenant-products/${mappingId}`, mappingData);     
      return response.data;
    } catch (error) {
      console.error('❌ Error updating mapping:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update mapping';
    }
  },

  // Delete Mapping (soft delete)
  deleteMapping: async (mappingId) => {
    try {       
      const response = await api.delete(`/tenant-products/${mappingId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting mapping:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete mapping';
    }
  },

  // Get Mapping statistics
  getMappingStats: async (mappingId) => {
    try {
      //console.log('🔵 Fetching mapping stats:', mappingId);      
      const response = await api.get(`/tenant-products/${mappingId}/stats`);       
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching mapping stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch mapping stats';
    }
  },
};

export default productTenantMappingService;