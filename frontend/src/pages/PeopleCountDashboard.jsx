import { useState, useEffect } from 'react';
import { Users, ArrowUpCircle, ArrowDownCircle, Activity, Camera, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import cameraService from '../services/cameraService';
import peopleCountService from '../services/peopleCountService';

function PeopleCountDashboard() {
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalExits: 0,
    currentOccupancy: 0,
    activeCameras: 0,
  });

  const [chartData, setChartData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analyticsWarning, setAnalyticsWarning] = useState(false);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);

      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const tenantId = user?.tenant_id || user?.tenant?.tenant_id;
      const today = new Date().toISOString().split('T')[0];

      const [camerasResult, recentLogsResult, allLogsResult, analyticsResult] = await Promise.allSettled([
        cameraService.getCameras({ tenant_id: tenantId }),
        peopleCountService.getPeopleCountLogs({ 
          tenant_id: tenantId,
          limit: 10,
          sort: 'detection_time',
          order: 'DESC'
        }),
        // Fetch ALL logs for today to calculate accurate totals if analytics fails
        peopleCountService.getPeopleCountLogs({ 
          tenant_id: tenantId,
          limit: 1000,
          date: today,
          sort: 'detection_time',
          order: 'ASC'
        }),
        peopleCountService.getHourlyAnalytics({ 
          tenant_id: tenantId,
          date: today
        })
      ]);

      const camerasResponse = camerasResult.status === 'fulfilled' ? camerasResult.value : null;
      const recentLogsResponse = recentLogsResult.status === 'fulfilled' ? recentLogsResult.value : null;
      const allLogsResponse = allLogsResult.status === 'fulfilled' ? allLogsResult.value : null;
      const analyticsResponse = analyticsResult.status === 'fulfilled' ? analyticsResult.value : null;

      console.log('ðŸ“¦ Full analyticsResponse:', analyticsResponse);

      // Extract cameras
      const camerasData = camerasResponse?.data?.data?.cameras || camerasResponse?.data?.cameras || camerasResponse?.data || [];
      const activeCameras = Array.isArray(camerasData) 
        ? camerasData.filter(cam => cam.is_active).length 
        : 0;

      // Extract recent logs (for display only)
      const recentLogsData = recentLogsResponse?.data?.data?.rows || recentLogsResponse?.data?.rows || recentLogsResponse?.data?.logs || recentLogsResponse?.data || [];
      
      // Extract all logs (for fallback calculations)
      const allLogsData = allLogsResponse?.data?.data?.rows || allLogsResponse?.data?.rows || allLogsResponse?.data?.logs || allLogsResponse?.data || [];
      
      console.log('ðŸ“‹ Recent logs:', recentLogsData.length, 'All logs:', allLogsData.length);

        // Extract analytics
const analyticsData = analyticsResponse?.data || [];

// Format analytics data
const formattedChartData = Array.isArray(analyticsData) ? analyticsData.map(item => ({
  time: item.hour || item.time || '00:00',
  entries: item.entries || item.entry_count || 0,
  exits: item.exits || item.exit_count || 0,
})) : [];

console.log('ðŸ“Š Formatted Chart Data (first 3):', formattedChartData.slice(0, 3));

// Check if analytics has actual data (not all zeros)
const analyticsHasData = formattedChartData.some(hour => hour.entries > 0 || hour.exits > 0);

