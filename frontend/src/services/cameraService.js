import axios from 'axios';

//const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const cameraService = {
  // Get all cameras with pagination
  getCameras: async (params = {}) => {
    try {
      console.log('🔵 Fetching cameras with params:', params);
      console.log('API URL:', API_URL);
      const response = await apiClient.get('/cameras', { params });
      console.log('✅ Cameras fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching cameras:', error);
      throw error.response?.data?.message || 'Failed to fetch cameras';
    }
  },

  // Get camera by ID
  getCameraById: async (id) => {
    try {
      console.log('🔵 Fetching camera:', id);
      const response = await apiClient.get(`/cameras/${id}`);
      console.log('✅ Camera fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching camera:', error);
      throw error.response?.data?.message || 'Failed to fetch camera';
    }
  },

  // Create new camera
  createCamera: async (cameraData) => {
    try {
      console.log('🔵 Creating camera:', cameraData);
      const response = await apiClient.post('/cameras', cameraData);
      console.log('✅ Camera created:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating camera:', error);
      console.error('❌ Error response:', error.response?.data);
      throw error.response?.data?.message || 'Failed to create camera';
    }
  },

  // Update camera
  updateCamera: async (id, cameraData) => {
    try {
      console.log('🔵 Updating camera:', id, cameraData);
      const response = await apiClient.put(`/cameras/${id}`, cameraData);
      console.log('✅ Camera updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating camera:', error);
      throw error.response?.data?.message || 'Failed to update camera';
    }
  },

  // Delete camera
  deleteCamera: async (id) => {
    try {
      console.log('🔵 Deleting camera:', id);
      const response = await apiClient.delete(`/cameras/${id}`);
      console.log('✅ Camera deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting camera:', error);
      throw error.response?.data?.message || 'Failed to delete camera';
    }
  },

  // Update camera status
  updateCameraStatus: async (id, is_active) => {
    try {
      console.log('🔵 Updating camera status:', id, is_active);
      const response = await apiClient.put(`/cameras/${id}/status`, { is_active });
      console.log('✅ Camera status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating camera status:', error);
      throw error.response?.data?.message || 'Failed to update camera status';
    }
  },

  // Get cameras by tenant
  getCamerasByTenant: async (tenantId, params = {}) => {
    try {
      console.log('🔵 Fetching tenant cameras:', tenantId, params);
      const response = await apiClient.get(`/cameras/tenant/${tenantId}`, { params });
      console.log('✅ Tenant cameras fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching tenant cameras:', error);
      throw error.response?.data?.message || 'Failed to fetch tenant cameras';
    }
  },

  // Get cameras by branch
  getCamerasByBranch: async (branchId, params = {}) => {
    try {
      console.log('🔵 Fetching branch cameras:', branchId, params);
      const response = await apiClient.get(`/cameras/branch/${branchId}`, { params });
      console.log('✅ Branch cameras fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching branch cameras:', error);
      throw error.response?.data?.message || 'Failed to fetch branch cameras';
    }
  },

  // Test camera connection
  testCameraConnection: async (streamUrl) => {
    try {
      console.log('🔵 Testing camera connection:', streamUrl);
      const response = await apiClient.post('/cameras/test-connection', { stream_url: streamUrl });
      console.log('✅ Connection test result:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error testing camera connection:', error);
      throw error.response?.data?.message || 'Failed to test camera connection';
    }
  },

  // Get live stream info
  getLiveStream: async (id) => {
    try {
      console.log('🔵 Getting live stream for camera:', id);
      const response = await apiClient.get(`/cameras/${id}/stream`);
      console.log('✅ Stream info retrieved:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error getting stream info:', error);
      throw error.response?.data?.message || 'Failed to get stream info';
    }
  },

  // Get camera statistics
  getCameraStats: async (tenantId) => {
    try {
      console.log('🔵 Fetching camera stats for tenant:', tenantId);
      const response = await apiClient.get(`/cameras/stats/${tenantId}`);
      console.log('✅ Camera stats fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching camera stats:', error);
      throw error.response?.data?.message || 'Failed to fetch camera stats';
    }
  },

  // Search cameras
  searchCameras: async (searchTerm, tenantId) => {
    try {
      console.log('🔵 Searching cameras:', searchTerm, tenantId);
      const response = await apiClient.get('/cameras/search', {
        params: { q: searchTerm, tenant_id: tenantId }
      });
      console.log('✅ Search results:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error searching cameras:', error);
      throw error.response?.data?.message || 'Failed to search cameras';
    }
  }
};

export default cameraService;