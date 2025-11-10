import api from './api';

// Don't include /api here since it's already in the api instance
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000/api';

/**
 * Object Counter Service
 * Handles all API calls for object counting functionality
 */
class ObjectCounterService {
  /**
   * Fetch all jobs for the current user
   */
  async fetchJobs() {
    try {
      const response = await api.get('/object-counting/jobs');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }

  /**
   * Fetch a single job by ID
   */
  async fetchJob(jobId) {
    try {
      const response = await api.get(`/object-counting/job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch job:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch job');
    }
  }

  /**
   * Fetch images for a specific job
   */
  async fetchJobImages(jobId) {
    try {
      const response = await api.get(`/object-counting/job/${jobId}/images`);
      console.log('Fetched job images response:', response);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch job images:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch job images');
    }
  }

  /**
   * Upload video file for processing
   * @param {File} videoFile - The video file to upload
   * @param {Object} options - Additional options (model_type, capture_images)
   * @param {Function} onProgress - Progress callback function
   */
  async uploadVideo(videoFile, options = {}, onProgress = null) {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('model_type', options.model_type || 'hog');
    formData.append('capture_images', options.capture_images !== false ? 'true' : 'false');

    try {
      const response = await api.post('/object-counting/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = (progressEvent.loaded / progressEvent.total) * 100;
            onProgress(progress);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(error.response?.data?.message || 'Upload failed');
    }
  }

  /**
   * Start stream processing from a camera
   */
  async startStream(streamData) {
    try {
      const response = await api.post('/object-counting/stream', streamData);
      return response.data;
    } catch (error) {
      console.error('Stream start failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to start stream');
    }
  }

  /**
   * Cancel a processing job
   */
  async cancelJob(jobId) {
    try {
      const response = await api.post(`/object-counting/job/${jobId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel job failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel job');
    }
  }

  /**
   * Delete a job and its associated files
   */
  async deleteJob(jobId) {
    try {
      const response = await api.delete(`/object-counting/job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Delete job failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete job');
    }
  }

  /**
   * Download job results
   * @param {string} jobId - Job ID
   * @param {string} format - 'json' or 'video'
   */
  async downloadResults(jobId, format = 'json') {
    try {
      if (format === 'json') {
        const response = await api.get(`/object-counting/job/${jobId}/download?format=json`);
        
        // Create blob and download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { 
          type: 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `job_${jobId}_results.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return response.data;
      } else if (format === 'video') {
        // For video, open in new tab with authentication
        const token = localStorage.getItem('authToken');
        console.log('🌐 Downloading video results with token:', token);
        const url = `${API_BASE}/object-counting/job/${jobId}/download?format=video&token=${token}`;
        console.log('🌐 Video download URL:', url);
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to download results');
    }
  }

  /**
   * Get job statistics
   */
  async getStats(filters = {}) {
    try {
      const response = await api.get('/object-counting/stats', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }

  /**
   * Get image URL for displaying
   */
  getImageUrl(imageUrl) {
    console.log('Getting full image URL for:', imageUrl);
    return `${API_BASE}${imageUrl}`;
  }

  /**
   * Save job results to people count logs
   */
  async saveToPeopleCount(jobId) {
    try {
      const response = await api.post(`/object-counting/job/${jobId}/save-to-people-count`);
      return response.data;
    } catch (error) {
      console.error('Failed to save to people count:', error);
      throw new Error(error.response?.data?.message || 'Failed to save results');
    }
  }
}

// Export singleton instance
export default new ObjectCounterService();