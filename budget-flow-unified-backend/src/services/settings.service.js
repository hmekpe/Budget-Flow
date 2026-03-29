const pool = require("../config/db");
const { COUNTRIES, CURRENCIES, LANGUAGES, THEMES } = require("../utils/constants");

const allowedCountryCodes = new Set(COUNTRIES.map((item) => item.code));
const allowedCurrencyCodes = new Set(CURRENCIES.map((item) => item.code));
const allowedLanguageCodes = new Set(LANGUAGES.map((item) => item.code));
const allowedThemes = new Set(THEMES);
let settingsSchemaReadyPromise = null;

function normalizeCountryCode(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value).trim().toUpperCase();
}

function mapPreferences(settings) {
  return {
    currency: settings.currency,
    baseCurrency: settings.base_currency,
    countryCode: settings.country_code,
    language: settings.language,
    theme: settings.theme,
    onboardingCompleted: Boolean(settings.onboarding_completed)
  };
}

async function ensureSettingsSchema() {
  if (!settingsSchemaReadyPromise) {
    settingsSchemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          base_currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
          country_code VARCHAR(10),
          language VARCHAR(10) NOT NULL DEFAULT 'en',
          theme VARCHAR(10) NOT NULL DEFAULT 'dark',
          onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
          budget_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
          reminder_time TIME,
          push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          budget_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS currency VARCHAR(10)`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS base_currency VARCHAR(10)`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS country_code VARCHAR(10)`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS language VARCHAR(10)`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS theme VARCHAR(10)`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS budget_reminder_enabled BOOLEAN`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS reminder_time TIME`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS budget_alerts_enabled BOOLEAN`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
      await pool.query(`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`);

      await pool.query(`
        UPDATE user_settings
        SET currency = COALESCE(NULLIF(currency, ''), 'GHS'),
            base_currency = COALESCE(NULLIF(base_currency, ''), NULLIF(currency, ''), 'GHS'),
            language = COALESCE(NULLIF(language, ''), 'en'),
            theme = COALESCE(NULLIF(theme, ''), 'dark'),
            onboarding_completed = COALESCE(onboarding_completed, TRUE),
            budget_reminder_enabled = COALESCE(budget_reminder_enabled, FALSE),
            push_notifications_enabled = COALESCE(push_notifications_enabled, TRUE),
            budget_alerts_enabled = COALESCE(budget_alerts_enabled, TRUE),
            created_at = COALESCE(created_at, NOW()),
            updated_at = COALESCE(updated_at, NOW())
      `);

      await pool.query(`ALTER TABLE user_settings ALTER COLUMN currency SET DEFAULT 'GHS'`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN base_currency SET DEFAULT 'GHS'`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN language SET DEFAULT 'en'`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN theme SET DEFAULT 'dark'`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN onboarding_completed SET DEFAULT FALSE`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN budget_reminder_enabled SET DEFAULT FALSE`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN push_notifications_enabled SET DEFAULT TRUE`);
      await pool.query(`ALTER TABLE user_settings ALTER COLUMN budget_alerts_enabled SET DEFAULT TRUE`);
    })().catch((error) => {
      settingsSchemaReadyPromise = null;
      throw error;
    });
  }

  return settingsSchemaReadyPromise;
}

async function ensureSettingsRow(userId) {
  await ensureSettingsSchema();

  await pool.query(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const { rows } = await pool.query(
    `SELECT id,
            user_id,
            currency,
            base_currency,
            country_code,
            language,
            theme,
            onboarding_completed,
            budget_reminder_enabled,
            reminder_time,
            push_notifications_enabled,
            budget_alerts_enabled,
            created_at,
            updated_at
     FROM user_settings
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );

  const settings = rows[0];

  if (settings && (!settings.base_currency || settings.base_currency === "")) {
    const nextBaseCurrency = settings.currency || "GHS";

    await pool.query(
      `UPDATE user_settings
       SET base_currency = $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [nextBaseCurrency, userId]
    );

    settings.base_currency = nextBaseCurrency;
  }

  return settings;
}

