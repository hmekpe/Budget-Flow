const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const pool = require("../config/db");

const requiredTables = [
  "users",
  "transactions",
  "monthly_budgets",
  "savings_goals",
  "budget_categories",
  "user_settings",
  "savings_entries"
];

const requiredColumns = {
  budget_categories: ["user_id", "name", "emoji", "monthly_limit", "spent_amount"],
  savings_goals: ["emoji"],
  savings_entries: ["user_id", "goal_id", "type", "amount"],
  user_settings: ["user_id", "currency", "base_currency", "country_code", "language", "theme", "onboarding_completed"]
};

async function verifyDb() {
  try {
    const { rows } = await pool.query(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = ANY($1)
       ORDER BY table_name`,
      [requiredTables]
    );

    const existing = new Set(rows.map((row) => row.table_name));
    const missing = requiredTables.filter((tableName) => !existing.has(tableName));

    if (missing.length) {
      console.error("Missing tables:", missing.join(", "));
      process.exitCode = 1;
      return;
    }

    const tablesToCheck = Object.keys(requiredColumns);
    const { rows: columnRows } = await pool.query(
      `SELECT table_name, column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ANY($1)`,
      [tablesToCheck]
    );

    const columnsByTable = new Map();
    columnRows.forEach((row) => {
      if (!columnsByTable.has(row.table_name)) {
        columnsByTable.set(row.table_name, new Set());
      }

      columnsByTable.get(row.table_name).add(row.column_name);
    });

    const missingColumns = [];

    tablesToCheck.forEach((tableName) => {
      const existingColumns = columnsByTable.get(tableName) || new Set();
      requiredColumns[tableName].forEach((columnName) => {
        if (!existingColumns.has(columnName)) {
          missingColumns.push(`${tableName}.${columnName}`);
        }
      });
    });

    if (missingColumns.length) {
      console.error("Missing columns:", missingColumns.join(", "));
      process.exitCode = 1;
      return;
    }

    console.log("Database verification passed");
    console.log(`Verified tables: ${requiredTables.join(", ")}`);
  } catch (error) {
    console.error("Database verification failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

verifyDb();
