const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/config", authController.config);
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.get("/me", requireAuth, authController.me);
router.post("/google", authController.googleLogin);

module.exports = router;

