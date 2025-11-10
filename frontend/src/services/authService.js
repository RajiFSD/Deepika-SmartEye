import api from './api';

const authService = {

  login: async (email, password) => {
    try {
      console.log('🔵 Attempting login to:', api.defaults.baseURL + '/auth/login');
            
      const response = await api.post('/auth/login', { email, password });      
            
      const { user, token, refreshToken } = response.data.data;      
      
      // Store tokens and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
     
      const tenantData =  user.tenant.tenant_id;
     
      localStorage.setItem('tenantId', tenantData); 

     console.log("Login response--",response.data);
      
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
  const clearStorage = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('tenantId');
  };

  try {
    await api.post('/auth/logout');
  } catch (error) {
    console.error('Logout API failed:', error);
    // Optionally handle error message here
  } finally {
    clearStorage();
  }

  return { success: true };
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
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  },
};

export default authService;