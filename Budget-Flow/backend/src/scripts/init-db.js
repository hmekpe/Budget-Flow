const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const pool = require("../config/db");

function splitSqlStatements(sql) {
  // Remove line comments and trim
  const withoutComments = sql
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  return withoutComments
    .split(";")
    .map((stmt) => stmt.trim())
    .filter(Boolean);
}

async function main() {
  const sqlPath = path.join(__dirname, "../../sql/init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const statements = splitSqlStatements(sql);

  if (!statements.length) {
    console.log("No SQL statements found in init.sql");
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query("COMMIT");
    console.log("Database schema applied successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to apply schema:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
