import api from './api';

const alertThresholdService = {
  // Get all alert thresholds
  getThresholds: async (params = {}) => {
    try {
      console.log('🔵 Fetching alert thresholds with params:', params);
      const response = await api.get('/alert-thresholds', { params });
      console.log('✅ Alert thresholds fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alert thresholds:', error);
      throw error.response?.data?.message || 'Failed to fetch alert thresholds';
    }
  },

  // Get threshold by ID
  getThresholdById: async (id) => {
    try {
      console.log('🔵 Fetching alert threshold:', id);
      const response = await api.get(`/alert-thresholds/${id}`);
      console.log('✅ Alert threshold fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alert threshold:', error);
      throw error.response?.data?.message || 'Failed to fetch alert threshold';
    }
  },

  // Create new threshold
  createThreshold: async (thresholdData) => {
    try {
      console.log('🔵 Creating alert threshold:', thresholdData);
      const response = await api.post('/alert-thresholds', thresholdData);
      console.log('✅ Alert threshold created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating alert threshold:', error);
      throw error.response?.data?.message || 'Failed to create alert threshold';
    }
  },

  // Update threshold
  updateThreshold: async (id, thresholdData) => {
    try {
      console.log('🔵 Updating alert threshold:', id, thresholdData);
      const response = await api.put(`/alert-thresholds/${id}`, thresholdData);
      console.log('✅ Alert threshold updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating alert threshold:', error);
      throw error.response?.data?.message || 'Failed to update alert threshold';
    }
  },

  // Delete threshold
  deleteThreshold: async (id) => {
    try {
      console.log('🔵 Deleting alert threshold:', id);
      const response = await api.delete(`/alert-thresholds/${id}`);
      console.log('✅ Alert threshold deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting alert threshold:', error);
      throw error.response?.data?.message || 'Failed to delete alert threshold';
    }
  },

  // Get thresholds by tenant
  getThresholdsByTenant: async (tenantId, params = {}) => {
    try {
      console.log('🔵 Fetching tenant thresholds:', tenantId, params);
      const response = await api.get(`/alert-thresholds/tenant/${tenantId}`, { params });
      console.log('✅ Tenant thresholds fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant thresholds:', error);
      throw error.response?.data?.message || 'Failed to fetch tenant thresholds';
    }
  },

  // Get thresholds by camera
  getThresholdsByCamera: async (cameraId, params = {}) => {
    try {
      console.log('🔵 Fetching camera thresholds:', cameraId, params);
      const response = await api.get(`/alert-thresholds/camera/${cameraId}`, { params });
      console.log('✅ Camera thresholds fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching camera thresholds:', error);
      throw error.response?.data?.message || 'Failed to fetch camera thresholds';
    }
  },

  // Toggle threshold status
  toggleThresholdStatus: async (id, isActive) => {
    try {
      console.log('🔵 Toggling threshold status:', id, isActive);
      const response = await api.put(`/alert-thresholds/${id}/status`, { is_active: isActive });
      console.log('✅ Threshold status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error toggling threshold status:', error);
      throw error.response?.data?.message || 'Failed to toggle threshold status';
    }
  }
};

export default alertThresholdService;