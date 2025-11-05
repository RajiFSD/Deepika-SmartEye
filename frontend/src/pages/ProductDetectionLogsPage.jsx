import { useState } from 'react';
import { Camera, Filter, Download, Calendar, QrCode, Package, Clock, Search, Eye } from 'lucide-react';

function ProductDetectionLogsPage() {
  const [filterCamera, setFilterCamera] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const [detectionLogs, setDetectionLogs] = useState([
    {
      id: 1,
      productName: 'Coca Cola 330ml',
      sku: 'PRD-1001',
      qrCode: 'QR-001-2024',
      expiryDate: '2025-12-15',
      camera: 'Camera 1 - Entrance',
      location: 'Shelf A-12',
      timestamp: '2024-11-04 10:30:45',
      confidence: 96.5,
      status: 'Verified',
      imageUrl: null
    },
    {
      id: 2,
      productName: 'Lays Chips 50g',
      sku: 'PRD-1002',
      qrCode: 'QR-002-2024',
      expiryDate: '2025-11-20',
      camera: 'Camera 2 - Aisle 1',
      location: 'Shelf B-05',
      timestamp: '2024-11-04 10:28:12',
      confidence: 94.8,
      status: 'Verified',
      imageUrl: null
    },
    {
      id: 3,
      productName: 'Nestle KitKat',
      sku: 'PRD-1003',
      qrCode: 'QR-003-2024',
      expiryDate: '2025-06-10',
      camera: 'Camera 3 - Checkout',
      location: 'Counter C-01',
      timestamp: '2024-11-04 10:25:33',
      confidence: 98.2,
      status: 'Verified',
      imageUrl: null
    },
    {
      id: 4,
      productName: 'Pepsi 500ml',
      sku: 'PRD-1004',
      qrCode: 'QR-004-2024',
      expiryDate: '2025-01-05',
      camera: 'Camera 1 - Entrance',
      location: 'Shelf A-14',
      timestamp: '2024-11-04 10:22:18',
      confidence: 95.7,
      status: 'Verified',
      imageUrl: null
    },
    {
      id: 5,
      productName: 'Pringles Original',
      sku: 'PRD-1005',
      qrCode: 'QR-005-2024',
      expiryDate: '2024-11-15',
      camera: 'Camera 4 - Storage',
      location: 'Shelf D-08',
      timestamp: '2024-11-04 10:20:05',
      confidence: 93.4,
      status: 'Pending',
      imageUrl: null
    },
    {
      id: 6,
      productName: 'Milk 1L',
      sku: 'PRD-1006',
      qrCode: 'QR-006-2024',
      expiryDate: '2024-11-10',
      camera: 'Camera 2 - Aisle 1',
      location: 'Shelf B-02',
      timestamp: '2024-11-04 10:18:42',
      confidence: 91.2,
      status: 'Flagged',
      imageUrl: null
    },
    {
      id: 7,
      productName: 'Orange Juice 1L',
      sku: 'PRD-1007',
      qrCode: 'QR-007-2024',
      expiryDate: '2024-12-25',
      camera: 'Camera 3 - Checkout',
      location: 'Shelf C-03',
      timestamp: '2024-11-04 10:15:20',
      confidence: 97.8,
      status: 'Verified',
      imageUrl: null
    },
    {
      id: 8,
      productName: 'Bread Loaf',
      sku: 'PRD-1008',
      qrCode: 'QR-008-2024',
      expiryDate: '2024-11-08',
      camera: 'Camera 1 - Entrance',
      location: 'Shelf A-01',
      timestamp: '2024-11-04 10:12:55',
      confidence: 89.5,
      status: 'Flagged',
      imageUrl: null
    }
  ]);

  const cameras = [
    'Camera 1 - Entrance',
    'Camera 2 - Aisle 1',
    'Camera 3 - Checkout',
    'Camera 4 - Storage'
  ];

  const filteredLogs = detectionLogs.filter(log => {
    const matchesSearch = log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.qrCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCamera = filterCamera === 'all' || log.camera === filterCamera;
    const matchesDate = !filterDate || log.timestamp.startsWith(filterDate);
    return matchesSearch && matchesCamera && matchesDate;
  });

  const handleExport = () => {
    alert('Exporting detection logs...');
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Flagged': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Detection Logs</h1>
        <p className="text-gray-600">View and analyze product detection events across all cameras</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by product, SKU, or QR code..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <Filter className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={filterCamera}
              onChange={(e) => setFilterCamera(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Cameras</option>
              {cameras.map((camera, index) => (
                <option key={index} value={camera}>{camera}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Total Detections</p>
          <p className="text-2xl font-bold text-gray-900">{filteredLogs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Verified</p>
          <p className="text-2xl font-bold text-green-600">
            {filteredLogs.filter(l => l.status === 'Verified').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {filteredLogs.filter(l => l.status === 'Pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-600 mb-1">Flagged</p>
          <p className="text-2xl font-bold text-red-600">
            {filteredLogs.filter(l => l.status === 'Flagged').length}
          </p>
        </div>
      </div>

      {/* Detection Logs Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  Camera/Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detection Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Confidence
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.productName}</div>
                        <div className="text-xs text-gray-500">SKU: {log.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900 font-mono">{log.qrCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {new Date(log.expiryDate).toLocaleDateString()}
                        </div>
                        {isExpired(log.expiryDate) && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800">
                            Expired
                          </span>
                        )}
                        {isExpiringSoon(log.expiryDate) && !isExpired(log.expiryDate) && (
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
                      <div>
                        <div className="text-sm text-gray-900">{log.camera}</div>
                        <div className="text-xs text-gray-500">{log.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            log.confidence >= 95 ? 'bg-green-600' : 
                            log.confidence >= 90 ? 'bg-yellow-600' : 
                            'bg-red-600'
                          }`}
                          style={{ width: `${log.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{log.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
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
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Detection Details</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Product Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedLog.productName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">SKU</label>
                  <p className="text-gray-900 font-mono">{selectedLog.sku}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">QR Code</label>
                  <p className="text-gray-900 font-mono">{selectedLog.qrCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expiry Date</label>
                  <p className="text-gray-900">{new Date(selectedLog.expiryDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Camera</label>
                  <p className="text-gray-900">{selectedLog.camera}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="text-gray-900">{selectedLog.location}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Detection Time</label>
                  <p className="text-gray-900">{selectedLog.timestamp}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Confidence Score</label>
                  <p className="text-gray-900">{selectedLog.confidence}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Detection snapshot would appear here</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Export Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetectionLogsPage;