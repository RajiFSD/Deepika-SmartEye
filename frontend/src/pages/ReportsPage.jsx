import { useState } from 'react';
import { Download, Calendar, FileText, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ReportsPage() {
  const [reportType, setReportType] = useState('daily');
  const [selectedCamera, setSelectedCamera] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const cameras = ['All Cameras', 'Main Entrance', 'Side Door', 'Exit Gate'];

  // Demo data
  const dailyData = [
    { day: 'Monday', entries: 245, exits: 198 },
    { day: 'Tuesday', entries: 312, exits: 278 },
    { day: 'Wednesday', entries: 289, exits: 245 },
    { day: 'Thursday', entries: 334, exits: 289 },
    { day: 'Friday', entries: 401, exits: 367 },
    { day: 'Saturday', entries: 189, exits: 167 },
    { day: 'Sunday', entries: 145, exits: 134 },
  ];

  const cameraDistribution = [
    { name: 'Main Entrance', value: 456, color: '#3b82f6' },
    { name: 'Side Door', value: 289, color: '#10b981' },
    { name: 'Exit Gate', value: 178, color: '#f59e0b' },
  ];

  const hourlyData = Array.from({ length: 12 }, (_, i) => ({
    hour: `${i + 8}:00`,
    count: Math.floor(Math.random() * 50) + 20,
  }));

  const handleExport = (format) => {
    alert(`Exporting report as ${format.toUpperCase()}...`);
    // TODO: Implement actual export functionality
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
          <p className="text-gray-600">Generate and export people counting reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Summary</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Camera Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Camera
            </label>
            <select
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cameras.map(camera => (
                <option key={camera} value={camera.toLowerCase().replace(' ', '-')}>
                  {camera}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Export Buttons */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Entries</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">1,915</p>
          <p className="text-sm text-green-600 mt-1">+12.5% from last week</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Exits</p>
            <TrendingUp className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">1,678</p>
          <p className="text-sm text-green-600 mt-1">+8.3% from last week</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg Daily Traffic</p>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">274</p>
          <p className="text-sm text-gray-500 mt-1">Per day</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Peak Hour</p>
            <Calendar className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">2 PM</p>
          <p className="text-sm text-gray-500 mt-1">Busiest time</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Traffic Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Traffic Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="entries" fill="#10b981" name="Entries" />
              <Bar dataKey="exits" fill="#ef4444" name="Exits" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Camera Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic by Camera</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={cameraDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {cameraDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hourly Trend */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hourly Traffic Pattern</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" name="Total Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Detailed Daily Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camera</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entries</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Exits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Flow</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peak Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dailyData.map((day, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(Date.now() - (6 - index) * 86400000).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">All Cameras</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {day.entries}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {day.exits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    +{day.entries - day.exits}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">2:00 PM</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ReportsPage;