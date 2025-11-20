import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings, Upload, AlertCircle, FileText, 
  LogOut, Users, Menu, X, Camera, Building2, UserSquare2, Flame, Bell, Activity, 
  ChevronDown, ChevronRight, Shield, Package , FileSpreadsheet} from 'lucide-react';
import { useState } from 'react';
import authService from '../services/authService';

function PluginWrapper({ setIsAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    peopleCounting: false,
    smokeAlert: false,
    productDetection: false,
    admin: false  
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {    
    setIsAuthenticated(false);
    authService.logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const isActive = (path) => location.pathname === path;

  const menuSections = [
    {
      title: 'Main',
      items: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }
      ]
    }
  ];

  // Expandable Sections
  const expandableSections = [
    {
      id: 'peopleCounting',
      icon: Users,
      label: 'People Counting',
      items: [
        { path: '/zone-config', icon: Settings, label: 'Zone Config' },
        { path: '/peoplecounter', icon: Users, label: 'People Count' },       
        { path: '/upload', icon: Upload, label: 'Upload & Analyze' },
        { path: '/alerts', icon: AlertCircle, label: 'Alert Settings' },
        { path: '/camera-live', icon: Camera, label: 'Live View' },
        { path: '/violations', icon: Users, label: 'Detection Logs' },        
      ]
    },
    {
      id: 'fireAlert',
      icon: Flame,
      label: 'Fire Alert',
      items: [
        { path: '/smoke-detection', icon: Flame, label: 'Fire Detection' },
        { path: '/smoke-alerts', icon: Bell, label: 'Alert History' },
        { path: '/smoke-analytics', icon: Activity, label: 'Analytics' }
      ]
    },
    {
      id: 'productDetection',
      icon: Package,
      label: 'Product Detection',
      items: [
        { path: '/product-overview', icon: Package, label: 'Overview' },
        { path: '/product-catalog', icon: FileText, label: 'Product Catalog' },
        { path: '/product-detection', icon: Camera, label: 'Detection Logs' },
        { path: '/product-analytics', icon: Activity, label: 'Analytics' }
      ]
    },    
    {
      id: 'objectCounter',
      icon: Shield,
      label: 'Object Counting',
      items: [
        { path: '/object-counter', icon: UserSquare2, label: 'Object Counter' }
     
      ]
    },
       {
      id: 'testStream',
      icon: FileSpreadsheet,
      label: 'Test Live Stream',
      items: [
        { path: '/test-stream', icon: Flame, label: 'Live Stream' }
     
      ]
    },
  
  ];

  const systemSection = {
    title: 'System',
    items: [
      { path: '/reports', icon: FileText, label: 'Reports' }
    ]
  };

  // Check if user has admin access
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-lg z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 -translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">SmartEye AI</h1>
                <p className="text-xs text-gray-500">Security Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            {/* Main Section */}
            {menuSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                          isActive(item.path)
                            ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Modules Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
                Modules
              </h3>
              <div className="space-y-1">
                {expandableSections.map((section) => {
                  // Skip admin section if user doesn't have admin rights
                  if (section.requiresAdmin && !isAdmin) return null;

                  const SectionIcon = section.icon;
                  const isExpanded = expandedSections[section.id];
                  const hasActiveChild = section.items.some(item => isActive(item.path));

                  return (
                    <div key={section.id}>
                      {/* Parent Menu Item */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-colors ${
                          hasActiveChild
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <SectionIcon className="w-5 h-5" />
                          <span className="font-medium text-sm">{section.label}</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Child Menu Items */}
                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                                  isActive(item.path)
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* System Section */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">
                {systemSection.title}
              </h3>
              <div className="space-y-1">
                {systemSection.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? 'bg-blue-100 text-blue-700 border-r-4 border-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Profile & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {user.full_name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
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
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
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

export default PluginWrapper;