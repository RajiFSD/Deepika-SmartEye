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
import CameraManagementPage from './pages/CameraManagementPage';
import BranchManagementPage from './pages/BranchManagementPage';
import TenantManagementPage from './pages/TenantManagementPage';


function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
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
        {/* Public Routes */}
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

        {/* Protected Routes */}
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
          <Route path="zone-config" element={<ZoneDrawingPage />} />
          <Route path="violations" element={<ViolationList />} />
          <Route path="upload" element={<UploadAnalysisPage />} />
          <Route path="alerts" element={<AlertThresholdPage />} />
          <Route path="cameras" element={<CameraManagementPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="branches" element={<BranchManagementPage />} />
           <Route path="tenants" element={<TenantManagementPage />} />
        </Route>

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;