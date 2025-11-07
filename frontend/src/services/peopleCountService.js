import api from './api';

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
  }
};

export default peopleCountService;