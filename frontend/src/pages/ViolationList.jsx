import { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Calendar, ArrowUpCircle, ArrowDownCircle, AlertCircle, Loader2 } from 'lucide-react';
import cameraService from '../services/cameraService';
import peopleCountService from '../services/peopleCountService';

function ViolationList() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState('ALL');
  const [filterCamera, setFilterCamera] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  // Fetch cameras for filter dropdown
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await cameraService.getCameras({ limit: 100 });
        
        // Handle both response structures: data.cameras or data.rows
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

  // Fetch people count logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const params = {
          page: pagination.page,
          limit: pagination.limit
        };
        
        if (filterDirection !== 'ALL') {
          params.direction = filterDirection;
        }
        
        const response = await peopleCountService.getPeopleCountLogs(params);
        
        if (response?.data) {
          const { rows, count } = response.data;
          
          // Transform API data to match component structure
          const transformedLogs = rows.map(log => ({
            id: log.log_id,
            personId: log.person_id || 'N/A',
            camera: log.camera?.camera_name || `Camera ${log.camera_id}`,
            cameraId: log.camera_id,
            direction: log.direction,
            timestamp: new Date(log.detection_time),
            confidence: parseFloat(log.confidence_score) || 0,
            frameNumber: log.frame_number,
            imageUrl: log.image_path || log.thumbnail_path || `https://via.placeholder.com/400x300/3b82f6/ffffff?text=Detection+${log.log_id}`,
            branch: log.branch?.branch_name || 'N/A',
            tenant: log.tenant?.tenant_name || 'N/A',
            zone: log.zone?.zone_name,
            metadata: log.metadata
          }));
          
          setLogs(transformedLogs);
          setPagination(prev => ({ ...prev, total: count }));
        }
      } catch (err) {
        console.error('Error fetching logs:', err);
        setError(err || 'Failed to fetch detection logs');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLogs();
  }, [pagination.page, pagination.limit, filterDirection]);

  // Client-side filtering for search and camera
  useEffect(() => {
    let filtered = logs;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.personId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.camera?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply camera filter
    if (filterCamera !== 'ALL') {
      filtered = filtered.filter(log => log.cameraId === parseInt(filterCamera));
    }

    setFilteredLogs(filtered);
  }, [searchTerm, filterCamera, logs]);

  const handleExport = async () => {
    try {
      // Fetch all logs for export (no pagination)
      const params = {
        limit: 10000
      };
      
      if (filterDirection !== 'ALL') {
        params.direction = filterDirection;
      }
      
      const response = await peopleCountService.getPeopleCountLogs(params);
      
      if (response?.data?.rows) {
        await peopleCountService.exportLogsToCSV(response.data.rows);
      }
    } catch (err) {
      console.error('Error exporting logs:', err);
      alert('Failed to export logs. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Detection Logs</h1>
          <p className="text-gray-600">View all people counting detections</p>
        </div>
        <button
          onClick={handleExport}
          disabled={loading || filteredLogs.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Logs</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Person ID or Camera..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Direction Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Direction
            </label>
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Directions</option>
              <option value="IN">Entry (IN)</option>
              <option value="OUT">Exit (OUT)</option>
            </select>
          </div>

          {/* Camera Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera
            </label>
            <select
              value={filterCamera}
              onChange={(e) => setFilterCamera(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Cameras</option>
              {cameras.map(camera => (
                <option key={camera.camera_id} value={camera.camera_id}>
                  {camera.camera_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>Showing {filteredLogs.length} of {logs.length} records</span>
          {pagination.total > 0 && (
            <span className="text-gray-400">• Total in database: {pagination.total}</span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow-md p-12 flex flex-col items-center justify-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading detection logs...</p>
        </div>
      )}

      {/* Logs Table */}
      {!loading && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camera</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">{log.personId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.camera}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.direction === 'IN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.direction === 'IN' ? (
                          <ArrowUpCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownCircle className="w-3 h-3 mr-1" />
                        )}
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {log.timestamp.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${log.confidence * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{(log.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-12 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No logs found matching your filters</p>
            </div>
          )}
        </div>
      )}

      {/* Modal for viewing log details */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Detection Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <img 
                src={selectedLog.imageUrl} 
                alt="Detection" 
                className="w-full rounded-lg mb-4"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=No+Image';
                }}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Person ID</p>
                  <p className="font-mono font-medium">{selectedLog.personId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Camera</p>
                  <p className="font-medium">{selectedLog.camera}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Direction</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedLog.direction === 'IN' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedLog.direction}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="font-medium">{(selectedLog.confidence * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium">{selectedLog.timestamp.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Frame Number</p>
                  <p className="font-medium">{selectedLog.frameNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Branch</p>
                  <p className="font-medium">{selectedLog.branch}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tenant</p>
                  <p className="font-medium">{selectedLog.tenant}</p>
                </div>
                {selectedLog.zone && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Zone</p>
                    <p className="font-medium">{selectedLog.zone}</p>
                  </div>
                )}
                {selectedLog.metadata && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Metadata</p>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViolationList;