import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Users, LogOut, Menu, X, Building2, UserSquare2, Camera, 
  Shield, LayoutDashboard , CreditCard, FileSpreadsheet , DollarSign , Layers } from 'lucide-react';
import { useState } from 'react';

function AdminWrapper({ setIsAdminAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
  //console.log('Admin User from localStorage:', adminUser);
  const userRole = adminUser?.role || 'viewer';
  //console.log('Admin User Role:', userRole);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdminAuth(false);
    navigate('/admin/login');
  };

  // 🎯 Define all possible menu items
  const allMenuItems = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'admin', 'manager', 'viewer'] },
    { path: '/admin/users', icon: Users, label: 'User Management', roles: ['super_admin', 'admin'] },
    { path: '/admin/tenants', icon: UserSquare2, label: 'Tenants', roles: ['super_admin'] },
    { path: '/admin/branches', icon: Building2, label: 'Branches', roles: ['super_admin', 'admin', 'manager'] },
    { path: '/admin/cameras', icon: Camera, label: 'Cameras', roles: ['super_admin', 'admin', 'manager'] },
    { path: '/admin/payments', icon: CreditCard, label: 'Payment Plans', roles: ['super_admin'] },
    { path: '/admin/subscriptions', icon: Layers, label: 'Subscriptions', roles: ['super_admin'] },

  ];

  // 🧩 Filter menu based on role
  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-lg z-40 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500 capitalize">{userRole} access</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-purple-100 text-purple-700 border-r-4 border-purple-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User Profile & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {adminUser.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{adminUser.full_name || 'Admin User'}</p>
                <p className="text-xs text-gray-500 truncate capitalize">{userRole}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 rounded-lg">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 capitalize">{userRole}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminWrapper;
