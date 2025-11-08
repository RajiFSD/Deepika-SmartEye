// ==========================================
// 3. BACKEND: Admin Routes (adminRoutes.js)
// ==========================================
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

console.log('Admin routes loaded');

// Admin auth (uses same login, but checks role)
router.post('/auth/login', adminController.adminLogin);

// Protected admin routes (requires admin role)
router.use(authenticateToken);
router.use(authorizeRoles('admin', 'super_admin'));

// User management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserById);
router.post('/users', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// Tenant management (for user creation)
router.get('/tenants', adminController.getAllTenants);

module.exports = router;