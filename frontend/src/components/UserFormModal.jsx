import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import adminService from '../services/adminService';
import tenantService from '../services/tenantService';

function UserFormModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    tenant_id: '',
    branch_id: '',
    role_id: '',
    is_active: true
  });
  
  const [currentTenant, setCurrentTenant] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingTenant, setLoadingTenant] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Get logged-in user's tenant_id from localStorage
  const getLoggedInUserTenantId = () => {
    try {
      const tenantid = localStorage.getItem('tenantId');
      return tenantid;  
    } catch (error) {
      console.error('Error parsing user data:', error);
    }
    return null;
  };

  const loggedInTenantId = getLoggedInUserTenantId();

  // Fetch the logged-in user's tenant
  useEffect(() => {
    const fetchCurrentTenant = async () => {
      if (!loggedInTenantId) return;

      try {
        setLoadingTenant(true);      
        const response = await tenantService.getTenantById(loggedInTenantId);    
        setCurrentTenant(response.data || response.tenant);
      } catch (error) {
        console.error('Error fetching tenant:', error);
      } finally {
        setLoadingTenant(false);
      }
    };

    fetchCurrentTenant();
  }, [loggedInTenantId]);

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        full_name: user.full_name || '',
        password: '',
        tenant_id: user.tenant_id || '',
        branch_id: user.branch_id || '',
        role_id: user.role_id || '',
        is_active: user.is_active ?? true
      });
      
      if (user.tenant_id) {
        loadBranches(user.tenant_id);
      }
    } else {
      // For new users, automatically set the logged-in user's tenant
      if (loggedInTenantId) {
        setFormData(prev => ({
          ...prev,
          tenant_id: parseInt(loggedInTenantId)
        }));
        loadBranches(loggedInTenantId);
      }
    }
  }, [user, loggedInTenantId]);

  const loadBranches = async (tenantId) => {
    if (!tenantId) {
      setBranches([]);
      return;
    }

    try {
      setLoadingBranches(true);   
      const response = await adminService.getBranchesByTenant(tenantId);
      setBranches(response.data || []);
    } catch (error) {
      console.error('Error loading branches:', error);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username?.trim()) newErrors.username = 'Username is required';
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.full_name?.trim()) newErrors.full_name = 'Full name is required';
    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.tenant_id) newErrors.tenant_id = 'Tenant is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const submitData = { ...formData };
      if (user && !submitData.password) delete submitData.password;

      if (user) {
        await adminService.updateUser(user.user_id, submitData);
      } else {
        await adminService.createUser(submitData);
      }
      onSave();
    } catch (error) {
      console.error('Error saving user:', error);
      setErrors({ submit: error.message || 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {user ? 'Edit User' : 'Add New User'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">{errors.submit}</div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.username ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.full_name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {!user && '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder={user ? 'Leave blank to keep current password' : 'Enter password'}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
              <input
                type="text"
                value={loadingTenant ? 'Loading...' : (currentTenant?.tenant_name || 'No tenant')}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">Users can only be created within your organization</p>
              {errors.tenant_id && <p className="text-xs text-red-600 mt-1">{errors.tenant_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
              <select
                value={formData.branch_id}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                disabled={!formData.tenant_id || loadingBranches}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.branch_id} value={branch.branch_id}>
                    {branch.branch_name} {branch.city && `- ${branch.city}`}
                  </option>
                ))}
              </select>
              {loadingBranches && <p className="text-xs text-gray-500 mt-1">Loading branches...</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={formData.role_id}
                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select Role</option>
                <option value="1">Super Admin</option>
                <option value="2">Admin</option>
                <option value="3">Manager</option>
                <option value="4">Viewer</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-7">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                Active User
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {user ? 'Update User' : 'Create User'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserFormModal;