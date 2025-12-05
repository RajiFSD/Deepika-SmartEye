import api from './api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

class ObjectCounterService {
  async fetchJobs() {
    try {
      const response = await api.get('/object-counting/jobs');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }

  async fetchJob(jobId) {
    try {
      const response = await api.get(`/object-counting/job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch job:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch job');
    }
  }

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

  async uploadVideoConveyor(videoFile, options = {}, onProgress = null) {
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('model_type', options.model_type || 'line');
    formData.append('capture_images', options.capture_images !== false ? 'true' : 'false');
    
    // Add line counter parameters
    if (options.line_type !== undefined) {
      formData.append('line_type', options.line_type);
      console.log('📤 Sending line_type:', options.line_type);
    }
    if (options.line_position !== undefined) {
      formData.append('line_position', String(options.line_position));
      console.log('📤 Sending line_position:', options.line_position);
    }
    if (options.confidence !== undefined) {
      formData.append('confidence', String(options.confidence));
      console.log('📤 Sending confidence:', options.confidence);
    }
    if (options.class_id !== undefined) {
      formData.append('class_id', String(options.class_id));
      console.log('📤 Sending class_id:', options.class_id);
    }

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

  async startStream(streamData) {
    try {
      console.log('📤 Starting stream with data:', streamData);
      const response = await api.post('/object-counting/stream', streamData);
      console.log('✅ Stream started:', response.data);
      return response.data;
    } catch (error) {
      console.error('Stream start failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to start stream');
    }
  }

  async cancelJob(jobId) {
    try {
      const response = await api.post(`/object-counting/job/${jobId}/cancel`);
      return response.data;
    } catch (error) {
      console.error('Cancel job failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel job');
    }
  }

  async deleteJob(jobId) {
    try {
      const response = await api.delete(`/object-counting/job/${jobId}`);
      return response.data;
    } catch (error) {
      console.error('Delete job failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete job');
    }
  }

  async downloadResults(jobId, format = 'json') {
    try {
      if (format === 'json') {
        const response = await api.get(`/object-counting/job/${jobId}/download?format=json`);
        
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
        console.log('🎬 Downloading video for job:', jobId);
        
        // Download via axios with blob response
        const response = await api.get(
          `/object-counting/job/${jobId}/download?format=video`,
          { responseType: 'blob' }
        );
        
        console.log('✅ Video blob received, size:', response.data.size);
        
        // Create blob URL and trigger download
        const blob = new Blob([response.data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `counting_result_${jobId}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        console.log('✅ Video download initiated');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to download results');
    }
  }

  async getStats(filters = {}) {
    try {
      const response = await api.get('/object-counting/stats', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }

  getImageUrl(imageUrl) {
    return `${API_BASE}${imageUrl}`;
  }

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

export default new ObjectCounterService();