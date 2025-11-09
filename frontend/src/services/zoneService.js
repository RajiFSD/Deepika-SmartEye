// src/services/zoneService.js
import api from './api';

const zoneService = {
  // Get all zones with pagination and filters
  getZones: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '', cameraId = '', tenantId = '' } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
        ...(cameraId && { camera_id: cameraId }),
        ...(tenantId && { tenant_id: tenantId }),
      });
      console.log('🔵 Query Params:', queryParams.toString());
      
      const response = await api.get(`/zones?${queryParams}`);
 
      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching zones:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch zones';
    }
  },

  // Get single zone by ID
  getZoneById: async (zoneId) => {
    try {      
      const response = await api.get(`/zones/${zoneId}`);   
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching zone:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch zone';
    }
  },

  // Get zones by camera ID
  getZonesByCamera: async (cameraId, params = {}) => {
    try {
      const { page = 1, limit = 10, isActive = '' } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(isActive !== '' && { is_active: isActive }),
      });
      
      const response = await api.get(`/zones/camera/${cameraId}?${queryParams}`);  
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching zones by camera:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch zones by camera';
    }
  },

  // Get zones by tenant ID
  getZonesByTenant: async (tenantId, params = {}) => {
    try {
      const { page = 1, limit = 10, isActive = '' } = params;
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(isActive !== '' && { is_active: isActive }),
      });
      
      const response = await api.get(`/zones/tenant/${tenantId}?${queryParams}`);
       return response.data;
    } catch (error) {
      console.error('❌ Error fetching zones by tenant:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch zones by tenant';
    }
  },

  // Get active zones (for dropdowns)
  getActiveZones: async () => {
    try {      
       const response = await api.get('/zones', {
        params: { is_active: true, limit: 100 }
      });      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching active zones:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch active zones';
    }
  },

  // Create new zone
  createZone: async (zoneData) => {
    try {
      const response = await api.post('/zones', zoneData);
      console.log('✅ Zone created:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Error creating zone:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create zone';
    }
  },

  // Update zone
  updateZone: async (zoneId, zoneData) => {
    try {  
      
      const response = await api.put(`/zones/${zoneId}`, zoneData);   
      return response.data;
    } catch (error) {
      console.error('❌ Error updating zone:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update zone';
    }
  },

  // Delete zone (soft delete)
  deleteZone: async (zoneId) => {
    try { 
      const response = await api.delete(`/zones/${zoneId}`);      
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting zone:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete zone';
    }
  },

  // Update zone status
  updateZoneStatus: async (zoneId, isActive) => {
    try {      
      const response = await api.put(`/zones/${zoneId}/status`, { is_active: isActive });      
      return response.data;
    } catch (error) {
      console.error('❌ Error updating zone status:', error);
      throw error.response?.data?.message || error.message || 'Failed to update zone status';
    }
  },

  // Validate zone polygon
  validateZonePolygon: async (polygonData) => {
    try {    
      
      // This would typically call a backend validation endpoint
      // For now, we'll do basic client-side validation
      if (!Array.isArray(polygonData)) {
        throw new Error('Polygon must be an array of coordinates');
      }

      if (polygonData.length < 3) {
        throw new Error('Polygon must have at least 3 points');
      }

      // Validate each coordinate
      polygonData.forEach((point, index) => {
        if (typeof point.x !== 'number' || typeof point.y !== 'number') {
          throw new Error(`Point ${index} must have numeric x and y coordinates`);
        }
      });

  
      return { valid: true, message: 'Zone polygon is valid' };
    } catch (error) {
      console.error('❌ Error validating zone polygon:', error);
      throw error.message || 'Failed to validate zone polygon';
    }
  },

  // Get zone occupancy statistics
  getZoneOccupancy: async (zoneId) => {
    try {
      
      // This endpoint would need to be implemented in your backend
      const response = await api.get(`/zones/${zoneId}/occupancy`);

      return response.data;
    } catch (error) {
      console.error('❌ Error fetching zone occupancy:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch zone occupancy';
    }
  },

  // Get zone statistics
  getZoneStats: async (zoneId) => {
    try {
      
      // This would be a custom endpoint for zone-specific statistics
      const response = await api.get(`/zones/${zoneId}/stats`);   
 
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching zone stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch zone stats';
    }
  },
};

export default zoneService;