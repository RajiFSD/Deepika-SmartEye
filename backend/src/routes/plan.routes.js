const express = require('express');
const router = express.Router();
const planController = require('../controllers/planController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Public routes (any authenticated user can view plans)
router.get('/', planController.getAllPlans);
router.get('/:id', planController.getPlanById);
router.get('/:id/subscribers', planController.getSubscribersByPlan);

// Super admin only routes
router.post('/', 
  authorizeRoles('super_admin'), 
  planController.createPlan
);

router.put('/:id', 
  authorizeRoles('super_admin'), 
  planController.updatePlan
);

router.delete('/:id', 
  authorizeRoles('super_admin'), 
  planController.deletePlan
);

router.get('/statistics/all', 
  authorizeRoles('super_admin'), 
  planController.getPlanStats
);

module.exports = router;