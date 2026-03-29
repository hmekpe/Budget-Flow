const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const asyncHandler = require("../utils/asyncHandler");

const requireAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { rows } = await pool.query(
      "SELECT id, name, email, provider FROM users WHERE id = $1",
      [userId]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = {
  requireAuth
};

