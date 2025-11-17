import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Mail, AlertTriangle, Loader2, AlertCircle } from 'lucide-react';
import cameraService from '../services/cameraService';
import alertService from '../services/alertService';
import alertThresholdService from '../services/alertThresholdService';

function AlertThresholdPage() {
  const [thresholds, setThresholds] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const userId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
  
  const [newThreshold, setNewThreshold] = useState({
    camera_id: '',
    max_occupancy: '',
    notification_email: '',
  });

  // Fetch cameras
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const user_id = userId;
        const response = await cameraService.getCamerasByuserId(user_id, {
        page: 1,
        limit: 100,
        is_active: true,       
      });
        if (response?.data?.cameras) {
          setCameras(response.data.cameras);
        } else if (response?.data?.rows) {
          setCameras(response.data.rows);
        }
      } catch (err) {
        console.error('Error fetching cameras:', err);
      }
    };
    
    fetchCameras();
  }, []);

  // Fetch alert thresholds and recent alerts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch thresholds
      const thresholdsResponse = await alertThresholdService.getThresholds({ limit: 100 });
      if (thresholdsResponse?.data?.rows) {
        setThresholds(thresholdsResponse.data.rows);
      } else if (thresholdsResponse?.data) {
        setThresholds(Array.isArray(thresholdsResponse.data) ? thresholdsResponse.data : []);
      }

      // Fetch recent alerts
      const alertsResponse = await alertService.getAlerts({ limit: 10, page: 1 });
      if (alertsResponse?.data?.rows) {
        setRecentAlerts(alertsResponse.data.rows);
      } else if (alertsResponse?.data) {
        setRecentAlerts(Array.isArray(alertsResponse.data) ? alertsResponse.data : []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err || 'Failed to load alert data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddThreshold = async () => {
    if (!newThreshold.camera_id || !newThreshold.max_occupancy) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get selected camera to extract tenant_id and branch_id
      const selectedCamera = cameras.find(c => c.camera_id === parseInt(newThreshold.camera_id));
      
      if (!selectedCamera) {
        alert('Selected camera not found');
        return;
      }

      const thresholdData = {
        camera_id: parseInt(newThreshold.camera_id),
        max_occupancy: parseInt(newThreshold.max_occupancy),
        notification_email: newThreshold.notification_email || null,
        tenant_id: selectedCamera.tenant_id,
       // branch_id: selectedCamera.branch_id,
      };

      await alertThresholdService.createThreshold(thresholdData);
      
      // Refresh data
      await fetchData();
      
      // Reset form
      setNewThreshold({ camera_id: '', max_occupancy: '', notification_email: '' });
      
      alert('Alert threshold created successfully!');
    } catch (err) {
      console.error('Error creating threshold:', err);
      alert(err || 'Failed to create alert threshold');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThreshold = async (id) => {
    if (!confirm('Are you sure you want to delete this alert threshold?')) {
      return;
    }

    try {
      await alertThresholdService.deleteThreshold(id);
      await fetchData();
      alert('Alert threshold deleted successfully!');
    } catch (err) {
      console.error('Error deleting threshold:', err);
      alert(err || 'Failed to delete alert threshold');
    }
  };

  const handleToggleThreshold = async (id, currentStatus) => {
    try {
      await alertThresholdService.toggleThresholdStatus(id, !currentStatus);
      await fetchData();
    } catch (err) {
      console.error('Error toggling threshold:', err);
      alert(err || 'Failed to update threshold status');
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await alertService.resolveAlert(id);
      await fetchData();
      alert('Alert resolved successfully!');
    } catch (err) {
      console.error('Error resolving alert:', err);
      alert(err || 'Failed to resolve alert');
    }
  };

  const getCameraName = (cameraId) => {
    const camera = cameras.find(c => c.camera_id === cameraId);
    return camera ? camera.camera_name : `Camera ${cameraId}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Alert Settings</h1>
        <p className="text-gray-600">Configure occupancy thresholds and notifications</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Data</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alert Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add New Alert */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Add New Alert Threshold
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Camera *
                </label>
                <select
                  value={newThreshold.camera_id}
                  onChange={(e) => setNewThreshold({ ...newThreshold, camera_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                >
                  <option value="">Select Camera</option>
                  {cameras.map(camera => (
                    <option key={camera.camera_id} value={camera.camera_id}>
                      {camera.camera_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Occupancy *
                </label>
                <input
                  type="number"
                  value={newThreshold.max_occupancy}
                  onChange={(e) => setNewThreshold({ ...newThreshold, max_occupancy: e.target.value })}
                  placeholder="e.g., 50"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={submitting}
                  min="1"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleAddThreshold}
                  disabled={submitting}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Alert
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Emails
              </label>
              <input
                type="text"
                value={newThreshold.notification_email}
                onChange={(e) => setNewThreshold({ ...newThreshold, notification_email: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={submitting}
              />
              <p className="text-sm text-gray-500 mt-1">Comma-separated email addresses</p>
            </div>
          </div>

          {/* Active Alerts */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Thresholds</h3>
            
            {thresholds.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No alert thresholds configured yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {thresholds.map((threshold) => (
                  <div key={threshold.threshold_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">
                            {getCameraName(threshold.camera_id)}
                          </h4>
                          <button
                            onClick={() => handleToggleThreshold(threshold.threshold_id, threshold.is_active)}
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              threshold.is_active 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {threshold.is_active ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Max Occupancy: <span className="font-medium text-gray-900">{threshold.max_occupancy}</span></p>
                          {threshold.notification_email && (
                            <p className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {threshold.notification_email}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Created: {new Date(threshold.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteThreshold(threshold.threshold_id)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Alert History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
            
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.alert_id} className={`p-4 rounded-lg border ${
                    alert.status === 'resolved'
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                        alert.status === 'resolved' ? 'text-gray-400' : 'text-red-600'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm">
                          {getCameraName(alert.camera_id)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Occupancy exceeded: {alert.current_occupancy}/{alert.max_occupancy}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.alert_time).toLocaleString()}
                        </p>
                        {alert.resolved_at && (
                          <p className="text-xs text-gray-500">
                            Resolved: {new Date(alert.resolved_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        alert.status === 'resolved'
                          ? 'bg-gray-200 text-gray-700' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {alert.status === 'resolved' ? 'Resolved' : 'Active'}
                      </span>
                      {alert.status === 'triggered' && (
                        <button
                          onClick={() => handleResolveAlert(alert.alert_id)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              How Alerts Work
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Alerts trigger when occupancy exceeds threshold</li>
              <li>• Email notifications sent immediately</li>
              <li>• Auto-resolves when occupancy drops</li>
              <li>• View alert history in logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlertThresholdPage;