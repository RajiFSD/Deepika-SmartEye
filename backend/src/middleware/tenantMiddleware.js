const { Tenant } = require('@models');

/**
 * Middleware to extract and validate tenant context from authenticated user
 * Attaches tenant information to the request object
 */
const extractTenantContext = async (req, res, next) => {
  try {
    // Tenant ID comes from authenticated user (set by auth middleware)
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant context missing',
        message: 'Unable to determine tenant from request'
      });
    }

    // Fetch tenant details
    const tenant = await Tenant.findByPk(tenantId);

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        message: 'The specified tenant does not exist'
      });
    }

    if (!tenant.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Tenant inactive',
        message: 'This tenant account has been deactivated'
      });
    }

    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.tenant_id;

    next();
  } catch (error) {
    console.error('Error in tenant middleware:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to process tenant context'
    });
  }
};

/**
 * Middleware to validate tenant from header (optional alternative method)
 * Useful for API integrations where tenant is specified in header
 */
const extractTenantFromHeader = async (req, res, next) => {
  try {
    const tenantCode = req.headers['x-tenant-code'] || req.headers['tenant-code'];

    if (!tenantCode) {
      return res.status(400).json({
        success: false,
        error: 'Tenant code required',
        message: 'Please provide tenant code in request header'
      });
    }

    const tenant = await Tenant.findOne({
      where: { tenant_code: tenantCode, is_active: true }
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Invalid tenant',
        message: 'Tenant not found or inactive'
      });
    }

    req.tenant = tenant;
    req.tenantId = tenant.tenant_id;

    next();
  } catch (error) {
    console.error('Error extracting tenant from header:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to validate tenant'
    });
  }
};

/**
 * Middleware to ensure user belongs to the requested tenant
 * Prevents cross-tenant data access
 */
const validateTenantOwnership = (req, res, next) => {
  const userTenantId = req.user?.tenant_id;
  const requestTenantId = req.tenantId || req.params.tenant_id;

  if (!userTenantId || !requestTenantId) {
    return res.status(400).json({
      success: false,
      error: 'Tenant validation failed',
      message: 'Missing tenant information'
    });
  }

  if (parseInt(userTenantId) !== parseInt(requestTenantId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have access to this tenant\'s resources'
    });
  }

  next();
};

/**
 * Middleware for super admin to access any tenant
 * Super admins can bypass tenant restrictions
 */
const allowSuperAdminAccess = (req, res, next) => {
  const userRole = req.user?.role;

  // If super admin, allow access to any tenant
  if (userRole === 'super_admin') {
    return next();
  }

  // Otherwise, validate tenant ownership
  return validateTenantOwnership(req, res, next);
};

module.exports = {
  extractTenantContext,
  extractTenantFromHeader,
  validateTenantOwnership,
  allowSuperAdminAccess
};