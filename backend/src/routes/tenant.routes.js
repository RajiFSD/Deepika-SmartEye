const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { extractTenantContext, allowSuperAdminAccess } = require('../middleware/tenantMiddleware');

// All routes require authentication
router.use(authenticateToken);

// Get current tenant info (any authenticated user)
router.get('/current', tenantController.getCurrentTenant);

// Super admin only routes
router.get('/', 
  authorizeRoles('super_admin'), 
  tenantController.getAllTenants
);

router.post('/', 
  authorizeRoles('super_admin'), 
  tenantController.createTenant
);

// Tenant-specific routes (super admin or tenant admin)
router.get('/:id', 
  extractTenantContext,
  allowSuperAdminAccess,
  tenantController.getTenantById
);

router.put('/:id', 
  extractTenantContext,
  authorizeRoles('super_admin', 'admin'),
  tenantController.updateTenant
);

router.delete('/:id', 
  authorizeRoles('super_admin'), 
  tenantController.deleteTenant
);

router.get('/:id/stats', 
  extractTenantContext,
  allowSuperAdminAccess,
  tenantController.getTenantStats
);

router.get('/:id/subscription-limits', 
  extractTenantContext,
  authorizeRoles('super_admin', 'admin'),
  tenantController.checkSubscriptionLimits
);

module.exports = router;