// ==========================================
// 4. BACKEND: Admin Controller (adminController.js)
// ==========================================
const { User, Tenant } = require('@models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const authService = require('@services/authService');
const ResponseHandler = require('@utils/responseHandler');

class AdminController {
  // Admin login (reuses auth service but checks role)
  async adminLogin(req, res) {
    try {
      const result = await authService.login(req.body);
      console.log('Admin login attempt for:', result.user.email);
      console.log('User role:', result.user.role);
      // Check if user has admin privileges
      if (result.user.role !== 'super_admin' && result.user.role !== 'admin') {
        return ResponseHandler.forbidden(res, 'Admin privileges required');
      }

      return ResponseHandler.success(res, result, 'Admin login successful');
    } catch (error) {
      return ResponseHandler.unauthorized(res, error.message);
    }
  }

  // Get all users
  async getAllUsers(req, res) {
    try {
      console.log('Fetching all users with filters:', req.query);
      const { search, role, tenant_id, is_active } = req.query;
      
      const where = {};
      if (role) where.role = role;
      if (tenant_id) where.tenant_id = tenant_id;
      if (is_active !== undefined) where.is_active = is_active === 'true';
      
      // Search by name or email
      if (search) {
        where[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } }
        ];
      }

      const users = await User.findAll({
        where,
        include: [{
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'tenant_name']
        }],
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']]
      });

      return ResponseHandler.success(res, users);
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // Get user by ID
  async getUserById(req, res) {
    try {
      const user = await User.findByPk(req.params.userId, {
        include: [{
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'tenant_name']
        }],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      return ResponseHandler.success(res, user);
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
  
  // ✅ NEW: Get user count by tenant ID
  async getUserCountByTenantId(req, res) {
    try {
      const { tenantId } = req.params;
      
      console.log('Fetching user count for tenant:', tenantId);

      const count = await User.count({
        where: { 
          tenant_id: tenantId,
          is_active: true // Only count active users
        }
      });

      return ResponseHandler.success(res, { 
        tenant_id: tenantId,
        user_count: count 
      });
    } catch (error) {
      console.error('Error in getUserCountByTenantId:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

   // ✅ NEW: Get users by tenant ID
  async getUsersByTenantId(req, res) {
    try {
      const { tenantId } = req.params;
      const { search, role, is_active, page = 1, limit = 10 } = req.query;
      
      console.log('Fetching users for tenant:', tenantId);

      // Verify tenant exists
      const tenant = await Tenant.findByPk(tenantId);
      if (!tenant) {
        return ResponseHandler.notFound(res, 'Tenant not found');
      }

      const where = { tenant_id: tenantId };
      if (role) where.role = role;
      if (is_active !== undefined) where.is_active = is_active === 'true';
      
      // Search by name or email
      if (search) {
        where[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } }
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: users } = await User.findAndCountAll({
        where,
        include: [{
          model: Tenant,
          as: 'tenant',
          attributes: ['tenant_id', 'tenant_name', 'tenant_code']
        }],
        attributes: { exclude: ['password_hash'] },
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset
      });

      return ResponseHandler.success(res, {
        users,
        tenant: {
          tenant_id: tenant.tenant_id,
          tenant_name: tenant.tenant_name,
          tenant_code: tenant.tenant_code
        },
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Error in getUsersByTenantId:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // Create new user
  async createUser(req, res) {
    try {
      const { username, email, password, full_name, role, tenant_id, is_active } = req.body;

      // Validate required fields
      if (!username || !email || !password || !tenant_id) {
        return ResponseHandler.badRequest(res, 'Missing required fields: username, email, password, tenant_id');
      }

      // Check if email or username already exists
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [{ email }, { username }]
        }
      });

      if (existingUser) {
        return ResponseHandler.badRequest(res, 'Email or username already exists');
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Create user
      const user = await User.create({
        username,
        email,
        password_hash,
        full_name,
        role: role || 'viewer',
        tenant_id,
        is_active: is_active !== undefined ? is_active : true
      });

      // Return user without password
      const userResponse = user.toJSON();
      delete userResponse.password_hash;

      return ResponseHandler.created(res, userResponse, 'User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // Update user
  async updateUser(req, res) {
    try {
      const { userId } = req.params;
      const { username, email, password, full_name, role, tenant_id, is_active } = req.body;

      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      // Prepare update data
      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (full_name) updateData.full_name = full_name;
      if (role) updateData.role = role;
      if (tenant_id) updateData.tenant_id = tenant_id;
      if (is_active !== undefined) updateData.is_active = is_active;

      // Hash new password if provided
      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 12);
      }

      await user.update(updateData);

      // Return updated user without password
      const userResponse = user.toJSON();
      delete userResponse.password_hash;

      return ResponseHandler.success(res, userResponse, 'User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // Delete user
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // Prevent deleting yourself
      if (req.user.user_id === parseInt(userId)) {
        return ResponseHandler.badRequest(res, 'Cannot delete your own account');
      }

      const user = await User.findByPk(userId);
      if (!user) {
        return ResponseHandler.notFound(res, 'User not found');
      }

      await user.destroy();

      return ResponseHandler.success(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  // Get all tenants (for user creation dropdown)
  async getAllTenants(req, res) {
    try {
      const tenants = await Tenant.findAll({
        attributes: ['tenant_id', 'tenant_name', 'is_active'],
        where: { is_active: true },
        order: [['tenant_name', 'ASC']]
      });

      return ResponseHandler.success(res, tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new AdminController();