async function getProfile(userId) {
  await ensureSettingsRow(userId);

  const { rows } = await pool.query(
    `SELECT u.id,
            u.name,
            u.email,
            u.provider,
            s.currency,
            s.base_currency,
            s.country_code,
            s.language,
            s.theme,
            s.onboarding_completed
     FROM users u
     LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );

  if (!rows.length) {
    throw new Error("User not found");
  }

  const profile = rows[0];

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    provider: profile.provider,
    currency: profile.currency,
    baseCurrency: profile.base_currency,
    countryCode: profile.country_code,
    language: profile.language,
    theme: profile.theme,
    onboardingCompleted: Boolean(profile.onboarding_completed)
  };
}

async function updateProfile(userId, payload) {
  const current = await getProfile(userId);
  const nextName = payload.name !== undefined ? String(payload.name).trim() : current.name;
  const nextEmail = payload.email !== undefined ? String(payload.email).trim().toLowerCase() : current.email;
  const nextCurrency =
    payload.currency !== undefined ? String(payload.currency).trim().toUpperCase() : current.currency;

  if (!nextName) {
    throw new Error("Name is required");
  }

  if (!nextEmail) {
    throw new Error("Email is required");
  }

  if (!allowedCurrencyCodes.has(nextCurrency)) {
    throw new Error("Unsupported currency");
  }

  const emailCheck = await pool.query(
    `SELECT id
     FROM users
     WHERE email = $1 AND id <> $2
     LIMIT 1`,
    [nextEmail, userId]
  );

  if (emailCheck.rows.length) {
    throw new Error("Another account already uses this email");
  }

  await pool.query(
    `UPDATE users
     SET name = $1,
         email = $2,
         updated_at = NOW()
     WHERE id = $3`,
    [nextName, nextEmail, userId]
  );

  await pool.query(
    `UPDATE user_settings
     SET currency = $1,
         updated_at = NOW()
     WHERE user_id = $2`,
    [nextCurrency, userId]
  );

  return getProfile(userId);
}

async function getPreferences(userId) {
  const settings = await ensureSettingsRow(userId);
  return mapPreferences(settings);
}

async function updatePreferences(userId, payload) {
  const current = await getPreferences(userId);
  const currency =
    payload.currency !== undefined ? String(payload.currency).trim().toUpperCase() : current.currency;
  const countryCode = normalizeCountryCode(payload.countryCode, current.countryCode);
  const language =
    payload.language !== undefined ? String(payload.language).trim().toLowerCase() : current.language;
  const theme = payload.theme !== undefined ? String(payload.theme).trim().toLowerCase() : current.theme;

  if (!allowedCurrencyCodes.has(currency)) {
    throw new Error("Unsupported currency");
  }

  if (countryCode && !allowedCountryCodes.has(countryCode)) {
    throw new Error("Unsupported country");
  }

  if (!allowedLanguageCodes.has(language)) {
    throw new Error("Unsupported language");
  }

  if (!allowedThemes.has(theme)) {
    throw new Error("Unsupported theme");
  }

  await pool.query(
    `UPDATE user_settings
     SET currency = $1,
         country_code = $2,
         language = $3,
         theme = $4,
         updated_at = NOW()
     WHERE user_id = $5`,
    [currency, countryCode, language, theme, userId]
  );

  return getPreferences(userId);
}

async function completeOnboarding(userId, payload) {
  const current = await getPreferences(userId);
  const countryCode = normalizeCountryCode(payload.countryCode, current.countryCode);
  const language =
    payload.language !== undefined ? String(payload.language).trim().toLowerCase() : current.language;
  const currency =
    payload.currency !== undefined ? String(payload.currency).trim().toUpperCase() : current.currency;
  const baseCurrency =
    payload.baseCurrency !== undefined
      ? String(payload.baseCurrency).trim().toUpperCase()
      : currency;
  const theme = payload.theme !== undefined ? String(payload.theme).trim().toLowerCase() : current.theme;

  if (!countryCode || !allowedCountryCodes.has(countryCode)) {
    throw new Error("A supported country is required");
  }

  if (!allowedLanguageCodes.has(language)) {
    throw new Error("Unsupported language");
  }

  if (!allowedCurrencyCodes.has(currency)) {
    throw new Error("Unsupported currency");
  }

  if (!allowedCurrencyCodes.has(baseCurrency)) {
    throw new Error("Unsupported base currency");
  }

  if (!allowedThemes.has(theme)) {
    throw new Error("Unsupported theme");
  }

  await pool.query(
    `UPDATE user_settings
     SET country_code = $1,
         language = $2,
         currency = $3,
         base_currency = $4,
         theme = $5,
         onboarding_completed = TRUE,
         updated_at = NOW()
     WHERE user_id = $6`,
    [countryCode, language, currency, baseCurrency, theme, userId]
  );

  return getSettingsBundle(userId);
}

async function getNotifications(userId) {
  const settings = await ensureSettingsRow(userId);

  return {
    budgetReminderEnabled: settings.budget_reminder_enabled,
    reminderTime: settings.reminder_time,
    pushNotificationsEnabled: settings.push_notifications_enabled,
    budgetAlertsEnabled: settings.budget_alerts_enabled
  };
}

async function updateNotifications(userId, payload) {
  const current = await getNotifications(userId);
  const budgetReminderEnabled =
    payload.budgetReminderEnabled !== undefined
      ? Boolean(payload.budgetReminderEnabled)
      : current.budgetReminderEnabled;
  const reminderTime =
    payload.reminderTime !== undefined ? payload.reminderTime || null : current.reminderTime;
  const pushNotificationsEnabled =
    payload.pushNotificationsEnabled !== undefined
      ? Boolean(payload.pushNotificationsEnabled)
      : current.pushNotificationsEnabled;
  const budgetAlertsEnabled =
    payload.budgetAlertsEnabled !== undefined
      ? Boolean(payload.budgetAlertsEnabled)
      : current.budgetAlertsEnabled;

  if (reminderTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(reminderTime)) {
    throw new Error("Reminder time must be in HH:MM or HH:MM:SS format");
  }

  await pool.query(
    `UPDATE user_settings
     SET budget_reminder_enabled = $1,
         reminder_time = $2,
         push_notifications_enabled = $3,
         budget_alerts_enabled = $4,
         updated_at = NOW()
     WHERE user_id = $5`,
    [budgetReminderEnabled, reminderTime, pushNotificationsEnabled, budgetAlertsEnabled, userId]
  );

  return getNotifications(userId);
}

async function getSettingsBundle(userId) {
  const [profile, preferences, notifications] = await Promise.all([
    getProfile(userId),
    getPreferences(userId),
    getNotifications(userId)
  ]);

  return {
    profile,
    preferences,
    notifications
  };
}

async function deleteAccount(userId) {
  const { rows } = await pool.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [userId]
  );

  if (!rows.length) {
    throw new Error("User not found");
  }

  return { message: "Account deleted successfully" };
}

module.exports = {
  completeOnboarding,
  deleteAccount,
  ensureSettingsRow,
  getNotifications,
  getPreferences,
  getProfile,
  getSettingsBundle,
  updateNotifications,
  updatePreferences,
  updateProfile
};
