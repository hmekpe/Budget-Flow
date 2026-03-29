const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

if (!connectionString) {
  // Fail fast if the database URL is not configured
  // The server.js entrypoint will surface this error on startup.
  throw new Error("DATABASE_URL environment variable is required");
}

const useSsl = toBoolean(process.env.DATABASE_SSL, connectionString.includes("sslmode=require"));
const rejectUnauthorized = toBoolean(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, false);

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized } : false
});

module.exports = pool;

