import { useState, useEffect } from 'react';
import { Users, ArrowUpCircle, ArrowDownCircle, Activity, Camera, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function PeopleCountDashboard() {
  const [stats, setStats] = useState({
    totalEntries: 0,
    totalExits: 0,
    currentOccupancy: 0,
    activeCameras: 3,
  });

  const [chartData, setChartData] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);

  // Simulate real-time updates
  useEffect(() => {
    // Initialize with demo data
    setStats({
      totalEntries: 245,
      totalExits: 198,
      currentOccupancy: 47,
      activeCameras: 3,
    });

    // Generate hourly chart data
    const hours = [];
    for (let i = 8; i <= 20; i++) {
      hours.push({
        time: `${i}:00`,
        entries: Math.floor(Math.random() * 30) + 10,
        exits: Math.floor(Math.random() * 25) + 8,
      });
    }
    setChartData(hours);

    // Generate recent logs
    const logs = [];
    const directions = ['IN', 'OUT'];
    const cameras = ['Main Entrance', 'Side Door', 'Exit Gate'];
    
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 3600000);
      logs.push({
        id: i + 1,
        camera: cameras[Math.floor(Math.random() * cameras.length)],
        direction: directions[Math.floor(Math.random() * directions.length)],
        time: timestamp.toLocaleTimeString(),
        confidence: (Math.random() * 0.15 + 0.85).toFixed(2),
      });
    }
    setRecentLogs(logs);

    // Simulate real-time counter updates
    const interval = setInterval(() => {
      setStats(prev => {
        const entryChange = Math.random() > 0.5 ? 1 : 0;
        const exitChange = Math.random() > 0.6 ? 1 : 0;
        return {
          ...prev,
          totalEntries: prev.totalEntries + entryChange,
          totalExits: prev.totalExits + exitChange,
          currentOccupancy: Math.max(0, prev.currentOccupancy + entryChange - exitChange),
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Real-time people counting and analytics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ArrowUpCircle}
          title="Total Entries"
          value={stats.totalEntries}
          color="bg-green-600"
          trend="+12% from yesterday"
        />
        <StatCard
          icon={ArrowDownCircle}
          title="Total Exits"
          value={stats.totalExits}
          color="bg-red-600"
          trend="+8% from yesterday"
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
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

        {/* Bar Chart */}
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

      {/* Recent Activity */}
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
        </div>
      </div>
    </div>
  );
}

export default PeopleCountDashboard;