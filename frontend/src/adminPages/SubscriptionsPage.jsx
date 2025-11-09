import { useState, useEffect } from 'react';
import { 
  Building2,
  Ban,
  Users,
  Camera,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  X,
  Zap,
  Rocket,
  Save
} from 'lucide-react';
import tenantService from '../services/tenantService';
import planService from '../services/planService';
import cameraService from '../services/cameraService';
import adminService from '../services/adminService';

function SubscriptionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [availableTenants, setAvailableTenants] = useState([]);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('view'); // 'view', 'add', 'edit'
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // Form data - only subscription-related fields
  const [formData, setFormData] = useState({
    tenant_id: '',
    subscription_plan_id: '',
    subscription_status: 'trial',
    subscription_start_date: '',
    subscription_end_date: ''
  });

  // Icon mapping
  const iconMap = {
    'demo': Zap,
    'free': Zap,
    'intermediate': Building2,
    'standard': Building2,
    'enterprise': Rocket,
    'premium': Rocket
  };

  useEffect(() => {
    loadPlans();
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [pagination.page, searchTerm, statusFilter, planFilter]);

  const loadPlans = async () => {
    try {
      const response = await planService.getPlans();
      const plansData = response.data?.plans || response.data || [];  
      const transformedPlans = plansData.map(plan => ({
        id: plan.id || plan.plan_id,
        name: plan.name || plan.plan_name,
        icon: iconMap[plan.name?.toLowerCase()] || Building2
      }));
      
      setPlans(transformedPlans);
    } catch (err) {
      console.error('Error loading plans:', err);
    }
  };

  const loadAvailableTenants = async () => {
    try {
      // Get all tenants
      const response = await tenantService.getAllTenants({ page: 1, limit: 1000 });
      const allTenants = response.data?.tenants || response.data?.rows || [];
      
      // Filter tenants that don't have a subscription plan
      const tenantsWithoutPlan = allTenants.filter(tenant => 
        !tenant.subscription_plan_id || tenant.subscription_plan_id === null
      );
      
      setAvailableTenants(tenantsWithoutPlan);
    } catch (err) {
      console.error('Error loading available tenants:', err);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await tenantService.getAllTenants(params);
      
      let tenantsData = response.data?.tenants || response.data?.rows || response.data || [];
      const paginationData = response.data?.pagination || {};
      
      // Filter only tenants WITH subscription plans
      tenantsData = tenantsData.filter(t => t.subscription_plan_id);
      
      // Filter by status if needed
      if (statusFilter !== 'all') {
        tenantsData = tenantsData.filter(t => 
          (t.subscription_status || 'trial').toLowerCase() === statusFilter.toLowerCase()
        );
      }
      
      // Filter by plan if needed
      if (planFilter !== 'all') {
        tenantsData = tenantsData.filter(t => 
          (t.subscription_plan_id || t.plan_id) === planFilter
        );
      }
      
      // Fetch cameras and users count for each tenant
      const transformedSubscriptions = await Promise.all(
        tenantsData.map(async (tenant) => {
          const tenantId = tenant.tenant_id || tenant.id;
          let cameraCount = 0;
          let userCount = 0;

          try {
            const userCountResponse = await adminService.getUserCountByTenantId(tenantId);
            userCount = userCountResponse.data?.user_count || 0;
          } catch (err) {
            console.error(`Error fetching user count for tenant ${tenantId}:`, err);
          }

          try {
            const camerasResponse = await cameraService.getCameras({
              page: 1,
              limit: 1000,
              tenant_id: tenantId
            });
            
            const cameras = camerasResponse.data?.cameras || camerasResponse.data?.rows || [];
            cameraCount = cameras.filter(cam => 
              (cam.tenant_id || cam.tenantId) === tenantId
            ).length;
          } catch (err) {
            console.error(`Error fetching cameras for tenant ${tenantId}:`, err);
          }

          return {
            id: tenantId,
            tenantName: tenant.tenant_name || tenant.name,
            tenantCode: tenant.tenant_code,
            email: tenant.contact_email || tenant.email,
            phone: tenant.contact_phone || tenant.phone,
            plan: tenant.subscription_plan_id || tenant.plan_id,
            status: tenant.subscription_status || 'trial',
            startDate: tenant.subscription_start_date,
            endDate: tenant.subscription_end_date,
            cameras: cameraCount,
            users: userCount,
            isActive: tenant.is_active,
            rawData: tenant
          };
        })
      );
      
      setSubscriptions(transformedSubscriptions);
      setPagination(prev => ({
        ...prev,
        total: paginationData.total || transformedSubscriptions.length,
        totalPages: paginationData.totalPages || Math.ceil(transformedSubscriptions.length / prev.limit),
      }));
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError('Failed to load subscriptions: ' + err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    await loadAvailableTenants();
    setModalMode('add');
    setFormData({
      tenant_id: '',
      subscription_plan_id: plans[0]?.id || '',
      subscription_status: 'trial',
      subscription_start_date: new Date().toISOString().split('T')[0],
      subscription_end_date: ''
    });
    setShowModal(true);
  };

  const handleView = (subscription) => {
    setModalMode('view');
    setSelectedSubscription(subscription);
    setShowModal(true);
  };

  const handleEdit = (subscription) => {
    setModalMode('edit');
    setSelectedSubscription(subscription);
    setFormData({
      tenant_id: subscription.id,
      subscription_plan_id: subscription.plan,
      subscription_status: subscription.status,
      subscription_start_date: subscription.startDate ? new Date(subscription.startDate).toISOString().split('T')[0] : '',
      subscription_end_date: subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      // Only nullify subscription fields, don't touch is_active
      await tenantService.updateTenant(deleteId, {
        subscription_plan_id: null,
        subscription_status: null,
        subscription_start_date: null,
        subscription_end_date: null
      });
      
      setSuccess('Subscription removed successfully!');
      setShowDeleteConfirm(false);
      setDeleteId(null);
      loadSubscriptions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error removing subscription:', err);
      setError('Failed to remove subscription');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'add') {
        // Update tenant with subscription details
        await tenantService.updateTenant(formData.tenant_id, {
          subscription_plan_id: formData.subscription_plan_id,
          subscription_status: formData.subscription_status,
          subscription_start_date: formData.subscription_start_date,
          subscription_end_date: formData.subscription_end_date || null
        });
        setSuccess('Subscription added successfully!');
      } else if (modalMode === 'edit') {
        // Update only subscription fields
        await tenantService.updateTenant(selectedSubscription.id, {
          subscription_plan_id: formData.subscription_plan_id,
          subscription_status: formData.subscription_status,
          subscription_start_date: formData.subscription_start_date,
          subscription_end_date: formData.subscription_end_date || null
        });
        setSuccess('Subscription updated successfully!');
      }
      
      setShowModal(false);
      loadSubscriptions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving subscription:', err);
      setError('Failed to save subscription: ' + err.toString());
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleExport = () => {
    const headers = ['Tenant Name', 'Code', 'Plan', 'Status', 'Cameras', 'Users', 'Start Date', 'End Date'];
    const rows = subscriptions.map(sub => [
      sub.tenantName,
      sub.tenantCode,
      sub.plan,
      sub.status,
      sub.cameras,
      sub.users,
      sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A',
      sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions Management</h1>
          <p className="text-gray-600">Manage customer subscriptions and plans</p>
        </div>
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Subscription
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
    
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">{subscriptions.length}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'active').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Trial</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'trial').length}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Expired</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'expired').length}
          </p>
        </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">suspended</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'suspended').length}
          </p>
        </div>

      </div>
      

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <select
            value={planFilter}
            onChange={(e) => {
              setPlanFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Plans</option>
            {plans.map(plan => (
              <option key={plan.id} value={plan.id}>{plan.name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      End Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                        No subscriptions found
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const plan = plans.find(p => p.id === sub.plan);
                      const PlanIcon = plan?.icon || Building2;
                      
                      return (
                        <tr key={sub.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{sub.tenantName}</div>
                                <div className="text-sm text-gray-500">{sub.tenantCode}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <PlanIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {plan?.name || sub.plan}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <Camera className="w-3 h-3" />
                                <span>{sub.cameras} cameras</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{sub.users} users</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button 
                                onClick={() => handleView(sub)}
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleEdit(sub)}
                                className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(sub.id)}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                title="Remove Subscription"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between bg-gray-50 px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal for Add/Edit/View */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'view' ? 'Subscription Details' : modalMode === 'add' ? 'Add New Subscription' : 'Edit Subscription'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            {modalMode === 'view' ? (
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tenant Name</label>
                    <p className="text-gray-900">{selectedSubscription?.tenantName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Tenant Code</label>
                    <p className="text-gray-900">{selectedSubscription?.tenantCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Plan</label>
                    <p className="text-gray-900 capitalize">{selectedSubscription?.plan}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatusColor(selectedSubscription?.status)}`}>
                      {selectedSubscription?.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                    <p className="text-gray-900">{selectedSubscription?.startDate ? new Date(selectedSubscription.startDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">End Date</label>
                    <p className="text-gray-900">{selectedSubscription?.endDate ? new Date(selectedSubscription.endDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cameras</label>
                    <p className="text-gray-900">{selectedSubscription?.cameras}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Users</label>
                    <p className="text-gray-900">{selectedSubscription?.users}</p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {modalMode === 'add' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                      <select
                        required
                        value={formData.tenant_id}
                        onChange={(e) => setFormData({...formData, tenant_id: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Tenant</option>
                        {availableTenants.map(tenant => (
                          <option key={tenant.tenant_id} value={tenant.tenant_id}>
                            {tenant.tenant_name} ({tenant.tenant_code})
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Only tenants without subscriptions are shown</p>
                    </div>
                  )}
                  
                  {modalMode === 'edit' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                      <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
                        {selectedSubscription?.tenantName} ({selectedSubscription?.tenantCode})
                      </div>
                      <p className="mt-1 text-xs text-gray-500">Tenant cannot be changed</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan *</label>
                    <select
                      required
                      value={formData.subscription_plan_id}
                      onChange={(e) => setFormData({...formData, subscription_plan_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select Plan</option>
                      {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>{plan.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                    <select
                      required
                      value={formData.subscription_status}
                      onChange={(e) => setFormData({...formData, subscription_status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="trial">Trial</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.subscription_start_date}
                        onChange={(e) => setFormData({...formData, subscription_start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                      <input
                        type="date"
                        value={formData.subscription_end_date}
                        onChange={(e) => setFormData({...formData, subscription_end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {modalMode === 'add' ? 'Add Subscription' : 'Update Subscription'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Remove Subscription</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to remove this subscription? The tenant will remain active but without a subscription plan.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteId(null);
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionsPage;