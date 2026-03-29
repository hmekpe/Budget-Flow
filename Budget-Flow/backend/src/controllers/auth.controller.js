const asyncHandler = require("../utils/asyncHandler");
const authService = require("../services/auth.service");

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  const result = await authService.registerUser({
    name,
    email: email.toLowerCase(),
    password
  });

  res.status(201).json(result);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  const result = await authService.loginUser({
    email: email.toLowerCase(),
    password
  });

  res.status(200).json(result);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  const result = await authService.forgotPassword(email.toLowerCase());
  res.status(200).json(result);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" });
  }

  const result = await authService.resetPassword({ token, password });
  res.status(200).json(result);
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

const config = asyncHandler(async (req, res) => {
  res.status(200).json({
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID || ""
  });
});

const googleLogin = asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ message: "Google idToken is required" });
  }

  const result = await authService.loginWithGoogle(idToken);
  res.status(200).json(result);
});

module.exports = {
  config,
  register,
  login,
  forgotPassword,
  resetPassword,
  me,
  googleLogin
};

