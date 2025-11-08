import { useState, useEffect } from 'react';
import { Building, Plus, Edit2, Trash2, Mail, Phone, Save, X, CheckCircle, XCircle, Users, Building2, Camera, Crown } from 'lucide-react';
import tenantService from '../services/tenantService';
import authService from '../services/authService';

function TenantManagementPage() {
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  
  const [formData, setFormData] = useState({
    tenant_name: '',
    tenant_code: '',
    contact_email: '',
    contact_phone: '',
    subscription_type: 'basic',
    is_active: true,
  });

  const user = authService.getCurrentUser();
  const isSuperAdmin = user?.role === 'super_admin';
  // console.log('Current User:', user);
  // console.log('Is Super Admin:', isSuperAdmin);

  const subscriptionTypes = [
    { value: 'basic', label: 'Basic', color: 'blue', limits: '5 cameras, 1 branch, 3 users' },
    { value: 'premium', label: 'Premium', color: 'purple', limits: '20 cameras, 5 branches, 10 users' },
    { value: 'enterprise', label: 'Enterprise', color: 'green', limits: 'Unlimited' },
  ];

  // Load initial data
  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
    }
  }, [pagination.page, isSuperAdmin]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await tenantService.getAllTenants({
        page: pagination.page,
        limit: pagination.limit,
      });
      
      // Handle backend response format
      const tenantsData = response.data?.tenants || response.data?.rows || response.data || [];
      const paginationData = response.data?.pagination || {};
      
      setTenants(tenantsData);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || tenantsData.length,
        totalPages: paginationData.totalPages || Math.ceil(tenantsData.length / prev.limit),
      }));
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tenant = null) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        tenant_name: tenant.tenant_name || '',
        tenant_code: tenant.tenant_code || '',
        contact_email: tenant.contact_email || '',
        contact_phone: tenant.contact_phone || '',
        subscription_type: tenant.subscription_type || 'basic',
        is_active: tenant.is_active ?? true,
      });
    } else {
      setEditingTenant(null);
      setFormData({
        tenant_name: '',
        tenant_code: '',
        contact_email: '',
        contact_phone: '',
        subscription_type: 'basic',
        is_active: true,
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTenant(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (editingTenant) {
        await tenantService.updateTenant(editingTenant.tenant_id, formData);
        alert('Tenant updated successfully!');
      } else {
        await tenantService.createTenant(formData);
        alert('Tenant created successfully!');
      }
      
      handleCloseModal();
      loadTenants();
    } catch (err) {
      console.error('Error saving tenant:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tenantId) => {
    if (!window.confirm('Are you sure you want to deactivate this tenant? This will affect all users, branches, and cameras under this tenant.')) {
      return;
    }

    try {
      setLoading(true);
      await tenantService.deleteTenant(tenantId);
      alert('Tenant deactivated successfully!');
      loadTenants();
    } catch (err) {
      console.error('Error deleting tenant:', err);
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

  const getSubscriptionBadgeColor = (type) => {
    const colors = {
      basic: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
      enterprise: 'bg-green-100 text-green-800',
    };
    return colors[type] || colors.basic;
  };

  const getSubscriptionIcon = (type) => {
    if (type === 'enterprise') return <Crown className="w-4 h-4" />;
    if (type === 'premium') return <Building2 className="w-4 h-4" />;
    return <Building className="w-4 h-4" />;
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only super administrators can access tenant management.</p>
        </div>
      </div>
    );
  }

  if (loading && (!tenants || tenants.length === 0)) {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenant Management</h1>
          <p className="text-gray-600">Manage all tenants and their subscriptions</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
              <p className="text-3xl font-bold text-gray-900">{pagination.total}</p>
            </div>
            <Building className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Tenants</p>
              <p className="text-3xl font-bold text-green-600">
                {tenants.filter(t => t.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Premium</p>
              <p className="text-3xl font-bold text-purple-600">
                {tenants.filter(t => t.subscription_type === 'premium').length}
              </p>
            </div>
            <Building2 className="w-12 h-12 text-purple-600" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Enterprise</p>
              <p className="text-3xl font-bold text-green-600">
                {tenants.filter(t => t.subscription_type === 'enterprise').length}
              </p>
            </div>
            <Crown className="w-12 h-12 text-green-600" />
          </div>
        </div>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div key={tenant.tenant_id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    tenant.is_active ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Building className={`w-6 h-6 ${
                      tenant.is_active ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.tenant_name}</h3>
                    <p className="text-sm text-gray-500 font-mono">{tenant.tenant_code}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  tenant.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {tenant.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Subscription Badge */}
              <div className="mb-4">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionBadgeColor(tenant.subscription_type)}`}>
                  {getSubscriptionIcon(tenant.subscription_type)}
                  {tenant.subscription_type?.charAt(0).toUpperCase() + tenant.subscription_type?.slice(1)}
                </span>
              </div>

              {/* Contact Details */}
              <div className="space-y-2 mb-4">
                {tenant.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{tenant.contact_email}</span>
                  </div>
                )}
                {tenant.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{tenant.contact_phone}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {tenant.branches && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Users className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-600">Users</p>
                      <p className="font-medium text-gray-900">-</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-600">Branches</p>
                      <p className="font-medium text-gray-900">{tenant.branches?.length || 0}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Camera className="w-4 h-4 text-gray-500" />
                      </div>
                      <p className="text-xs text-gray-600">Cameras</p>
                      <p className="font-medium text-gray-900">-</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenModal(tenant)}
                  disabled={loading}
                  className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tenant.tenant_id)}
                  disabled={loading || !tenant.is_active}
                  className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Deactivate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <Building className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first tenant</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Your First Tenant
          </button>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1 || loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
            disabled={pagination.page === pagination.totalPages || loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTenant ? 'Edit Tenant' : 'Add New Tenant'}
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
                {/* Tenant Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Name *
                  </label>
                  <input
                    type="text"
                    name="tenant_name"
                    value={formData.tenant_name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., ABC Corporation"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tenant Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Code *
                  </label>
                  <input
                    type="text"
                    name="tenant_code"
                    value={formData.tenant_code}
                    onChange={handleChange}
                    required
                    disabled={editingTenant} // Cannot change code after creation
                    placeholder="e.g., ABC001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  {editingTenant && (
                    <p className="mt-1 text-xs text-gray-500">Tenant code cannot be changed</p>
                  )}
                </div>

                {/* Subscription Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subscription Type *
                  </label>
                  <select
                    name="subscription_type"
                    value={formData.subscription_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {subscriptionTypes.map(sub => (
                      <option key={sub.value} value={sub.value}>
                        {sub.label} - {sub.limits}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={handleChange}
                    placeholder="e.g., contact@abc.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="contact_phone"
                    value={formData.contact_phone}
                    onChange={handleChange}
                    placeholder="e.g., +1234567890"
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
                      Tenant is active
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
                      {editingTenant ? 'Update Tenant' : 'Add Tenant'}
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

export default TenantManagementPage;