const jwt = require('jsonwebtoken');
const ResponseHandler = require('@utils/responseHandler');

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return ResponseHandler.unauthorized(res, 'Access token required');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err.message);
        return ResponseHandler.unauthorized(res, 'Invalid or expired token');
      }

      // ✅ Attach decoded token data to request
      req.user = decoded;
      console.log('✅ Authenticated user:', decoded.email, 'Role:', decoded.role);
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return ResponseHandler.unauthorized(res, 'Authentication failed');
  }
};

/**
 * Middleware to authorize specific roles
 * Usage: authorizeRoles('super_admin', 'admin')
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ResponseHandler.unauthorized(res, 'User not authenticated');
      }

      // ✅ Check if user's role is in the allowed roles
      const userRole = req.user.role; // This comes from JWT token
      
      console.log('🔐 Checking authorization:', {
        userRole,
        allowedRoles,
        hasAccess: allowedRoles.includes(userRole)
      });

      if (!userRole || !allowedRoles.includes(userRole)) {
        console.log('❌ Access denied for role:', userRole);
        return ResponseHandler.forbidden(res, 'Insufficient permissions');
      }

      console.log('✅ Access granted for role:', userRole);
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return ResponseHandler.forbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Middleware to check if user has access to a specific screen
 */
const authorizeScreen = (screenName) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ResponseHandler.unauthorized(res, 'User not authenticated');
      }

      // ✅ Check if user has access to the screen
      const userScreens = req.user.screens || [];
      
      console.log('🖥️ Checking screen access:', {
        screenName,
        userScreens,
        hasAccess: userScreens.includes(screenName)
      });

      if (!userScreens.includes(screenName)) {
        return ResponseHandler.forbidden(res, `Access denied to ${screenName}`);
      }

      next();
    } catch (error) {
      console.error('Screen authorization error:', error);
      return ResponseHandler.forbidden(res, 'Authorization failed');
    }
  };
};

/**
 * Middleware to check if user belongs to a specific tenant
 */
const validateTenantAccess = (req, res, next) => {
  try {
    const requestedTenantId = parseInt(req.params.tenantId || req.params.id);
    const userTenantId = req.user.tenant_id;
    const userRole = req.user.role;

    // Super admins can access any tenant
    if (userRole === 'super_admin') {
      return next();
    }

    // Regular users can only access their own tenant
    if (requestedTenantId !== userTenantId) {
      return ResponseHandler.forbidden(res, 'Access denied to this tenant');
    }

    next();
  } catch (error) {
    console.error('Tenant validation error:', error);
    return ResponseHandler.forbidden(res, 'Tenant access validation failed');
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeScreen,
  validateTenantAccess
};