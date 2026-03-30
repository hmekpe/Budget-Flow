const webPush = require("web-push");
const pool = require("../config/db");

let pushSchemaReadyPromise = null;

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function isPushConfigured() {
  return Boolean(
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY && process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  );
}

function configureWebPush() {
  if (!isPushConfigured()) {
    return false;
  }

  webPush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT || "mailto:no-reply@budgetflow.local",
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY,
    process.env.WEB_PUSH_VAPID_PRIVATE_KEY
  );

  return true;
}

const pushConfigured = configureWebPush();

function getAppOpenUrl() {
  const explicitUrl = String(process.env.PUBLIC_APP_URL || "").trim();
  if (explicitUrl) {
    return explicitUrl;
  }

  const origin = trimTrailingSlash(
    process.env.FEATURE_FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5500"
  );
  return `${origin}/app/index.html#dashboard`;
}

function getAssetUrl(pathname) {
  const origin = trimTrailingSlash(
    process.env.FEATURE_FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5500"
  );
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${normalizedPath}`;
}

function getClientConfig() {
  return {
    enabled: pushConfigured,
    publicKey: process.env.WEB_PUSH_VAPID_PUBLIC_KEY || ""
  };
}

async function ensurePushSchema() {
  if (!pushSchemaReadyPromise) {
    pushSchemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          endpoint TEXT NOT NULL UNIQUE,
          subscription JSONB NOT NULL,
          user_agent TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ
        )
      `);

      await pool.query(
        `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
         ON push_subscriptions (user_id, updated_at DESC)`
      );
    })().catch((error) => {
      pushSchemaReadyPromise = null;
      throw error;
    });
  }

  return pushSchemaReadyPromise;
}

function normalizeSubscription(payload = {}) {
  const endpoint = String(payload.endpoint || "").trim();
  const auth = String(payload.keys?.auth || "").trim();
  const p256dh = String(payload.keys?.p256dh || "").trim();

  if (!endpoint || !auth || !p256dh) {
    throw new Error("A valid push subscription is required");
  }

  return {
    endpoint,
    expirationTime: payload.expirationTime ?? null,
    keys: {
      auth,
      p256dh
    }
  };
}

async function registerSubscription(userId, payload, userAgent = "") {
  await ensurePushSchema();

  if (!pushConfigured) {
    throw new Error("Push notifications are not configured on the server yet.");
  }

  const subscription = normalizeSubscription(payload);

  await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, subscription, user_agent, updated_at, last_used_at)
     VALUES ($1, $2, $3::jsonb, $4, NOW(), NOW())
     ON CONFLICT (endpoint)
     DO UPDATE
       SET user_id = EXCLUDED.user_id,
           subscription = EXCLUDED.subscription,
           user_agent = EXCLUDED.user_agent,
           updated_at = NOW(),
           last_used_at = NOW()`,
    [userId, subscription.endpoint, JSON.stringify(subscription), userAgent || null]
  );

  return {
    endpoint: subscription.endpoint
  };
}

async function unregisterSubscription(userId, endpoint) {
  await ensurePushSchema();

  if (endpoint) {
    const { rowCount } = await pool.query(
      `DELETE FROM push_subscriptions
       WHERE user_id = $1 AND endpoint = $2`,
      [userId, String(endpoint)]
    );

    return { removed: rowCount };
  }

  const { rowCount } = await pool.query(
    `DELETE FROM push_subscriptions
     WHERE user_id = $1`,
    [userId]
  );

  return { removed: rowCount };
}

function buildNotificationPayload(payload = {}) {
  const title = String(payload.title || "").trim() || "Budget Flow reminder";
  const body =
    String(payload.message || payload.body || "").trim() ||
    "Budget Flow is ready. Tap to check your dashboard.";

  return {
    title,
    body,
    tag: "budget-flow-manual-reminder",
    url: getAppOpenUrl(),
    icon: getAssetUrl("/assests/budget-flow-icon.svg"),
    badge: getAssetUrl("/assests/budget-flow-icon.svg")
  };
}

async function sendNotificationToUser(userId, payload) {
  await ensurePushSchema();

  if (!pushConfigured) {
    throw new Error("Push notifications are not configured on the server yet.");
  }

  const { rows } = await pool.query(
    `SELECT id, subscription
     FROM push_subscriptions
     WHERE user_id = $1`,
    [userId]
  );

  if (!rows.length) {
    return {
      delivered: 0,
      removed: 0,
      total: 0
    };
  }

  let delivered = 0;
  let removed = 0;
  const serializedPayload = JSON.stringify(buildNotificationPayload(payload));

  for (const row of rows) {
    try {
      await webPush.sendNotification(row.subscription, serializedPayload);
      delivered += 1;
      await pool.query(
        `UPDATE push_subscriptions
         SET updated_at = NOW(),
             last_used_at = NOW()
         WHERE id = $1`,
        [row.id]
      );
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        removed += 1;
        await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [row.id]);
        continue;
      }

      console.error("Push delivery failed:", error.message);
    }
  }

  return {
    delivered,
    removed,
    total: rows.length
  };
}

async function sendTestNotification(userId, payload) {
  return sendNotificationToUser(userId, payload);
}

module.exports = {
  getClientConfig,
  registerSubscription,
  sendTestNotification,
  unregisterSubscription
};
