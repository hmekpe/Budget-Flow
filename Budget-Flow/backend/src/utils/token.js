const jwt = require("jsonwebtoken");
const crypto = require("crypto");

function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
}

function generateRandomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signJwt,
  generateRandomToken,
  hashToken
};

