const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { extractTenantContext } = require('../middleware/tenantMiddleware');

// All routes require authentication and tenant context
router.use(authenticateToken);
router.use(extractTenantContext);

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get active branches (for dropdowns) - MUST BE BEFORE /:id
router.get('/active', branchController.getActiveBranches);

// Get all branches for current tenant
router.get('/', branchController.getBranchesByTenant);

// Get branch statistics - MUST BE BEFORE /:id to avoid conflicts
router.get('/:id/stats', branchController.getBranchStats);

// Get branch by ID - This catches all other /:id patterns
router.get('/:id', branchController.getBranchById);

// Create new branch (admin only)
router.post('/', 
  authorizeRoles('super_admin', 'admin'), 
  branchController.createBranch
);

// Update branch (admin only)
router.put('/:id', 
  authorizeRoles('super_admin', 'admin'), 
  branchController.updateBranch
);

// Delete branch (admin only)
router.delete('/:id', 
  authorizeRoles('super_admin', 'admin'), 
  branchController.deleteBranch
);

module.exports = router;