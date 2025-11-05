import api from './api';

const authService = {
  // Login user
  login: async (email, password) => {
    try {
      console.log('🔵 Attempting login to:', api.defaults.baseURL + '/auth/login');
      console.log('🔵 Credentials:', { email, password: '***' });
      
      const response = await api.post('/auth/login', { email, password });
      
      console.log('✅ Login response:', response.data);
      
      const { user, token, refreshToken } = response.data.data;
      
      // Store tokens and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      
      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Login failed';
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Registration failed';
    }
  },

  // Logout user
  logout: async () => {
    try {
      await api.post('/auth/logout');
      
      // Clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      // Even if API call fails, clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      throw error.response?.data?.message || 'Logout failed';
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to send reset email';
    }
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    try {
      const response = await api.post('/auth/reset-password', { 
        token, 
        newPassword 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Password reset failed';
    }
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    console.log('Current user string from localStorage:', userStr);
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
};

export default authService;