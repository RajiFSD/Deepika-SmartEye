import api from './api';

const alertService = {
  // Get all alerts with pagination
  getAlerts: async (params = {}) => {
    try {
      console.log('🔵 Fetching alerts with params:', params);
      const response = await api.get('/alerts', { params });
      console.log('✅ Alerts fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alerts:', error);
      throw error.response?.data?.message || 'Failed to fetch alerts';
    }
  },

  // Get alert by ID
  getAlertById: async (id) => {
    try {
      console.log('🔵 Fetching alert:', id);
      const response = await api.get(`/alerts/${id}`);
      console.log('✅ Alert fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching alert:', error);
      throw error.response?.data?.message || 'Failed to fetch alert';
    }
  },

  // Create new alert
  createAlert: async (alertData) => {
    try {
      console.log('🔵 Creating alert:', alertData);
      const response = await api.post('/alerts', alertData);
      console.log('✅ Alert created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating alert:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error.response?.data?.message || 'Failed to create alert';
    }
  },

  // Update alert
  updateAlert: async (id, alertData) => {
    try {
      console.log('🔵 Updating alert:', id, alertData);
      const response = await api.put(`/alerts/${id}`, alertData);
      console.log('✅ Alert updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating alert:', error);
      throw error.response?.data?.message || 'Failed to update alert';
    }
  },

  // Delete alert
  deleteAlert: async (id) => {
    try {
      console.log('🔵 Deleting alert:', id);
      const response = await api.delete(`/alerts/${id}`);
      console.log('✅ Alert deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting alert:', error);
      throw error.response?.data?.message || 'Failed to delete alert';
    }
  },

  // Get alerts by tenant
  getAlertsByTenant: async (tenantId, params = {}) => {
    try {
      console.log('🔵 Fetching tenant alerts:', tenantId, params);
      const response = await api.get(`/alerts/tenant/${tenantId}`, { params });
      console.log('✅ Tenant alerts fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant alerts:', error);
      throw error.response?.data?.message || 'Failed to fetch tenant alerts';
    }
  },

  // Get alerts by camera
  getAlertsByCamera: async (cameraId, params = {}) => {
    try {
      console.log('🔵 Fetching camera alerts:', cameraId, params);
      const response = await api.get(`/alerts/camera/${cameraId}`, { params });
      console.log('✅ Camera alerts fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching camera alerts:', error);
      throw error.response?.data?.message || 'Failed to fetch camera alerts';
    }
  },

  // Resolve alert
  resolveAlert: async (id) => {
    try {
      console.log('🔵 Resolving alert:', id);
      const response = await api.put(`/alerts/${id}/resolve`);
      console.log('✅ Alert resolved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error resolving alert:', error);
      throw error.response?.data?.message || 'Failed to resolve alert';
    }
  }
};

export default alertService;