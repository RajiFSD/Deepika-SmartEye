import axios from 'axios';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  LogOut,
  Menu,
  X,
  Building2,
  UserSquare2,
  Camera,
  Shield,
  LayoutDashboard,
} from 'lucide-react';

function AdminWrapper({ setIsAdminAuth }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ✅ Initialize user with default role
  const [user, setUser] = useState(() => {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    const userRole = adminUser?.role || 'viewer';
    return { ...adminUser, role: userRole };
  });

  const userRole = user.role || 'viewer';
  const [menuItems, setMenuItems] = useState([]);

  // ✅ Handle logout
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setIsAdminAuth(false);
    navigate('/admin/login');
  };

  // ✅ Fetch role-based menu from API
  useEffect(() => {
    if (user?.role) {
      axios
        .get(`/api/role-plugin?role_name=${user.role}`)
        .then((res) => {
          setMenuItems(res.data || []);
        })
        .catch((err) => console.error('Error fetching role menu:', err));
    }
  }, [user]);

  // ✅ Active path checker
  const isActive = (path) => location.pathname === path;

  // ✅ Menu item component
  const MenuItem = ({ label, path, Icon }) => (
    <button
      onClick={() => navigate(path)}
      className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive(path)
          ? 'bg-purple-100 text-purple-700'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      {Icon && <Icon className="w-5 h-5 mr-3" />}
      {label}
    </button>
  );

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
              {menuItems.length > 0 ? (
                menuItems.map((item) => (
                  <MenuItem
                    key={item.screen_name}
                    label={item.screen_name}
                    path={item.path || '/admin/dashboard'}
                    Icon={
                      item.icon === 'Users'
                        ? Users
                        : item.icon === 'Building2'
                        ? Building2
                        : item.icon === 'Camera'
                        ? Camera
                        : item.icon === 'Shield'
                        ? Shield
                        : LayoutDashboard
                    }
                  />
                ))
              ) : (
                <p className="text-gray-400 text-sm px-4">No menu available</p>
              )}
            </div>
          </nav>

          {/* User Profile & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || 'Admin User'}
                </p>
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
