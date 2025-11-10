import { useState, useEffect } from 'react';
import { Users, Building2, Camera, UserSquare2, TrendingUp, Activity, AlertCircle, Shield } from 'lucide-react';
import adminService from '../services/adminService';
import branchService from '../services/branchService';
import cameraService from '../services/cameraService';
import tenantService from '../services/tenantService';

function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTenants: 0,
    totalBranches: 0,
    totalCameras: 0,
    activeCameras: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState({
    apiStatus: 'online',
    databaseStatus: 'online',
    cameraStatus: 'operational',
    aiModuleStatus: 'running'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const tenantId = localStorage.getItem('tenantId') || null;

  useEffect(() => {
    // Get current user from localStorage
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}'); 
    setCurrentUser(adminUser);
    console.log('👤 Current user role:', adminUser.role);
    loadDashboardData(adminUser);
  }, []);

  const loadDashboardData = async (user) => {
    try {
      setLoading(true);
      setError('');

      const userRole = user?.role || user?.role_details?.role_name;
      const isSuperAdmin = userRole === 'super_admin';    
   

      // Build data loading promises based on role
      const dataPromises = [];
      const dataKeys = [];

      // Super admin can see everything
      if (isSuperAdmin) {
        dataPromises.push(        
          adminService.getUsersByTenantId(tenantId),
          tenantService.getAllTenants({ limit: 1000 }),
          branchService.getBranches({ limit: 1000 }),         
          cameraService.getCamerasByTenant(tenantId, { limit: 1000 }),
        );
        dataKeys.push('users', 'tenants', 'branches', 'cameras');
      } else {
        // Regular admin can only see branches and cameras
        dataPromises.push(
          branchService.getBranches({ limit: 1000 }),      
          cameraService.getCamerasByTenant(tenantId, { limit: 1000 }),
        );
        dataKeys.push('branches', 'cameras');
      }

      const results = await Promise.all(dataPromises);
      
      // Map results to their respective keys
      const dataMap = {};
      dataKeys.forEach((key, index) => {
        dataMap[key] = results[index];
      });

      // Extract data with fallbacks
      const userList = dataMap.users?.data?.users || [];
      const tenantList = dataMap.tenants?.data?.tenants || [];
      const branchList = dataMap.branches?.data?.branches || [];
      const cameraList = dataMap.cameras?.data?.cameras || [];

      // Update stats based on role
      if (isSuperAdmin) {
        setStats({
          totalUsers: userList.length,
          activeUsers: userList.filter(u => u.is_active).length,
          totalTenants: tenantList.length,
          totalBranches: branchList.length,
          totalCameras: cameraList.length,
          activeCameras: cameraList.filter(c => c.is_active).length
        });
      } else {
        // Admin only sees branches and cameras
        setStats({
          totalUsers: 0, // Hidden for admin
          activeUsers: 0,
          totalTenants: 0, // Hidden for admin
          totalBranches: branchList.length,
          totalCameras: cameraList.length,
          activeCameras: cameraList.filter(c => c.is_active).length
        });
      }

      // Build recent activities from available data
      const activities = buildActivities(userList, tenantList, branchList, cameraList, isSuperAdmin);
      setRecentActivities(activities);

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(typeof error === 'string' ? error : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const buildActivities = (userList, tenantList, branchList, cameraList, isSuperAdmin) => {
    const activities = [];
    let activityId = 1;

    const getTimeAgo = (dateString) => {
      if (!dateString) return 'Recently';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    };

    // Add user activities (super admin only)
    if (isSuperAdmin && userList.length > 0) {
      const sortedUsers = [...userList].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestUser = sortedUsers[0];
      activities.push({
        id: activityId++,
        type: 'user',
        action: 'New user created',
        user: latestUser.full_name || latestUser.username || 'Unknown User',
        time: getTimeAgo(latestUser.created_at),
        timestamp: new Date(latestUser.created_at || 0)
      });
    }

    // Add camera activities (all roles)
    if (cameraList.length > 0) {
      const sortedCameras = [...cameraList].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestCamera = sortedCameras[0];
      activities.push({
        id: activityId++,
        type: 'camera',
        action: 'Camera added',
        user: latestCamera.camera_name || 'Unknown Camera',
        time: getTimeAgo(latestCamera.created_at),
        timestamp: new Date(latestCamera.created_at || 0)
      });
    }

    // Add tenant activities (super admin only)
    if (isSuperAdmin && tenantList.length > 0) {
      const sortedTenants = [...tenantList].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestTenant = sortedTenants[0];
      activities.push({
        id: activityId++,
        type: 'tenant',
        action: 'Tenant updated',
        user: latestTenant.tenant_name || 'Unknown Tenant',
        time: getTimeAgo(latestTenant.updated_at || latestTenant.created_at),
        timestamp: new Date(latestTenant.updated_at || latestTenant.created_at || 0)
      });
    }

    // Add branch activities (all roles)
    if (branchList.length > 0) {
      const sortedBranches = [...branchList].sort((a, b) => 
        new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
      const latestBranch = sortedBranches[0];
      activities.push({
        id: activityId++,
        type: 'branch',
        action: 'Branch created',
        user: latestBranch.branch_name || latestBranch.state || 'Unknown Branch',
        time: getTimeAgo(latestBranch.created_at),
        timestamp: new Date(latestBranch.created_at || 0)
      });
    }

    // Sort all activities by timestamp (most recent first) and take top 5
    return activities
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'camera': return <Camera className="w-4 h-4" />;
      case 'tenant': return <UserSquare2 className="w-4 h-4" />;
      case 'branch': return <Building2 className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
      case 'operational':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'offline':
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Error Loading Dashboard</p>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={() => loadDashboardData(currentUser)}
            className="mt-2 text-sm text-red-700 underline hover:text-red-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const userRole = currentUser?.role || currentUser?.role_details?.role_name;
  const isSuperAdmin = userRole === 'super_admin';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-gray-600">System overview and management</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 rounded-lg">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-purple-900 capitalize">{userRole}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Users - Super Admin Only */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            <p className="text-xs text-green-600 mt-2">{stats.activeUsers} active</p>
          </div>
        )}

        {/* Tenants - Super Admin Only */}
        {isSuperAdmin && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserSquare2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTenants}</p>
            <p className="text-xs text-gray-500 mt-2">Organizations</p>
          </div>
        )}

        {/* Branches - All Roles */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Branches</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalBranches}</p>
          <p className="text-xs text-gray-500 mt-2">Locations</p>
        </div>

        {/* Cameras - All Roles */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Cameras</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCameras}</p>
          <p className="text-xs text-green-600 mt-2">{stats.activeCameras} active</p>
        </div>

        {/* System Health - All Roles */}
        <div className={`bg-white rounded-lg shadow-sm p-6 ${isSuperAdmin ? 'col-span-1 md:col-span-2' : 'col-span-1 md:col-span-2 lg:col-span-2'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">System Health</h3>
              <p className="text-sm text-gray-600">All systems operational</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">API Server</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(systemHealth.apiStatus)}`}>
                {systemHealth.apiStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Database</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(systemHealth.databaseStatus)}`}>
                {systemHealth.databaseStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">Cameras</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(systemHealth.cameraStatus)}`}>
                {systemHealth.cameraStatus}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">AI Module</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(systemHealth.aiModuleStatus)}`}>
                {systemHealth.aiModuleStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Recent Activities</h2>
          <p className="text-sm text-gray-600">
            {isSuperAdmin 
              ? 'Latest system events and changes' 
              : 'Latest branch and camera activities'}
          </p>
        </div>
        <div className="p-6">
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === 'user' ? 'bg-blue-100 text-blue-600' :
                    activity.type === 'camera' ? 'bg-orange-100 text-orange-600' :
                    activity.type === 'tenant' ? 'bg-purple-100 text-purple-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No recent activities</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;