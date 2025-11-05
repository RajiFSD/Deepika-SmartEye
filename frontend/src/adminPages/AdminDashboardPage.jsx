import { useState, useEffect } from 'react';
import { Users, Building2, Camera, UserSquare2, TrendingUp, Activity, AlertCircle, CheckCircle } from 'lucide-react';

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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      // Load users
      const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersResponse.json();
      
      // Load tenants
      const tenantsResponse = await fetch('http://localhost:3000/api/admin/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const tenantsData = await tenantsResponse.json();

      // Load branches
      const branchesResponse = await fetch('http://localhost:3000/api/admin/branches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const branchesData = await branchesResponse.json();

      // Load cameras
      const camerasResponse = await fetch('http://localhost:3000/api/admin/cameras', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const camerasData = await camerasResponse.json();

      setStats({
        totalUsers: usersData.data?.length || 0,
        activeUsers: usersData.data?.filter(u => u.is_active).length || 0,
        totalTenants: tenantsData.data?.length || 0,
        totalBranches: branchesData.data?.length || 0,
        totalCameras: camerasData.data?.length || 0,
        activeCameras: camerasData.data?.filter(c => c.is_active).length || 0
      });

      // Mock recent activities
      setRecentActivities([
        { id: 1, type: 'user', action: 'New user created', user: 'John Doe', time: '5 minutes ago' },
        { id: 2, type: 'camera', action: 'Camera added', user: 'Camera 12', time: '15 minutes ago' },
        { id: 3, type: 'tenant', action: 'Tenant updated', user: 'ABC Corp', time: '1 hour ago' },
        { id: 4, type: 'branch', action: 'Branch created', user: 'Downtown Store', time: '2 hours ago' },
        { id: 5, type: 'user', action: 'User role changed', user: 'Jane Smith', time: '3 hours ago' }
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600">System overview and management</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Users */}
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

        {/* Tenants */}
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

        {/* Branches */}
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

        {/* Cameras */}
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

        {/* System Health */}
        <div className="bg-white rounded-lg shadow-sm p-6 col-span-1 md:col-span-2">
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
          <p className="text-sm text-gray-600">Latest system events and changes</p>
        </div>
        <div className="p-6">
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
        </div>
      </div>
    </div>
  );
}

export default AdminDashboardPage;