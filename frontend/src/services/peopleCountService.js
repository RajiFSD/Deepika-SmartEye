import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const peopleCountService = {
  // Get all people count logs with pagination and filters
  getPeopleCountLogs: async (params = {}) => {
    try {
      const response = await api.get('/people-count', { params });
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching people count logs:', error);
      throw error.response?.data?.message || 'Failed to fetch people count logs';
    }
  },

  // Get people count log by ID
  getPeopleCountLogById: async (id) => {
    try {    
      const response = await api.get(`/people-count/${id}`);
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching people count log:', error);
      throw error.response?.data?.message || 'Failed to fetch people count log';
    }
  },

  // Create new people count log
  createPeopleCountLog: async (logData) => {
    try {  
      const response = await api.post('/people-count', logData); 
      return response.data;
    } catch (error) {
      console.error('âŒ Error creating people count log:', error);
      throw error.response?.data?.message || 'Failed to create people count log';
    }
  },

  // Get logs by camera
  getLogsByCamera: async (cameraId, params = {}) => {
    try {   
      const response = await api.get(`/people-count/camera/${cameraId}`, { params });      
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching camera logs:', error);
      throw error.response?.data?.message || 'Failed to fetch camera logs';
    }
  },

  // Get logs by tenant
  getLogsByTenant: async (tenantId, params = {}) => {
    try {     
      const response = await api.get(`/people-count/tenant/${tenantId}`, { params });
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching tenant logs:', error);
      throw error.response?.data?.message || 'Failed to fetch tenant logs';
    }
  },

  // Get logs by branch
  getLogsByBranch: async (branchId, params = {}) => {
    try {  
      const response = await api.get(`/people-count/branch/${branchId}`, { params });
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching branch logs:', error);
      throw error.response?.data?.message || 'Failed to fetch branch logs';
    }
  },

  // Get hourly analytics
  getHourlyAnalytics: async (params = {}) => {
    try {     
      const response = await api.get('/people-count/analytics/hourly', { params });   
      return response.data;
    } catch (error) {
      console.error('âŒ Error fetching hourly analytics:', error);
      throw error.response?.data?.message || 'Failed to fetch hourly analytics';
    }
  },

  // Get daily analytics
  getDailyAnalytics: async (params = {}) => {
    try {
       const response = await api.get('/people-count/analytics/daily', { params });
       return response.data;
    } catch (error) {
      console.error('âŒ Error fetching daily analytics:', error);
      throw error.response?.data?.message || 'Failed to fetch daily analytics';
    }
  },

  // Export logs to CSV
  exportLogsToCSV: async (logs) => {
    try {
      console.log('ðŸ”µ Exporting logs to CSV');
      
      // Create CSV header
      const headers = [
        'Log ID',
        'Person ID',
        'Camera',
        'Direction',
        'Date & Time',
        'Confidence',
        'Frame Number',
        'Branch',
        'Tenant'
      ];

      // Create CSV rows
      const rows = logs.map(log => [
        log.log_id || log.id,
        log.person_id || log.personId || 'N/A',
        log.camera?.camera_name || log.camera || 'Unknown',
        log.direction,
        new Date(log.detection_time || log.timestamp).toLocaleString(),
        log.confidence_score || log.confidence || 'N/A',
        log.frame_number || log.frameNumber || 'N/A',
        log.branch?.branch_name || log.branch || 'N/A',
        log.tenant?.tenant_name || log.tenant || 'N/A'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `people-count-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('âœ… CSV exported successfully');
      return true;
    } catch (error) {
      console.error('âŒ Error exporting CSV:', error);
      throw 'Failed to export CSV';
    }
  },

   startVideoUpload: async ({ videoFile, tenantId, branchId, userId, direction }) => {
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      formData.append('tenant_id', tenantId);
      formData.append('branch_id', branchId);
      formData.append('user_id', userId);

      // Must match what backend expects
      if (direction) {
        formData.append('Direction', direction);
      }

      const response = await fetch(
        `${API_BASE_URL}/upload-analysis/people-count/video`,
        {
          method: 'POST',
          body: formData
          // ⚠️ No headers: let browser set multipart Content-Type
        }
      );

      const rawText = await response.text();
      let data;

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        // Not JSON – fallback to generic error
        if (!response.ok) {
          throw new Error(rawText || 'Video processing failed');
        }
        data = {};
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Video processing failed');
      }

      return data;
    } catch (error) {
      console.error('❌ Error uploading people count video:', error);
      throw error.message || 'Failed to upload people count video';
    }
  },

  // Start Python live people counting
startLivePeopleCounting: async ({
  stream_url,
  direction,
  streamId,
  camera_id,
  tenant_id,
  branch_id
}) => {
  try {
    const payload = {
      stream_url,
      direction,
      streamId,
      camera_id: camera_id || null,
      tenant_id,
      branch_id
    };

    console.log("📦 Sending live people-count start payload:", payload);

    const res = await fetch(
      `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/people-count/live/start`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const data = await res.json();
    console.log("📊 Live people-count start response:", data);

    return { ok: res.ok, ...data };
  } catch (err) {
    console.error("❌ Error starting live people counting:", err);
    return { ok: false, success: false, message: err.message };
  }
}



};

export default peopleCountService;