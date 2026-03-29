const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5002;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    await pool.query("SELECT NOW()");
    const schemaSql = fs.readFileSync(path.join(__dirname, "../sql/feature-init.sql"), "utf8");
    await pool.query(schemaSql);

    const { rows } = await pool.query(
      `SELECT
         to_regclass('public.user_settings') AS settings_table,
         EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'budget_categories'
             AND column_name = 'spent_amount'
         ) AS has_budget_spend_column`
    );

    if (!rows[0]?.settings_table || !rows[0]?.has_budget_spend_column) {
      console.warn("Feature tables are not initialized yet. Run `bun run db:init` before using the API.");
    }

    app.listen(PORT, () => {
      console.log(`Feature backend running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
