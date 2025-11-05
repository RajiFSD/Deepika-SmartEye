import { useState } from 'react';
import { TrendingUp, PieChart, BarChart3, Calendar, Download, Package, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

function ProductAnalyticsPage() {
  const [dateRange, setDateRange] = useState('7days');
  
  const stats = {
    totalDetections: 1247,
    avgConfidence: 94.2,
    expiringProducts: 18,
    topCategory: 'Beverages'
  };

  const detectionTrends = [
    { date: '2024-10-28', count: 156 },
    { date: '2024-10-29', count: 178 },
    { date: '2024-10-30', count: 165 },
    { date: '2024-10-31', count: 189 },
    { date: '2024-11-01', count: 201 },
    { date: '2024-11-02', count: 195 },
    { date: '2024-11-03', count: 163 }
  ];

  const categoryDistribution = [
    { category: 'Beverages', count: 342, percentage: 27.4 },
    { category: 'Snacks', count: 298, percentage: 23.9 },
    { category: 'Confectionery', count: 245, percentage: 19.6 },
    { category: 'Dairy', count: 187, percentage: 15.0 },
    { category: 'Bakery', count: 123, percentage: 9.9 },
    { category: 'Other', count: 52, percentage: 4.2 }
  ];

  const cameraPerformance = [
    { camera: 'Camera 1 - Entrance', detections: 423, accuracy: 96.5, uptime: 99.8 },
    { camera: 'Camera 2 - Aisle 1', detections: 387, accuracy: 94.8, uptime: 98.5 },
    { camera: 'Camera 3 - Checkout', detections: 298, accuracy: 95.2, uptime: 99.2 },
    { camera: 'Camera 4 - Storage', detections: 139, accuracy: 92.1, uptime: 97.8 }
  ];

  const expiryAlerts = [
    { product: 'Milk 1L', sku: 'PRD-1006', expiryDate: '2024-11-10', daysLeft: 6, quantity: 15 },
    { product: 'Bread Loaf', sku: 'PRD-1008', expiryDate: '2024-11-08', daysLeft: 4, quantity: 8 },
    { product: 'Pringles Original', sku: 'PRD-1005', expiryDate: '2024-11-15', daysLeft: 11, quantity: 12 },
    { product: 'Yogurt 500g', sku: 'PRD-1009', expiryDate: '2024-11-12', daysLeft: 8, quantity: 20 },
    { product: 'Fresh Juice', sku: 'PRD-1010', expiryDate: '2024-11-09', daysLeft: 5, quantity: 6 }
  ];

  const topProducts = [
    { name: 'Coca Cola 330ml', detections: 156, trend: '+12%' },
    { name: 'Lays Chips 50g', detections: 142, trend: '+8%' },
    { name: 'Pepsi 500ml', detections: 128, trend: '+15%' },
    { name: 'Nestle KitKat', detections: 119, trend: '+5%' },
    { name: 'Pringles Original', detections: 98, trend: '-3%' }
  ];

  const handleExport = () => {
    alert('Exporting analytics report...');
  };

  const getCategoryColor = (index) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-gray-500'
    ];
    return colors[index % colors.length];
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Analytics</h1>
          <p className="text-gray-600">Comprehensive insights and trends analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Detections</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalDetections.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">↑ 18% from last period</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Avg Confidence</p>
          <p className="text-2xl font-bold text-gray-900">{stats.avgConfidence}%</p>
          <p className="text-xs text-green-600 mt-2">↑ 2.1% improved</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
          <p className="text-2xl font-bold text-gray-900">{stats.expiringProducts}</p>
          <p className="text-xs text-red-600 mt-2">Requires attention</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Top Category</p>
          <p className="text-2xl font-bold text-gray-900">{stats.topCategory}</p>
          <p className="text-xs text-gray-500 mt-2">27.4% of total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Detection Trends */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Detection Trends</h3>
              <p className="text-sm text-gray-600">Daily detection volume</p>
            </div>
          </div>
          <div className="space-y-2">
            {detectionTrends.map((trend, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">
                  {new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2" 
                    style={{ width: `${(trend.count / 210) * 100}%` }}
                  >
                    <span className="text-xs text-white font-medium">{trend.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Category Distribution</h3>
              <p className="text-sm text-gray-600">Products by category</p>
            </div>
          </div>
          <div className="space-y-3">
            {categoryDistribution.map((cat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{cat.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{cat.count}</span>
                    <span className="text-xs text-gray-500">({cat.percentage}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${getCategoryColor(index)} h-2 rounded-full`}
                    style={{ width: `${cat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Camera Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Camera Performance</h3>
            <p className="text-sm text-gray-600">Detection stats by camera</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camera</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detections</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accuracy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cameraPerformance.map((cam, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{cam.camera}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{cam.detections}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{cam.accuracy}%</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{cam.uptime}%</td>
                  <td className="px-4 py-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${cam.uptime}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiry Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Expiry Alerts</h3>
              <p className="text-sm text-gray-600">Products expiring soon</p>
            </div>
          </div>
          <div className="space-y-3">
            {expiryAlerts.map((alert, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert.product}</p>
                    <p className="text-xs text-gray-500 font-mono">{alert.sku}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    alert.daysLeft <= 5 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {alert.daysLeft} days left
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(alert.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <span>{alert.quantity} units</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Top Products</h3>
              <p className="text-sm text-gray-600">Most detected products</p>
            </div>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.detections} detections</p>
                </div>
                <span className={`text-xs font-medium ${
                  product.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {product.trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductAnalyticsPage;