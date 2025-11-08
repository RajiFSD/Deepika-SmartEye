import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, MapPin, Save, X, Globe, Clock, CheckCircle, XCircle } from 'lucide-react';
import branchService from '../services/branchService';
import authService from '../services/authService';

function BranchManagementPage() {
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    city: '',
    state: '',
    country: '',
    timezone: 'UTC',
    is_active: true,
  });

  const user = authService.getCurrentUser();

  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
  ];

  // Load initial data
  useEffect(() => {
    loadBranches();
  }, [pagination.page]);

 const loadBranches = async () => {
    try {
      setLoading(true);
      setError('');   
      const response = await branchService.getBranches({
        page: pagination.page,
        limit: pagination.limit,
      });
       
      // Handle backend response format - response.data contains the backend's data wrapper
      const responseData = response.data || {};
      const branchesData = responseData.branches || responseData.rows || [];
      const paginationData = responseData.pagination || {};
      
     
      setBranches(branchesData);
      setPagination(prev => ({
        ...prev,
        total: branchesData.length,
        totalPages: paginationData.totalPages || Math.ceil(branchesData.length / prev.limit),
      }));
    } catch (err) {
      console.error('Error loading branches:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        branch_name: branch.branch_name || '',
        branch_code: branch.branch_code || '',
        address: branch.address || '',
        city: branch.city || '',
        state: branch.state || '',
        country: branch.country || '',
        timezone: branch.timezone || 'UTC',
        is_active: branch.is_active ?? true,
      });
    } else {
      setEditingBranch(null);
      setFormData({
        branch_name: '',
        branch_code: '',
        address: '',
        city: '',
        state: '',
        country: '',
        timezone: 'UTC',
        is_active: true,
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (editingBranch) {
        // Update existing branch
        await branchService.updateBranch(editingBranch.branch_id, formData);
        alert('Branch updated successfully!');
      } else {
        // Create new branch
        await branchService.createBranch(formData);
        alert('Branch added successfully!');
      }
      
      handleCloseModal();
      loadBranches();
    } catch (err) {
      console.error('Error saving branch:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branchId) => {
    if (!window.confirm('Are you sure you want to delete this branch? All associated cameras will also be deactivated.')) {
      return;
    }

    try {
      setLoading(true);
      await branchService.deleteBranch(branchId);
      alert('Branch deleted successfully!');
      loadBranches();
    } catch (err) {
      console.error('Error deleting branch:', err);
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

  if (loading && branches.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Branch Management</h1>
          <p className="text-gray-600">Manage your organization branches and locations</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Add Branch
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
              <p className="text-sm text-gray-600 mb-1">Total Branches</p>
              <p className="text-3xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <Building2 className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Branches</p>
              <p className="text-3xl font-bold text-green-600">
                {branches.filter(b => b.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Inactive Branches</p>
              <p className="text-3xl font-bold text-red-600">
                {branches.filter(b => !b.is_active).length}
              </p>
            </div>
            <XCircle className="w-12 h-12 text-red-600" />
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <div key={branch.branch_id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    branch.is_active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Building2 className={`w-6 h-6 ${
                      branch.is_active ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{branch.branch_name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{branch.branch_code}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  branch.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {branch.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {branch.address && (
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{branch.address}</span>
                  </div>
                )}
                {branch.city && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Globe className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {branch.city}
                      {branch.state && `, ${branch.state}`}
                      {branch.country && ` - ${branch.country}`}
                    </span>
                  </div>
                )}
                {branch.timezone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4 flex-shrink-0" />
                    <span>{branch.timezone}</span>
                  </div>
                )}
              </div>

              {/* Camera Count */}
              {branch.cameras && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Cameras</span>
                    <span className="font-medium text-gray-900">
                      {branch.cameras.length} configured
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(branch)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(branch.branch_id)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {branches.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No branches yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first branch location</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Branch
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
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
                {/* Branch Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    name="branch_name"
                    value={formData.branch_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Downtown Branch"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Branch Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch Code *
                  </label>
                  <input
                    type="text"
                    name="branch_code"
                    value={formData.branch_code}
                    onChange={handleChange}
                    required
                    placeholder="e.g., BR001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g., 123 Main Street"
                    rows="2"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="e.g., New York"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="e.g., NY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    placeholder="e.g., USA"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
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
                      Branch is active
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
                      {editingBranch ? 'Update Branch' : 'Add Branch'}
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

export default BranchManagementPage;