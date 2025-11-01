const { User, Tenant } = require("@models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class AuthService {
  async login({ email, password }) {
    try {
      console.log("Attempting login for:", email);
      const user = await User.findOne({ 
        where: { email },
        include: [{ model: Tenant, as: 'tenant' }]
      });
      
      if (!user) throw new Error("Invalid credentials");
      if (!user.is_active) throw new Error("Account is deactivated");

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) throw new Error("Invalid credentials");

      // Update last login
      await user.update({ last_login: new Date() });

      // Generate tokens
      const token = this.generateToken(user);
      const refreshToken = this.generateRefreshToken(user);

      return {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          tenant: user.tenant
        },
        token,
        refreshToken
      };
    } catch (error) {
      console.error("Error during login:", error);
      throw new Error(error.message);
    }
  }

  async register(userData) {
    try {
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });
      
      if (existingUser) throw new Error("User already exists");

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      return await User.create({
        ...userData,
        password_hash: hashedPassword
      });
    } catch (error) {
      console.error("Error during registration:", error);
      throw new Error("Failed to register user");
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
      const user = await User.findByPk(decoded.user_id);
      
      if (!user) throw new Error("Invalid refresh token");

      const newToken = this.generateToken(user);
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

  generateToken(user) {
    return jwt.sign(
      { 
        user_id: user.user_id, 
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id
      },
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
}

module.exports = new AuthService();