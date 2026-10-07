const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const requireAuth = require("../middleware/requireAuth");

// Khai báo route POST /api/auth/register
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.requestPasswordReset);
router.post("/reset-password", authController.resetPassword);
router.get("/me", requireAuth, authController.getCurrentUser);

module.exports = router;
