// ✅ CRITICAL: Import from models/index.js to get associations
const { User, Tenant, RolePlugin } = require("@models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class AuthService {
  async login({ email, password }) {
    try {
      console.log("🔐 Attempting login for:", email);
      
      // ✅ Find user with associations
      const user = await User.findOne({ 
        where: { email },
        include: [
          { 
            model: Tenant, 
            as: 'tenant',
            required: false // Make it optional in case tenant doesn't exist
          },
          { 
            model: RolePlugin, 
            as: 'role',
            required: false // Make it optional in case role doesn't exist
          }
        ]
      });
      
      if (!user) {
        console.log("❌ User not found:", email);
        throw new Error("Invalid credentials");
      }
      
      if (!user.is_active) {
        console.log("❌ User account is deactivated:", email);
        throw new Error("Account is deactivated");
      }

      console.log("✅ User found:", email, "Role ID:", user.role_id);

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        console.log("❌ Invalid password for:", email);
        throw new Error("Invalid credentials");
      }

      // Update last login
      await user.update({ last_login: new Date() });

      // ✅ Get role details
      const roleInfo = user.role ? user.role.toPermissionObject() : null;
      
      console.log("📋 Role info:", roleInfo);

      // Generate tokens with role information
      const token = this.generateToken(user, roleInfo);
      const refreshToken = this.generateRefreshToken(user);

      console.log('✅ Login successful for:', email, 'Role:', roleInfo?.role_name);

      return {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role_id: user.role_id,
          role: roleInfo?.role_name || null, // ✅ Return role name string
          role_details: roleInfo, // ✅ Full role object with screens
          tenant: user.tenant ? {
            tenant_id: user.tenant.tenant_id,
            tenant_name: user.tenant.tenant_name,
            tenant_code: user.tenant.tenant_code
          } : null
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error("❌ Error during login:", error.message);
      throw new Error(error.message);
    }
  }

  async register(userData) {
    try {
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });
      
      if (existingUser) throw new Error("User already exists");

      // ✅ Validate role_id if provided
      if (userData.role_id) {
        const role = await RolePlugin.findByPk(userData.role_id);
        if (!role) {
          throw new Error("Invalid role_id provided");
        }
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const newUser = await User.create({
        ...userData,
        password_hash: hashedPassword
      });

      console.log('✅ User registered:', newUser.email);

      // Return user without password
      return newUser.toSafeObject();
    } catch (error) {
      console.error("Error during registration:", error);
      throw new Error(error.message || "Failed to register user");
    }
  }

  async logout(token) {
    try {
      // In a real application, you might want to blacklist the token
      // For now, we'll just return success
      return { message: "Logged out successfully" };
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Failed to logout");
    }
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findByPk(decoded.user_id, {
        include: [{ model: RolePlugin, as: 'role' }]
      });
      
      if (!user) throw new Error("Invalid refresh token");

      const roleInfo = user.role ? user.role.toPermissionObject() : null;
      const newToken = this.generateToken(user, roleInfo);
      
      return { token: newToken };
    } catch (error) {
      console.error("Error refreshing token:", error);
      throw new Error("Invalid refresh token");
    }
  }

  async forgotPassword(email) {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Don't reveal whether email exists
        return { message: "If the email exists, a reset link has been sent" };
      }

      // Generate reset token (implementation depends on your email service)
      const resetToken = this.generateResetToken(user);
      
      // Send email with reset link (implement based on your email service)
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      return { message: "If the email exists, a reset link has been sent" };
    } catch (error) {
      console.error("Error in forgot password:", error);
      throw new Error("Failed to process password reset request");
    }
  }

  async resetPassword({ token, newPassword }) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET);
      const user = await User.findByPk(decoded.user_id);
      
      if (!user) throw new Error("Invalid reset token");

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await user.update({ password_hash: hashedPassword });

      return { message: "Password reset successfully" };
    } catch (error) {
      console.error("Error resetting password:", error);
      throw new Error("Failed to reset password");
    }
  }

  // ✅ Include role information in JWT token
  generateToken(user, roleInfo) {
    const payload = { 
      user_id: user.user_id, 
      email: user.email,
      role_id: user.role_id,
      role: roleInfo ? roleInfo.role_name : null, // ✅ CRITICAL: Use 'role' not 'role_name'
      screens: roleInfo ? roleInfo.screens : [],
      tenant_id: user.tenant_id
    };
    
    console.log('🔑 Generating JWT token with payload:', payload);
    
    return jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
  }

  generateRefreshToken(user) {
    return jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
  }

  generateResetToken(user) {
    return jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_RESET_SECRET,
      { expiresIn: '1h' }
    );
  }

  // ✅ Helper method to verify user has access to a screen
  async verifyScreenAccess(userId, screenName) {
    try {
      const user = await User.findByPk(userId, {
        include: [{ model: RolePlugin, as: 'role' }]
      });

      if (!user || !user.role) {
        return false;
      }

      return user.role.hasAccessTo(screenName);
    } catch (error) {
      console.error("Error verifying screen access:", error);
      return false;
    }
  }

  // ✅ Get user with full role details
  async getUserWithRole(userId) {
    try {
      const user = await User.findByPk(userId, {
        include: [
          { model: Tenant, as: 'tenant' },
          { model: RolePlugin, as: 'role' }
        ],
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        throw new Error("User not found");
      }

      const roleInfo = user.role ? user.role.toPermissionObject() : null;

      return {
        ...user.toJSON(),
        role_details: roleInfo
      };
    } catch (error) {
      console.error("Error getting user with role:", error);
      throw error;
    }
  }
}

module.exports = new AuthService();