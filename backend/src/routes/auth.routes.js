const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
console.log("Auth routes loaded");
router.post("/login", authController.login);
router.post("/register", authController.register);
router.post("/logout", authController.logout);
router.post("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

module.exports = router;

