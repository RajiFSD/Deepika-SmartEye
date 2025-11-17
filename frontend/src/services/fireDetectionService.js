// services/fireDetectionService.js

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class FireDetectionService {
  /**
   * Start fire detection on a camera
   */
  
  async startDetection(cameraId, settings = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({
          camera_id: cameraId,
          sensitivity: settings.sensitivity || 60,
          min_confidence: settings.minConfidence || 70,
          alert_sound: settings.alertSound !== false,
          email_alert: settings.emailAlert || false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Start detection error:', error);
      throw error;
    }
  }

  /**
   * Stop fire detection on a camera
   */
  async stopDetection(cameraId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/stop/${cameraId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Stop detection error:', error);
      throw error;
    }
  }

  /**
   * Get fire alerts with optional filters
   */
  async getAlerts(filters = {}) {
    try {
      console.log('Fetching fire alerts with filters:', filters);
      const params = new URLSearchParams();
      
      if (filters.camera_id) params.append('camera_id', filters.camera_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);
      if (filters.limit) params.append('limit', filters.limit);
    
      const response = await fetch(`${API_BASE_URL}/fire-detection?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });
      console.log("Get Alerts Response---",response);

      if (!response.ok) {
        // Return empty data for 404 instead of throwing
        if (response.status === 404) {
          console.warn('Fire detetction endpoint not found (404). This endpoint may not be implemented yet.');
          return { success: true, data: [] };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // If it's a network error or endpoint doesn't exist, return empty data
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        console.warn('Fire alerts endpoint not accessible:', error.message);
        return { success: true, data: [] };
      }
      console.error('Get alerts error:', error);
      throw error;
    }
  }

  /**
   * Get statistics for fire detection
   */
  async getStats(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.from_date) params.append('from_date', filters.from_date);
      if (filters.to_date) params.append('to_date', filters.to_date);

      const response = await fetch(`${API_BASE_URL}/fire-detection/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        // Return default stats for 404
        if (response.status === 404) {
          console.warn('Fire detection stats endpoint not found (404).');
          return {
            success: true,
            data: {
              total_alerts: 0,
              active_alerts: 0,
              false_positives: 0,
              avg_confidence: 0
            }
          };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        console.warn('Fire detection stats endpoint not accessible.');
        return {
          success: true,
          data: {
            total_alerts: 0,
            active_alerts: 0,
            false_positives: 0,
            avg_confidence: 0
          }
        };
      }
      console.error('Get stats error:', error);
      throw error;
    }
  }

  /**
   * Get hourly analytics for charts
   */
  async getHourlyAnalytics(date = null) {
    try {
      const params = new URLSearchParams();
      if (date) params.append('date', date);

      const response = await fetch(`${API_BASE_URL}/fire-detection/analytics/hourly?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        // Return empty data for 404
        if (response.status === 404) {
          console.warn('Analytics endpoint not found (404).');
          return { success: false, data: [] };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        console.warn('Analytics endpoint not accessible.');
        return { success: false, data: [] };
      }
      console.error('Get analytics error:', error);
      throw error;
    }
  }

  /**
   * Resolve a fire alert
   */
  async resolveAlert(alertId, notes = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/${alertId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ notes })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Resolve alert error:', error);
      throw error;
    }
  }

  /**
   * Mark alert as false positive
   */
  async markFalsePositive(alertId, reason = '') {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/${alertId}/false-positive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Mark false positive error:', error);
      throw error;
    }
  }

  /**
   * Get alert details including snapshot image
   */
  async getAlertDetails(alertId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/${alertId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get alert details error:', error);
      throw error;
    }
  }

  /**
   * Download alert snapshot image
   */
  async downloadSnapshot(alertId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/${alertId}/snapshot`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fire_alert_${alertId}_${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Download snapshot error:', error);
      throw error;
    }
  }

  /**
   * Update detection settings
   */
  async updateSettings(cameraId, settings) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/${cameraId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Update settings error:', error);
      throw error;
    }
  }

  /**
   * Get detection status for a camera
   */
  async getDetectionStatus(cameraId) {
    try {
      const response = await fetch(`${API_BASE_URL}/fire-detection/status/${cameraId}`, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });

      if (!response.ok) {
        // Return inactive status for 404
        if (response.status === 404) {
          console.warn('Detection status endpoint not found (404).');
          return { success: true, is_active: false, camera_id: cameraId };
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
        console.warn('Detection status endpoint not accessible.');
        return { success: true, is_active: false, camera_id: cameraId };
      }
      console.error('Get status error:', error);
      throw error;
    }
  }

  /**
   * Test detection on uploaded image
   */
  async testImage(file) {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE_URL}/fire-detection/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Test image error:', error);
      throw error;
    }
  }


 async getCameras_smoke(filters = {}) {
  try {
    const { user_id, ...rest } = filters;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    const params = new URLSearchParams();

    if (rest.page) params.append('page', rest.page);
    if (rest.limit) params.append('limit', rest.limit);
    if (rest.is_active !== undefined) params.append('is_active', rest.is_active);
    if (rest.connection_status) params.append('connection_status', rest.connection_status);
    if (rest.tenant_id) params.append('tenant_id', rest.tenant_id);

    console.log("need to write whole api ",API_BASE_URL,user_id,params.toString());

    const response = await fetch(`${API_BASE_URL}/cameras/user/${user_id}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    console.error('Get user cameras error:', error);
    throw error;
  }
}


  /**
   * Get authentication token
   */
  getToken() {
    // Adjust based on your auth implementation
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || '';
  }


  

  /**
   * Build image URL
   */
  getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL.replace('/api', '')}${path}`;
  }
}

export default new FireDetectionService();