import { useState, useEffect } from 'react';
import { 
  Building2,
  Users,
  Camera,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Zap,
  Rocket
} from 'lucide-react';
import tenantService from '../services/tenantService';
import planService from '../services/planService';

function SubscriptionsPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      console.log('Fetched plans:', plansData);
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

      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active' ? 'true' : 'false';
      }

      const response = await tenantService.getAllTenants(params);
      
      let tenantsData = response.data?.tenants || response.data?.rows || response.data || [];
      console.log('Fetched tenants/subscriptions:', tenantsData);
      const paginationData = response.data?.pagination || {};
      
      // Filter by plan if needed
      if (planFilter !== 'all') {
        tenantsData = tenantsData.filter(t => 
          (t.subscription_plan_id || t.plan_id) === planFilter
        );
      }
      
      // Transform tenant data to match subscription structure
      const transformedSubscriptions = tenantsData.map(tenant => ({
        id: tenant.tenant_id || tenant.id,
        tenantName: tenant.tenant_name || tenant.name,
        email: tenant.contact_email || tenant.email,
        phone: tenant.contact_phone || tenant.phone,
        plan: tenant.subscription_plan_id || tenant.plan_id || 'demo',
        status: tenant.subscription_status || (tenant.is_active ? 'active' : 'inactive'),
        startDate: tenant.subscription_start_date || tenant.created_at,
        endDate: tenant.subscription_end_date,
        nextBilling: tenant.next_billing_date,
        cameras: tenant.camera_count || tenant.active_cameras || 0,
        users: tenant.user_count || tenant.active_users || 0,
        isActive: tenant.is_active
      }));
      
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
      case 'inactive':
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
    // Create CSV content
    const headers = ['Tenant Name', 'Email', 'Plan', 'Status', 'Cameras', 'Users', 'Start Date', 'Next Billing'];
    const rows = subscriptions.map(sub => [
      sub.tenantName,
      sub.email,
      sub.plan,
      sub.status,
      sub.cameras,
      sub.users,
      sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A',
      sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-gray-600">Manage customer subscriptions and usage</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.total}</p>
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
          <p className="text-sm text-gray-600 mb-1">Inactive</p>
          <p className="text-2xl font-bold text-gray-900">
            {subscriptions.filter(s => s.status === 'inactive' || !s.isActive).length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tenant name or email..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
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
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Plan Filter */}
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

          {/* Export Button */}
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
                      Contact
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
                      Next Billing
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
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
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{sub.email}</div>
                            {sub.phone && (
                              <div className="text-sm text-gray-500">{sub.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <PlanIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm font-medium text-gray-900 capitalize">
                                {sub.plan}
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
                            {sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-800 mr-3">
                              <Eye className="w-4 h-4 inline" />
                            </button>
                            <button className="text-purple-600 hover:text-purple-800">
                              <Edit className="w-4 h-4 inline" />
                            </button>
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
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(pagination.totalPages)].map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.totalPages ||
                        (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                            className={`px-3 py-2 rounded-lg transition-colors ${
                              pagination.page === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === pagination.page - 2 ||
                        pageNum === pagination.page + 2
                      ) {
                        return <span key={pageNum} className="px-2">...</span>;
                      }
                      return null;
                    })}
                  </div>
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
    </div>
  );
}

export default SubscriptionsPage;