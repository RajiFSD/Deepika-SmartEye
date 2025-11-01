import axios from 'axios';

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
    const token = localStorage.getItem('authToken');
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
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const uploadAnalysisService = {
  // Upload file for analysis
  uploadFile: async (formData, onProgress) => {
    try {
      console.log('📤 Uploading file for analysis');
      const response = await apiClient.post('/upload-analysis/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
      console.log('✅ File uploaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error uploading file:', error);
      throw error.response?.data?.message || 'Failed to upload file';
    }
  },

  // Start analysis for a job
  startAnalysis: async (jobId) => {
    try {
      console.log('🔵 Starting analysis for job:', jobId);
      const response = await apiClient.post(`/upload-analysis/analyze/${jobId}`);
      console.log('✅ Analysis started:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error starting analysis:', error);
      throw error.response?.data?.message || 'Failed to start analysis';
    }
  },

  // Get all jobs
  getAllJobs: async (params = {}) => {
    try {
      console.log('🔵 Fetching all jobs with params:', params);
      const response = await apiClient.get('/upload-analysis/jobs', { params });
      console.log('✅ Jobs fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      throw error.response?.data?.message || 'Failed to fetch jobs';
    }
  },

  // Get job by ID
  getJobById: async (jobId) => {
    try {
      console.log('🔵 Fetching job:', jobId);
      const response = await apiClient.get(`/upload-analysis/jobs/${jobId}`);
      console.log('✅ Job fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching job:', error);
      throw error.response?.data?.message || 'Failed to fetch job';
    }
  },

  // Get job results
  getJobResults: async (jobId) => {
    try {
      console.log('🔵 Fetching results for job:', jobId);
      const response = await apiClient.get(`/upload-analysis/jobs/${jobId}/results`);
      console.log('✅ Results fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching results:', error);
      throw error.response?.data?.message || 'Failed to fetch results';
    }
  },

  // Get job detections
  getJobDetections: async (jobId, params = {}) => {
    try {
      console.log('🔵 Fetching detections for job:', jobId, params);
      const response = await apiClient.get(`/upload-analysis/jobs/${jobId}/detections`, { params });
      console.log('✅ Detections fetched:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching detections:', error);
      throw error.response?.data?.message || 'Failed to fetch detections';
    }
  },

  // Delete job
  deleteJob: async (jobId) => {
    try {
      console.log('🔵 Deleting job:', jobId);
      const response = await apiClient.delete(`/upload-analysis/jobs/${jobId}`);
      console.log('✅ Job deleted:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting job:', error);
      throw error.response?.data?.message || 'Failed to delete job';
    }
  },

  // Start streaming analysis
  // startStreamAnalysis: async (streamData) => {
  //   try {
  //     console.log('🔵 Starting stream analysis:', streamData);
  //     const response = await apiClient.post('/upload-analysis/stream/start', streamData);
  //     console.log('✅ Stream analysis started:', response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error('❌ Error starting stream analysis:', error);
  //     throw error.response?.data?.message || 'Failed to start stream analysis';
  //   }
  // },

  startStreamAnalysis: async (streamData) => {
  try {
    console.log('🔵 Starting stream analysis:', streamData);
    const response = await apiClient.post('/upload-analysis/stream/start', streamData);
    console.log('✅ Stream analysis started:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error starting stream analysis:', error);
    throw error.response?.data?.message || 'Failed to start stream analysis';
  }
},

  // Stop streaming analysis
  // stopStreamAnalysis: async (jobId) => {
  //   try {
  //     console.log('🔵 Stopping stream analysis:', jobId);
  //     const response = await apiClient.post(`/upload-analysis/stream/${jobId}/stop`);
  //     console.log('✅ Stream analysis stopped:', response.data);
  //     return response.data;
  //   } catch (error) {
  //     console.error('❌ Error stopping stream analysis:', error);
  //     throw error.response?.data?.message || 'Failed to stop stream analysis';
  //   }
  // },

  stopStreamAnalysis: async (jobId) => {
  try {
    console.log('🔵 Stopping stream analysis:', jobId);
    const response = await apiClient.post(`/upload-analysis/stream/${jobId}/stop`);
    console.log('✅ Stream analysis stopped:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error stopping stream analysis:', error);
    throw error.response?.data?.message || 'Failed to stop stream analysis';
  }
},

  // Get live counts (for streaming)
  // getLiveCounts: async (jobId) => {
  //   try {
  //     const response = await apiClient.get(`/upload-analysis/stream/${jobId}/counts`);
  //     return response.data;
  //   } catch (error) {
  //     console.error('❌ Error fetching live counts:', error);
  //     throw error.response?.data?.message || 'Failed to fetch live counts';
  //   }
  // },

  getLiveCounts: async (jobId) => {
  try {
    const response = await apiClient.get(`/upload-analysis/stream/${jobId}/counts`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching live counts:', error);
    throw error.response?.data?.message || 'Failed to fetch live counts';
  }
},


// In the frontend uploadAnalysisService.js - Add this method

// Check if job should be automatically completed
checkAutoCompletion: async (jobId, videoDuration) => {
  try {
    // If we have video duration, set a timeout to check completion
    if (videoDuration) {
      // Add buffer time (30 seconds) for processing
      const expectedCompletionTime = (videoDuration + 30) * 1000;
      
      return new Promise((resolve) => {
        setTimeout(async () => {
          try {
            const response = await apiClient.get(`/upload-analysis/jobs/${jobId}/results`);
            const jobData = response.data?.data || response.data;
            
            if (jobData.status === 'completed') {
              resolve(true);
            } else {
              // If not completed but should be, force status check
              console.log('⏰ Expected completion time reached, checking status...');
              resolve(false);
            }
          } catch (error) {
            console.error('❌ Error checking auto-completion:', error);
            resolve(false);
          }
        }, expectedCompletionTime);
      });
    }
    return false;
  } catch (error) {
    console.error('❌ Error in auto-completion check:', error);
    return false;
  }
},

};

export default uploadAnalysisService;