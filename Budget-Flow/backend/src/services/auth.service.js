const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");
const transporter = require("../config/mail");
const { signJwt, generateRandomToken, hashToken } = require("../utils/token");

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClient = googleClientId ? new OAuth2Client(googleClientId) : null;

function hasMailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM);
}

function isLocalClientUrl() {
  const clientUrl = String(process.env.CLIENT_URL || "").trim().toLowerCase();
  return clientUrl.includes("localhost") || clientUrl.includes("127.0.0.1");
}

function isLocalResetFallbackAllowed() {
  return process.env.NODE_ENV !== "production" || isLocalClientUrl();
}

function shouldPreferDirectResetLink() {
  return isLocalClientUrl() && process.env.NODE_ENV !== "production";
}

async function registerUser({ name, email, password }) {
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);

  if (existing.rows.length) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, provider)
     VALUES ($1, $2, $3, 'local')
     RETURNING id, name, email, provider`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const token = signJwt({ userId: user.id });

  return {
    isNewUser: true,
    user,
    token
  };
}

async function loginUser({ email, password }) {
  const { rows } = await pool.query(
    "SELECT id, name, email, password_hash, provider FROM users WHERE email = $1",
    [email]
  );

  const user = rows[0];

  if (!user || !user.password_hash) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  const token = signJwt({ userId: user.id });

  return {
    isNewUser: false,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider
    },
    token
  };
}

async function forgotPassword(email) {
  const { rows } = await pool.query(
    "SELECT id, name, email FROM users WHERE email = $1",
    [email]
  );

  const user = rows[0];

  if (!user) {
    return { message: "If an account exists, a reset link has been sent" };
  }

  await pool.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE",
    [user.id]
  );

  const rawToken = generateRandomToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, used)
     VALUES ($1, $2, $3, FALSE)`,
    [user.id, tokenHash, expiresAt]
  );

  const resetLink = `${process.env.CLIENT_URL}/pages/reset-password.html?token=${rawToken}`;

  if (shouldPreferDirectResetLink()) {
    return {
      message: "Local password reset link is ready below.",
      resetLink,
      deliveryMode: "direct-link"
    };
  }

  if (!hasMailConfig()) {
    if (isLocalResetFallbackAllowed()) {
      return {
        message: "Email sending is not configured locally. Use the reset link below.",
        resetLink,
        deliveryMode: "direct-link"
      };
    }

    throw new Error("Password reset email is not configured on the server");
  }

  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject: "Budget Flow Password Reset",
      html: `
        <div style="font-family: Arial, sans-serif; color: #222;">
          <h2>Reset your password</h2>
          <p>Hello ${user.name},</p>
          <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
          <p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 18px;background:#816DBC;color:#fff;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `
    });
  } catch (error) {
    if (isLocalResetFallbackAllowed()) {
      return {
        message: "Email delivery failed locally. Use the reset link below.",
        resetLink,
        deliveryMode: "direct-link"
      };
    }

    throw error;
  }

  return { message: "If an account exists, a reset link has been sent" };
}

async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  const { rows } = await pool.query(
    `SELECT id, user_id
     FROM password_reset_tokens
     WHERE token_hash = $1
       AND used = FALSE
       AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  const resetRecord = rows[0];

  if (!resetRecord) {
    throw new Error("Invalid or expired reset token");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    "UPDATE users SET password_hash = $1, provider = 'local', updated_at = NOW() WHERE id = $2",
    [passwordHash, resetRecord.user_id]
  );

  await pool.query(
    "UPDATE password_reset_tokens SET used = TRUE WHERE id = $1",
    [resetRecord.id]
  );

  return { message: "Password has been reset successfully" };
}

async function loginWithGoogle(idToken) {
  if (!googleClient || !googleClientId) {
    throw new Error("Google sign-in is not configured on the server");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: googleClientId
  });

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw new Error("Unable to verify Google account");
  }

  const email = payload.email.toLowerCase();
  const name = payload.name || payload.given_name || "Google User";
  const providerId = payload.sub;
  const emailVerified = payload.email_verified === true;

  const { rows } = await pool.query(
    "SELECT id, name, email, provider, provider_id FROM users WHERE email = $1",
    [email]
  );

  let user;
  let isNewUser = false;

  if (rows.length) {
    user = rows[0];

    // If this user was created locally before, upgrade to Google provider.
    if (user.provider !== "google" || !user.provider_id) {
      const updateResult = await pool.query(
        `UPDATE users
         SET provider = 'google',
             provider_id = $1,
             is_email_verified = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, email, provider, provider_id`,
        [providerId, emailVerified, user.id]
      );

      user = updateResult.rows[0];
    }
  } else {
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, provider, provider_id, is_email_verified)
       VALUES ($1, $2, 'google', $3, $4)
       RETURNING id, name, email, provider, provider_id`,
      [name, email, providerId, emailVerified]
    );

    user = insertResult.rows[0];
    isNewUser = true;
  }

  const token = signJwt({ userId: user.id });

  return {
    isNewUser,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      provider: user.provider
    },
    token
  };
}

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  loginWithGoogle
};

