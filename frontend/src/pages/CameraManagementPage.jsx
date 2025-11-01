import { useState, useEffect } from 'react';
import { Camera, Plus, Edit2, Trash2, Video, Power, MapPin, Save, X } from 'lucide-react';
import cameraService from '../services/cameraService';
import branchService from '../services/branchService';
import authService from '../services/authService';

function CameraManagementPage() {
  const [cameras, setCameras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [formData, setFormData] = useState({
    camera_name: '',
    camera_code: '',
    branch_id: '',
    camera_type: 'RTSP',
    stream_url: '',
    location_description: '',
    fps: 25,
    resolution: '1920x1080',
    is_active: true,
  });

  const user = authService.getCurrentUser();

  // Load initial data
  useEffect(() => {
    loadCameras();
    loadBranches();
  }, [pagination.page]);

  const loadCameras = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await cameraService.getCameras({
        page: pagination.page,
        limit: pagination.limit,
      });
      
      console.log('📊 Camera response:', response);
      
      // ✅ Handle different response formats
      let camerasData = [];
      let count = 0;
      
      if (response.data) {
        // Format 1: { data: { cameras: [], pagination: {} } }
        if (response.data.cameras) {
          camerasData = response.data.cameras;
          count = response.data.pagination?.total || camerasData.length;
        }
        // Format 2: { data: { rows: [], count: number } }
        else if (response.data.rows) {
          camerasData = response.data.rows;
          count = response.data.count || 0;
        }
        // Format 3: { data: [] }
        else if (Array.isArray(response.data)) {
          camerasData = response.data;
          count = camerasData.length;
        }
      }
      // Format 4: Direct array response
      else if (Array.isArray(response)) {
        camerasData = response;
        count = camerasData.length;
      }
      
      // ✅ Ensure camerasData is always an array
      if (!Array.isArray(camerasData)) {
        console.warn('⚠️ Cameras data is not an array, resetting to empty array');
        camerasData = [];
      }
      
      console.log('✅ Setting cameras:', camerasData.length, 'cameras');
      setCameras(camerasData);
      setPagination(prev => ({
        ...prev,
        total: count,
        totalPages: Math.ceil(count / prev.limit),
      }));
    } catch (err) {
      console.error('❌ Error loading cameras:', err);
      setError(err.toString());
      setCameras([]); // ✅ Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      console.log('🏢 Loading branches...');
      const response = await branchService.getBranches({
        page: 1,
        limit: 100, // Get all branches
      });
      
      console.log('📊 Branch response:', response);
      
      // ✅ Handle different response formats
      let branchData = [];
      
      if (response.data) {
        if (response.data.branches) {
          branchData = response.data.branches;
        } else if (response.data.rows) {
          branchData = response.data.rows;
        } else if (Array.isArray(response.data)) {
          branchData = response.data;
        }
      } else if (Array.isArray(response)) {
        branchData = response;
      }
      
      // ✅ Ensure branchData is an array
      if (!Array.isArray(branchData)) {
        branchData = [];
      }
      
      console.log('✅ Setting branches:', branchData.length, 'branches');
      setBranches(branchData);
    } catch (err) {
      console.error('❌ Error loading branches:', err);
      setBranches([]); // ✅ Reset to empty array on error
    }
  };

  const handleOpenModal = (camera = null) => {
    if (camera) {
      setEditingCamera(camera);
      setFormData({
        camera_name: camera.camera_name || '',
        camera_code: camera.camera_code || '',
        branch_id: camera.branch_id || '',
        camera_type: camera.camera_type || 'RTSP',
        stream_url: camera.stream_url || '',
        location_description: camera.location_description || '',
        fps: camera.fps || 25,
        resolution: camera.resolution || '1920x1080',
        is_active: camera.is_active ?? true,
      });
    } else {
      setEditingCamera(null);
      setFormData({
        camera_name: '',
        camera_code: '',
        branch_id: '',
        camera_type: 'RTSP',
        stream_url: '',
        location_description: '',
        fps: 25,
        resolution: '1920x1080',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCamera(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Add tenant_id from current user
      const dataToSubmit = {
        ...formData,
        tenant_id: user?.tenant_id || 1,
      };

      if (editingCamera) {
        await cameraService.updateCamera(editingCamera.camera_id, dataToSubmit);
        alert('Camera updated successfully!');
      } else {
        await cameraService.createCamera(dataToSubmit);
        alert('Camera added successfully!');
      }
      
      handleCloseModal();
      loadCameras();
    } catch (err) {
      console.error('Error saving camera:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) {
      return;
    }

    try {
      setLoading(true);
      await cameraService.deleteCamera(cameraId);
      alert('Camera deleted successfully!');
      loadCameras();
    } catch (err) {
      console.error('Error deleting camera:', err);
      alert(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (camera) => {
    try {
      setLoading(true);
      await cameraService.updateCameraStatus(camera.camera_id, !camera.is_active);
      loadCameras();
    } catch (err) {
      console.error('Error toggling camera status:', err);
      alert(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  // ✅ Safe filter functions with array check
  const activeCamerasCount = Array.isArray(cameras) 
    ? cameras.filter(c => c.is_active).length 
    : 0;
    
  const inactiveCamerasCount = Array.isArray(cameras)
    ? cameras.filter(c => !c.is_active).length
    : 0;

  if (loading && cameras.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Camera Management</h1>
          <p className="text-gray-600">Configure and manage surveillance cameras</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Add Camera
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Cameras</p>
              <p className="text-3xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <Camera className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Cameras</p>
              <p className="text-3xl font-bold text-green-600">
                {activeCamerasCount}
              </p>
            </div>
            <Power className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inactive Cameras</p>
              <p className="text-3xl font-bold text-red-600">
                {inactiveCamerasCount}
              </p>
            </div>
            <Video className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">All Cameras</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Camera Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(cameras) && cameras.map((camera) => (
                <tr key={camera.camera_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{camera.camera_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-600">{camera.camera_code}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {camera.branch?.branch_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {camera.camera_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {camera.location_description || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleStatus(camera)}
                      disabled={loading}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        camera.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      } disabled:opacity-50`}
                    >
                      <Power className="w-3 h-3 mr-1" />
                      {camera.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(camera)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-800 p-1 disabled:opacity-50"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(camera.camera_id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!Array.isArray(cameras) || cameras.length === 0) && !loading && (
          <div className="text-center py-12 text-gray-500">
            <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No cameras configured yet</p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Camera
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCamera ? 'Edit Camera' : 'Add New Camera'}
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
                  {error}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Camera Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Name *
                  </label>
                  <input
                    type="text"
                    name="camera_name"
                    value={formData.camera_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Main Entrance"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Camera Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Code *
                  </label>
                  <input
                    type="text"
                    name="camera_code"
                    value={formData.camera_code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., CAM001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch *
                  </label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Branch</option>
                    {Array.isArray(branches) && branches.map(branch => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Camera Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Type *
                  </label>
                  <select
                    name="camera_type"
                    value={formData.camera_type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="IP">IP Camera</option>
                    <option value="USB">USB Camera</option>
                    <option value="RTSP">RTSP Stream</option>
                    <option value="DVR">DVR</option>
                    <option value="NVR">NVR</option>
                  </select>
                </div>

                {/* FPS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    FPS
                  </label>
                  <input
                    type="number"
                    name="fps"
                    value={formData.fps}
                    onChange={handleChange}
                    placeholder="25"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution
                  </label>
                  <select
                    name="resolution"
                    value={formData.resolution}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="640x480">640x480 (SD)</option>
                    <option value="1280x720">1280x720 (HD - 1MP)</option>
                    <option value="1920x1080">1920x1080 (Full HD - 2MP)</option>
                    <option value="2048x1536">2048x1536 (3MP)</option>
                    <option value="2560x1440">2560x1440 (4MP)</option>
                    <option value="2592x1944">2592x1944 (5MP)</option>
                    <option value="3840x2160">3840x2160 (8MP / 4K)</option>
                  </select>
                </div>

                {/* Stream URL */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stream URL *
                  </label>
                  <input
                    type="text"
                    name="stream_url"
                    value={formData.stream_url}
                    onChange={handleChange}
                    required
                    placeholder="rtsp://192.168.1.100:554/stream"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Location Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location Description
                  </label>
                  <textarea
                    name="location_description"
                    value={formData.location_description}
                    onChange={handleChange}
                    placeholder="e.g., Front entrance, facing north"
                    rows="3"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Active Status */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Camera is active
                    </span>
                  </label>
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCamera ? 'Update Camera' : 'Add Camera'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CameraManagementPage;