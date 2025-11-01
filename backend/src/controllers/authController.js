const authService = require("@services/authService");
const ResponseHandler = require("@utils/responseHandler");
const { loginValidator, registerValidator, resetPasswordValidator } = require("@validators");

class AuthController {
  async login(req, res) {
    try {
      console.log("Login request received");
      const { error } = loginValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const result = await authService.login(req.body);
      return ResponseHandler.success(res, result, "Login successful");
    } catch (error) {
      return ResponseHandler.unauthorized(res, error.message);
    }
  }

  async register(req, res) {
    try {
      const { error } = registerValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      const user = await authService.register(req.body);
      return ResponseHandler.created(res, user, "User registered successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async logout(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      await authService.logout(token);
      return ResponseHandler.success(res, null, "Logout successful");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return ResponseHandler.success(res, result, "Token refreshed successfully");
    } catch (error) {
      return ResponseHandler.unauthorized(res, error.message);
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      return ResponseHandler.success(res, null, "Password reset email sent");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }

  async resetPassword(req, res) {
    try {
      const { error } = resetPasswordValidator.validate(req.body);
      if (error) return ResponseHandler.badRequest(res, error.details[0].message);

      await authService.resetPassword(req.body);
      return ResponseHandler.success(res, null, "Password reset successfully");
    } catch (error) {
      return ResponseHandler.internalServerError(res, error.message);
    }
  }
}

module.exports = new AuthController();