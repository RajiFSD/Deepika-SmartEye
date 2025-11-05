import { useState, useEffect } from 'react';
import { Package, TrendingUp, Camera, AlertCircle, Calendar, QrCode, Clock } from 'lucide-react';

function ProductOverviewPage() {
  const [stats, setStats] = useState({
    totalProducts: 248,
    expiringProducts: 18,
    activeCamera: 12,
    detectionAccuracy: 94.2
  });

  const [recentDetections, setRecentDetections] = useState([
    {
      id: 1,
      productName: 'Coca Cola 330ml',
      expiryDate: '2025-12-15',
      qrCode: 'QR-001-2024',
      camera: 'Camera 1',
      timestamp: '2024-11-04 10:30:45',
      confidence: 96.5
    },
    {
      id: 2,
      productName: 'Lays Chips 50g',
      expiryDate: '2025-11-20',
      qrCode: 'QR-002-2024',
      camera: 'Camera 2',
      timestamp: '2024-11-04 10:28:12',
      confidence: 94.8
    },
    {
      id: 3,
      productName: 'Nestle KitKat',
      expiryDate: '2025-06-10',
      qrCode: 'QR-003-2024',
      camera: 'Camera 3',
      timestamp: '2024-11-04 10:25:33',
      confidence: 98.2
    },
    {
      id: 4,
      productName: 'Pepsi 500ml',
      expiryDate: '2025-01-05',
      qrCode: 'QR-004-2024',
      camera: 'Camera 1',
      timestamp: '2024-11-04 10:22:18',
      confidence: 95.7
    },
    {
      id: 5,
      productName: 'Pringles Original',
      expiryDate: '2024-11-15',
      qrCode: 'QR-005-2024',
      camera: 'Camera 4',
      timestamp: '2024-11-04 10:20:05',
      confidence: 93.4
    }
  ]);

  const isExpiringSoon = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    return expiry < today;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Detection Overview</h1>
        <p className="text-gray-600">Monitor product detection and recognition across all cameras</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Products</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          <p className="text-xs text-green-600 mt-2">↑ 12% from last month</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Detection Accuracy</p>
          <p className="text-2xl font-bold text-gray-900">{stats.detectionAccuracy}%</p>
          <p className="text-xs text-green-600 mt-2">↑ 2.1% improved</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Cameras</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeCamera}</p>
          <p className="text-xs text-gray-500 mt-2">All operational</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Expiring Soon</p>
          <p className="text-2xl font-bold text-gray-900">{stats.expiringProducts}</p>
          <p className="text-xs text-red-600 mt-2">Requires attention</p>
        </div>
      </div>

      {/* Recent Detections */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Detections</h2>
          <p className="text-sm text-gray-600">Latest product detection events</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  QR Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detection Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentDetections.map((detection) => (
                <tr key={detection.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {detection.productName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 font-mono">
                        {detection.qrCode}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatDate(detection.expiryDate)}
                        </div>
                        {isExpired(detection.expiryDate) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        )}
                        {isExpiringSoon(detection.expiryDate) && !isExpired(detection.expiryDate) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-800">
                            Expiring Soon
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{detection.camera}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{detection.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-2" style={{ width: '60px' }}>
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${detection.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {detection.confidence}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ProductOverviewPage;