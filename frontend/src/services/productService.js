// src/services/productService.js
import api from './api';

const productService = {
  // Get all products with pagination and filters
  getProducts: async (params = {}) => {
    try {
      const { page = 1, limit = 10, search = '', isActive = '' } = params;
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(isActive !== '' && { is_active: isActive }),
      });      
      const response = await api.get(`/products?${queryParams}`);  
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      console.error('❌ Error response:', error.response);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error data:', error.response?.data);
      throw error.response?.data?.message || error.message || 'Failed to fetch products';
    }
  },

  // Get single product by ID
  getProductById: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}`);      
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching product:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch product';
    }
  },

  // Get active products (for dropdowns)
  getActiveProducts: async () => {
    try {           
      const response = await api.get('/products');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching active products:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch active products';
    }
  },

  // Create new product
  createProduct: async (productData) => {
    try {
      const response = await api.post('/products', productData);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating product:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to create product';
    }
  },

  // Update product
  updateProduct: async (productId, productData) => {
    try {
      const response = await api.put(`/products/${productId}`, productData);               
      return response.data;
    } catch (error) {
      console.error('❌ Error updating product:', error);
      console.error('❌ Error response:', error.response);
      throw error.response?.data?.message || error.message || 'Failed to update product';
    }
  },

  // Delete product (soft delete)
  deleteProduct: async (productId) => {
    try {
       
      const response = await api.delete(`/products/${productId}`);
           
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      throw error.response?.data?.message || error.message || 'Failed to delete product';
    }
  },

  // Get product statistics
  getProductStats: async (productId) => {
    try {
      const response = await api.get(`/products/${productId}/stats`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching product stats:', error);
      throw error.response?.data?.message || error.message || 'Failed to fetch product stats';
    }
  },
};

export default productService;