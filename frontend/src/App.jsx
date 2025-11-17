
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import PeopleCountDashboard from './pages/PeopleCountDashboard';
import ZoneDrawingPage from './pages/ZoneDrawingPage';
import ViolationList from './pages/ViolationList';
import UploadAnalysisPage from './pages/UploadAnalysisPage';
import AlertThresholdPage from './pages/AlertThresholdPage';
import ReportsPage from './pages/ReportsPage';
import PluginWrapper from './pages/PluginWrapper';
import CameraLiveViewPage from './pages/CameraLiveViewPage';
import ObjectCounterPage from './pages/ObjectCounterPage';

// Product Detection Pages
import ProductOverviewPage from './pages/ProductOverviewPage';
import ProductCatalogPage from './pages/ProductCatalogPage';
import ProductDetectionLogsPage from './pages/ProductDetectionLogsPage';
import ProductAnalyticsPage from './pages/ProductAnalyticsPage';
import FireDetectionPage from './smokepages/FireDetectionPage';

// Admin Pages
import AdminLoginPage from './adminPages/AdminLoginPage';
import AdminWrapper from './adminPages/AdminWrapper';
import AdminDashboardPage from './adminPages/AdminDashboardPage';
import UserManagementPage from './adminPages/UserManagementPage';
import TenantManagementPage from './adminPages/TenantManagementPage';
import BranchManagementPage from './adminPages/BranchManagementPage';
import CameraManagementPage from './adminPages/CameraManagementPage';
import PaymentPlansPage from './adminPages/PaymentPlansPage';
import SubscriptionsPage from './adminPages/SubscriptionsPage';

//Product - Config - Tenant
import ProductMasterPage from './adminPages/ProductMasterPage';
import ProductConfigPage from './adminPages/ProductConfigPage';
import ProductTenantMappingPage from './adminPages/ProductTenantMappingPage';

import TestCameraStream from './smokepages/TestCameraStream';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }

    // Check admin auth
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      setIsAdminAuth(true);
    }

    setLoading(false);
  }, []);

  // Add this: Listen for storage changes
  useEffect(() => {
  const handleStorageChange = () => {
    const token = localStorage.getItem('authToken');
    const adminToken = localStorage.getItem('adminToken');
    
    setIsAuthenticated(!!token);
    setIsAdminAuth(!!adminToken);
  };

  window.addEventListener('storage', handleStorageChange);
  
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
}, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage setIsAuthenticated={setIsAuthenticated} />
            )
          } 
        />

        {/* ==================== ADMIN ROUTES ==================== */}
        {/* Admin Login */}
        <Route 
          path="/admin/login" 
          element={
            isAdminAuth ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <AdminLoginPage setIsAdminAuth={setIsAdminAuth} />
            )
          } 
        />

        {/* Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            isAdminAuth ? (
              <AdminWrapper setIsAdminAuth={setIsAdminAuth} />
            ) : (
              <Navigate to="/admin/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<UserManagementPage setIsAdminAuth={setIsAdminAuth} />} />
          <Route path="tenants" element={<TenantManagementPage />} />
          <Route path="branches" element={<BranchManagementPage />} />
          <Route path="cameras" element={<CameraManagementPage />} />
          <Route path="payments" element={<PaymentPlansPage />} />
          <Route path="subscriptions" element={<SubscriptionsPage />} />
           <Route path="product-master" element={<ProductMasterPage />} />
          <Route path="product-config" element={<ProductConfigPage />} />
          <Route path="product-tenant-mapping" element={<ProductTenantMappingPage />} />
        </Route>

        {/* ==================== USER PROTECTED ROUTES ==================== */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <PluginWrapper setIsAuthenticated={setIsAuthenticated} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<PeopleCountDashboard />} />
          
          {/* People Counting Module */}
          <Route path="zone-config" element={<ZoneDrawingPage />} />
          <Route path="violations" element={<ViolationList />} />
          <Route path="upload" element={<UploadAnalysisPage />} />
          <Route path="alerts" element={<AlertThresholdPage />} />
          <Route path="camera-live" element={<CameraLiveViewPage />} />
          <Route path="object-counter" element={<ObjectCounterPage />} />
          
          {/* Smoke Alert Module */}
          <Route path="smoke-detection" element={<FireDetectionPage/>} />
          <Route path="smoke-alerts" element={<div>Smoke Alerts Page</div>} />
          <Route path="smoke-analytics" element={<div>Smoke Analytics Page</div>} />
          <Route path="/fire-detection" element={<FireDetectionPage />} />

           <Route path="test-stream" element={<TestCameraStream />} />
          
          {/* Product Detection Module */}
          <Route path="product-overview" element={<ProductOverviewPage />} />
          <Route path="product-catalog" element={<ProductCatalogPage />} />
          <Route path="product-detection" element={<ProductDetectionLogsPage />} />
          <Route path="product-analytics" element={<ProductAnalyticsPage />} />

         
         
          {/* System */}
          <Route path="reports" element={<ReportsPage />} />
        </Route>
        {/* ==================== FALLBACK ROUTE ==================== */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;