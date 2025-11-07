import { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Zap, 
  Building2, 
  Rocket,
  Users,
  Camera,
  Clock,
  Shield,
  TrendingUp,
  CheckCircle,
  Edit2,
  DollarSign
} from 'lucide-react';
import tenantService from '../services/tenantService';

function PaymentPlansPage() {
 const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [plans, setPlans] = useState([
    {
      id: 'demo',
      name: 'Demo',
      icon: Zap,
      price: 0,
      period: 'Free',
      description: 'Perfect for testing and evaluation',
      color: 'blue',
      features: [
        { text: 'Up to 2 cameras', included: true },
        { text: 'Basic smoke detection', included: true },
        { text: 'People counting', included: true },
        { text: '7 days data retention', included: true },
        { text: 'Email alerts', included: true },
        { text: 'Standard support', included: true },
        { text: 'Advanced analytics', included: false },
        { text: 'API access', included: false },
        { text: 'Custom integrations', included: false },
        { text: 'Priority support', included: false }
      ],
      limits: {
        cameras: 2,
        users: 3,
        storage: '1 GB',
        retention: '7 days'
      }
    },
    {
      id: 'intermediate',
      name: 'Intermediate',
      icon: Building2,
      price: 299,
      period: 'per month',
      description: 'Ideal for growing businesses',
      color: 'purple',
      popular: true,
      features: [
        { text: 'Up to 20 cameras', included: true },
        { text: 'Advanced smoke detection', included: true },
        { text: 'People counting & tracking', included: true },
        { text: '30 days data retention', included: true },
        { text: 'Email & SMS alerts', included: true },
        { text: 'Priority support', included: true },
        { text: 'Advanced analytics', included: true },
        { text: 'Basic API access', included: true },
        { text: 'Custom integrations', included: false },
        { text: '24/7 phone support', included: false }
      ],
      limits: {
        cameras: 20,
        users: 15,
        storage: '50 GB',
        retention: '30 days'
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      icon: Rocket,
      price: 'Custom',
      period: 'Contact us',
      description: 'Complete solution for large organizations',
      color: 'green',
      features: [
        { text: 'Unlimited cameras', included: true },
        { text: 'All detection features', included: true },
        { text: 'Advanced AI analytics', included: true },
        { text: 'Custom data retention', included: true },
        { text: 'Multi-channel alerts', included: true },
        { text: 'Dedicated support team', included: true },
        { text: 'Real-time analytics', included: true },
        { text: 'Full API access', included: true },
        { text: 'Custom integrations', included: true },
        { text: '24/7 priority support', included: true }
      ],
      limits: {
        cameras: 'Unlimited',
        users: 'Unlimited',
        storage: 'Custom',
        retention: 'Custom'
      }
    }
  ]);

  const [subscriptions, setSubscriptions] = useState([
    {
      id: 1,
      tenantName: 'Acme Corporation',
      plan: 'intermediate',
      status: 'active',
      startDate: '2024-01-15',
      nextBilling: '2024-12-15',
      cameras: 12,
      users: 8
    },

  ]);



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
        
        setSubscriptions(tenantsData);
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

  const [stats, setStats] = useState({
    totalRevenue: 15450,
    activeSubscriptions: 3,
    demoUsers: 1,
    paidUsers: 2
  });

   useEffect(() => {
     
        loadTenants();
      
    }, [pagination.page]);

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        icon: 'bg-blue-100 text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        icon: 'bg-purple-100 text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-600',
        icon: 'bg-green-100 text-green-600',
        button: 'bg-green-600 hover:bg-green-700'
      }
    };
    return colors[color] || colors.blue;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'trial':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Plans & Subscriptions</h1>
        <p className="text-gray-600">Manage pricing tiers and customer subscriptions</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
          <p className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Paid Customers</p>
          <p className="text-2xl font-bold text-gray-900">{stats.paidUsers}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Demo Users</p>
          <p className="text-2xl font-bold text-gray-900">{stats.demoUsers}</p>
        </div>
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const colors = getColorClasses(plan.color);
            const Icon = plan.icon;
            
            return (
              <div
                key={plan.id}
                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow relative ${
                  plan.popular ? 'ring-2 ring-purple-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-semibold">
                    POPULAR
                  </div>
                )}
                
                <div className="p-6">
                  {/* Header */}
                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    {/* Price */}
                    <div className="mb-4">
                      {typeof plan.price === 'number' ? (
                        <>
                          <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                          <span className="text-gray-600 text-sm ml-2">{plan.period}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                          <span className="text-gray-600 text-sm block mt-1">{plan.period}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Limits */}
                  <div className={`${colors.bg} ${colors.border} border rounded-lg p-4 mb-6`}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Camera className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Cameras</span>
                        </div>
                        <p className="font-semibold text-gray-900 ml-6">{plan.limits.cameras}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Users</span>
                        </div>
                        <p className="font-semibold text-gray-900 ml-6">{plan.limits.users}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Storage</span>
                        </div>
                        <p className="font-semibold text-gray-900 ml-6">{plan.limits.storage}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-600">Retention</span>
                        </div>
                        <p className="font-semibold text-gray-900 ml-6">{plan.limits.retention}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm ${feature.included ? 'text-gray-900' : 'text-gray-400'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <button
                    className={`w-full ${colors.button} text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2`}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Plan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Subscriptions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Active Subscriptions</h2>
          <p className="text-sm text-gray-600">Current customer subscriptions and usage</p>
        </div>
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
                  Next Billing
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {subscriptions.map((sub) => {
                const plan = plans.find(p => p.id === sub.plan);
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
                      <div className="flex items-center gap-2">
                        {plan && <plan.icon className="w-4 h-4 text-gray-500" />}
                        <span className="text-sm font-medium text-gray-900 capitalize">{sub.plan}</span>
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
                      {new Date(sub.startDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {sub.nextBilling ? new Date(sub.nextBilling).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-800 mr-3">View</button>
                      <button className="text-purple-600 hover:text-purple-800">Edit</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PaymentPlansPage;