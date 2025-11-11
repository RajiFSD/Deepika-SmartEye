const { User, Tenant, Branch, RolePlugin } = require('@models');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

class AdminService {
  /**
   * Get all users with branch and tenant info
   */
  async getUsers({ page = 1, limit = 100, search = '', role = '', tenantId = null }) {
    try {
      const offset = (page - 1) * limit;
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { username: { [Op.like]: `%${search}%` } }
        ];
      }

      if (role && role !== 'all') {
        whereClause.role_id = role;
      }

      if (tenantId) {
        whereClause.tenant_id = tenantId;
      }

      const { count, rows } = await User.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [['created_at', 'DESC']],
        attributes: { exclude: ['password_hash'] },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'city'],
            required: false
          },
          {
            model: RolePlugin,
            as: 'role',
            attributes: ['role_id', 'role_name', 'screen_name'],
            required: false
          }
        ]
      });

      return {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] },
        include: [
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['tenant_id', 'tenant_name', 'tenant_code']
          },
          {
            model: Branch,
            as: 'branch',
            attributes: ['branch_id', 'branch_name', 'branch_code', 'city']
          },
          {
            model: RolePlugin,
            as: 'role',
            attributes: ['role_id', 'role_name', 'description']
          }
        ]
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    try {
      // Check if email already exists
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Check if username already exists
      const existingUsername = await User.findOne({
        where: { username: userData.username }
      });

      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Validate branch belongs to tenant
      if (userData.branch_id && userData.tenant_id) {
        const branch = await Branch.findOne({
          where: {
            branch_id: userData.branch_id,
            tenant_id: userData.tenant_id
          }
        });

        if (!branch) {
          throw new Error('Branch does not belong to the specified tenant');
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12);

      const user = await User.create({
        ...userData,
        password_hash: hashedPassword
      });

      // Fetch created user with associations
      return await this.getUserById(user.user_id);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, updateData) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Check email uniqueness if updating
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await User.findOne({
          where: {
            email: updateData.email,
            user_id: { [Op.ne]: userId }
          }
        });

        if (existingUser) {
          throw new Error('Email already exists');
        }
      }

      // Check username uniqueness if updating
      if (updateData.username && updateData.username !== user.username) {
        const existingUsername = await User.findOne({
          where: {
            username: updateData.username,
            user_id: { [Op.ne]: userId }
          }
        });

        if (existingUsername) {
          throw new Error('Username already exists');
        }
      }

      // Validate branch belongs to tenant
      if (updateData.branch_id && (updateData.tenant_id || user.tenant_id)) {
        const tenantId = updateData.tenant_id || user.tenant_id;
        const branch = await Branch.findOne({
          where: {
            branch_id: updateData.branch_id,
            tenant_id: tenantId
          }
        });

        if (!branch) {
          throw new Error('Branch does not belong to the specified tenant');
        }
      }

      // Hash new password if provided
      if (updateData.password) {
        updateData.password_hash = await bcrypt.hash(updateData.password, 12);
        delete updateData.password;
      }

      await user.update(updateData);

      // Return updated user with associations
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found');
      }

      // Soft delete - deactivate instead of hard delete
      await user.update({ is_active: false });

      return { message: 'User deactivated successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Get branches for a tenant
   */
  async getBranchesByTenant(tenantId) {
    try {
      const branches = await Branch.findAll({
        where: {
          tenant_id: tenantId,
          is_active: true
        },
        attributes: ['branch_id', 'branch_name', 'branch_code', 'city'],
        order: [['branch_name', 'ASC']]
      });

      return branches;
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();