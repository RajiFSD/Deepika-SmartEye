const express = require('express');
const router = express.Router();
const alertThresholdController = require('../controllers/alertThresholdController');

// Base CRUD
router.post('/', alertThresholdController.create);
router.get('/', alertThresholdController.getAll);
router.get('/:id', alertThresholdController.getById);
router.put('/:id', alertThresholdController.update);
router.delete('/:id', alertThresholdController.remove);

// Convenience filters
router.get('/camera/:cameraId', alertThresholdController.getByCamera);
router.get('/tenant/:tenantId', alertThresholdController.getByTenant);

module.exports = router;