console.log('ðŸ“Š Analytics Has Data?', analyticsHasData);
console.log('ðŸ“Š Total Entries in Analytics:', formattedChartData.reduce((sum, hour) => sum + hour.entries, 0));
console.log('ðŸ“Š Total Exits in Analytics:', formattedChartData.reduce((sum, hour) => sum + hour.exits, 0));
      
      let totalEntries = 0;
      let totalExits = 0;
      let finalChartData = [];

      if (formattedChartData.length > 0 && analyticsHasData) {
        // Use analytics data
        totalEntries = formattedChartData.reduce((sum, hour) => sum + hour.entries, 0);
        totalExits = formattedChartData.reduce((sum, hour) => sum + hour.exits, 0);
        finalChartData = formattedChartData;
        console.log('âœ… Using analytics - Entries:', totalEntries, 'Exits:', totalExits);
        setAnalyticsWarning(false);
      } else if (Array.isArray(allLogsData) && allLogsData.length > 0) {
        // Fallback: Calculate from all logs
        console.log('âš ï¸ Analytics unavailable or empty, using all logs');
        
        // Count totals
        allLogsData.forEach(log => {
          if (log.direction === 'IN') totalEntries++;
          else if (log.direction === 'OUT') totalExits++;
        });
        
        // Generate hourly chart data
        finalChartData = generateHourlyDataFromLogs(allLogsData);
        console.log('âœ… Calculated from logs - Entries:', totalEntries, 'Exits:', totalExits);
        setAnalyticsWarning(true);
      }

      // Format recent logs for display
      const formattedLogs = Array.isArray(recentLogsData) ? recentLogsData.slice(0, 10).map((log, index) => ({
        id: log.log_id || index,
        camera: log.camera?.camera_name || 'Unknown Camera',
        direction: log.direction,
        time: new Date(log.detection_time).toLocaleTimeString(),
        confidence: parseFloat(log.confidence_score) || 0.95,
      })) : [];

      setChartData(finalChartData);
      setStats({
        totalEntries,
        totalExits,
        currentOccupancy: Math.max(0, totalEntries - totalExits),
        activeCameras,
      });
      setRecentLogs(formattedLogs);
      setLoading(false);
    } catch (err) {
      console.error('âŒ Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  const generateHourlyDataFromLogs = (logs) => {
    // Create 24-hour structure
    const hourlyMap = {};
    for (let h = 0; h < 24; h++) {
      const timeKey = `${h.toString().padStart(2, '0')}:00`;
      hourlyMap[timeKey] = { time: timeKey, entries: 0, exits: 0 };
    }

    // Populate with log data
    logs.forEach(log => {
      const hour = new Date(log.detection_time).getHours();
      const timeKey = `${hour.toString().padStart(2, '0')}:00`;

      if (log.direction === 'IN') {
        hourlyMap[timeKey].entries++;
      } else if (log.direction === 'OUT') {
        hourlyMap[timeKey].exits++;
      }
    });

    return Object.values(hourlyMap).sort((a, b) => {
      const hourA = parseInt(a.time.split(':')[0]);
      const hourB = parseInt(b.time.split(':')[0]);
      return hourA - hourB;
    });
  };

  const StatCard = ({ icon: Icon, title, value, color, trend }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Real-time people counting and analytics</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Activity className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {analyticsWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-yellow-800">Using Fallback Mode</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Analytics service returned empty data. Stats calculated from activity logs instead.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ArrowUpCircle}
          title="Total Entries"
          value={stats.totalEntries}
          color="bg-green-600"
        />
        <StatCard
          icon={ArrowDownCircle}
          title="Total Exits"
          value={stats.totalExits}
          color="bg-red-600"
        />
        <StatCard
          icon={Users}
          title="Current Occupancy"
          value={stats.currentOccupancy}
          color="bg-blue-600"
        />
        <StatCard
          icon={Camera}
          title="Active Cameras"
          value={stats.activeCameras}
          color="bg-purple-600"
        />
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Traffic</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entries" stroke="#10b981" strokeWidth={2} name="Entries" />
                <Line type="monotone" dataKey="exits" stroke="#ef4444" strokeWidth={2} name="Exits" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Entry vs Exit Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entries" fill="#10b981" name="Entries" />
                <Bar dataKey="exits" fill="#ef4444" name="Exits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Detections</h3>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500 animate-pulse" />
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {recentLogs.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camera</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.camera}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.direction === 'IN' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.direction === 'IN' ? <ArrowUpCircle className="w-3 h-3 mr-1" /> : <ArrowDownCircle className="w-3 h-3 mr-1" />}
                        {log.direction}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(log.confidence * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No recent detections available</p>
              <p className="text-sm mt-1">Detections will appear here in real-time</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PeopleCountDashboard;