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
  Crown,
  Shield,
  TrendingUp,
  CheckCircle,
  Edit2,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  Star,
  Layers,
  Trophy,
  Gem,
  XCircle
} from 'lucide-react';
import planService from '../services/planService';

function PaymentPlansPage() {
  const [plansLoading, setPlansLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    activeSubscriptions: 0,
    demoUsers: 0,
    paidUsers: 0
  });
  
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: 'Building2',
    price: '',
    price_custom: false,
    period: 'per month',
    description: '',
    color: 'blue',
    is_popular: false,
    cameras_limit: '',
    users_limit: '',
    storage_limit: '',
    retention_limit: '',
    features: []
  });
  const [newFeature, setNewFeature] = useState({ text: '', included: true });

  // Icon mapping
  const iconMap = {
    'demo': Zap,
    'free': Star,
    'intermediate': Building2,
    'standard': Crown,
    'enterprise': Rocket,
    'premium': Gem,
  };

  const colorMap = {
    'demo': 'blue',
    'free': 'blue',
    'intermediate': 'purple',
    'standard': 'purple',
    'enterprise': 'green',
    'premium': 'green'
  };

  useEffect(() => {
    loadPlans();
    loadStats();
  }, []);

  const loadPlans = async () => {
    try {
      setPlansLoading(true);
      const response = await planService.getPlans();
      
      const transformedPlans = (response.data?.plans || response.data || []).map(plan => {
        let displayPrice = plan.price;
        let displayPeriod = plan.period || 'per month';
        
        if (plan.price_custom || plan.price === null) {
          displayPrice = 'Custom';
          displayPeriod = 'Contact us';
        } else {
          displayPrice = parseFloat(plan.price) || 0;
        }

        return {
          id: plan.id || plan.plan_id,
          name: plan.name || plan.plan_name,
          icon: iconMap[plan.name?.toLowerCase()] || Building2,
          price: displayPrice,
          period: displayPeriod,
          description: plan.description || '',
          color: colorMap[plan.name?.toLowerCase()] || plan.color || 'blue',
          popular: plan.is_popular || false,
          features: parseFeatures(plan.features),
          limits: {
            cameras: plan.cameras_limit || plan.max_cameras || 'Unlimited',
            users: plan.users_limit || plan.max_users || 'Unlimited',
            storage: plan.storage_limit || 'Custom',
            retention: plan.retention_limit || plan.data_retention || 'Custom'
          },
          rawData: plan
        };
      });

      setPlans(transformedPlans);
    } catch (err) {
      console.error('Error loading plans:', err);
      setError('Failed to load plans: ' + err.toString());
    } finally {
      setPlansLoading(false);
    }
  };

  const parseFeatures = (features) => {
    if (!features) return [];
    
    try {
      if (Array.isArray(features)) {
        return features.map(f => ({
          text: f.feature_text || f.text || f.name,
          included: f.is_included !== undefined ? f.is_included : (f.included !== false)
        }));
      }
      
      if (typeof features === 'string') {
        const featureList = JSON.parse(features);
        if (Array.isArray(featureList)) {
          return featureList.map(f => ({
            text: typeof f === 'string' ? f : f.feature_text || f.text || f.name,
            included: typeof f === 'string' ? true : (f.is_included !== undefined ? f.is_included : f.included !== false)
          }));
        }
      }
      
      return [];
    } catch (e) {
      console.error('Error parsing features:', e);
      return [];
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const response = await planService.getPlanStats();
      
      const statsData = response.data || {};
      setStats({
        totalRevenue: statsData.totalRevenue || 0,
        activeSubscriptions: statsData.activeSubscriptions || 0,
        demoUsers: statsData.demoUsers || 0,
        paidUsers: statsData.paidUsers || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      id: '',
      name: '',
      icon: 'Building2',
      price: '',
      price_custom: false,
      period: 'per month',
      description: '',
      color: 'blue',
      is_popular: false,
      cameras_limit: '',
      users_limit: '',
      storage_limit: '',
      retention_limit: '',
      features: []
    });
    setShowModal(true);
  };

  const openEditModal = (plan) => {
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.rawData.name,
      icon: plan.rawData.icon || 'Building2',
      price: plan.rawData.price_custom ? '' : (plan.rawData.price || ''),
      price_custom: plan.rawData.price_custom || false,
      period: plan.rawData.period || 'per month',
      description: plan.rawData.description || '',
      color: plan.rawData.color || 'blue',
      is_popular: plan.rawData.is_popular || false,
      cameras_limit: plan.rawData.cameras_limit || '',
      users_limit: plan.rawData.users_limit || '',
      storage_limit: plan.rawData.storage_limit || '',
      retention_limit: plan.rawData.retention_limit || '',
      features: plan.features || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        price: formData.price_custom ? null : parseFloat(formData.price) || 0,
        features: formData.features.map((f, idx) => ({
          text: f.text,
          included: f.included,
          display_order: idx + 1
        }))
      };

      if (editingPlan) {
        await planService.updatePlan(editingPlan.id, planData);
        setSuccess('Plan updated successfully!');
      } else {
        await planService.createPlan(planData);
        setSuccess('Plan created successfully!');
      }

      setShowModal(false);
      loadPlans();
      loadStats();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving plan:', err);
      setError('Failed to save plan: ' + err.toString());
    }
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      return;
    }

    try {
      await planService.deletePlan(planId);
      setSuccess('Plan deleted successfully!');
      loadPlans();
      loadStats();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete plan: ' + err.toString());
    }
  };

  const addFeature = () => {
    if (newFeature.text.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, { ...newFeature }]
      }));
      setNewFeature({ text: '', included: true });
    }
  };

  const removeFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Plans</h1>
          <p className="text-gray-600">Manage pricing tiers and features</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Plan
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700 mt-1">{success}</p>
          </div>
        </div>
      )}

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
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : `$${stats.totalRevenue.toLocaleString()}`}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats.activeSubscriptions}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Paid Customers</p>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats.paidUsers}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Demo Users</p>
          <p className="text-2xl font-bold text-gray-900">
            {statsLoading ? '...' : stats.demoUsers}
          </p>
        </div>
      </div>

      {/* Pricing Plans */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h2>
        
        {plansLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <p className="text-gray-600">No plans available. Create your first plan!</p>
          </div>
        ) : (
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
                    <div className="text-center mb-6">
                      <div className={`w-16 h-16 ${colors.icon} rounded-full flex items-center justify-center mx-auto mb-4`}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                      
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

                    <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
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

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(plan)}
                        className={`flex-1 ${colors.button} text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2`}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan ID *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={!!editingPlan}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plan Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* Price & Period */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={formData.price_custom}
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.price_custom}
                        onChange={(e) => setFormData({ ...formData, price_custom: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Custom Pricing</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Period
                  </label>
                  <input
                    type="text"
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Color & Popular */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Theme
                  </label>
                  <select
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="blue">Blue</option>
                    <option value="purple">Purple</option>
                    <option value="green">Green</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_popular}
                      onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Mark as Popular</span>
                  </label>
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Limit
                  </label>
                  <input
                    type="text"
                    value={formData.cameras_limit}
                    onChange={(e) => setFormData({ ...formData, cameras_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10 or Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User Limit
                  </label>
                  <input
                    type="text"
                    value={formData.users_limit}
                    onChange={(e) => setFormData({ ...formData, users_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 5 or Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Storage Limit
                  </label>
                  <input
                    type="text"
                    value={formData.storage_limit}
                    onChange={(e) => setFormData({ ...formData, storage_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 100 GB"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Retention
                  </label>
                  <input
                    type="text"
                    value={formData.retention_limit}
                    onChange={(e) => setFormData({ ...formData, retention_limit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 30 days"
                  />
                </div>
              </div>

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>
                <div className="space-y-2 mb-3">
                  {formData.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={feature.included}
                        onChange={(e) => {
                          const updated = [...formData.features];
                          updated[idx].included = e.target.checked;
                          setFormData({ ...formData, features: updated });
                        }}
                        className="rounded"
                      />
                      <span className="flex-1 text-sm">{feature.text}</span>
                      <button
                        type="button"
                        onClick={() => removeFeature(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFeature.text}
                    onChange={(e) => setNewFeature({ ...newFeature, text: e.target.value })}
                    placeholder="Enter feature text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <label className="flex items-center gap-2 px-3">
                    <input
                      type="checkbox"
                      checked={newFeature.included}
                      onChange={(e) => setNewFeature({ ...newFeature, included: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-600">Included</span>
                  </label>
                  <button
                    type="button"
                    onClick={addFeature}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentPlansPage;