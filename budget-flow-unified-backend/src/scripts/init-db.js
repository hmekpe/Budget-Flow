const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const pool = require("../config/db");

async function initDb() {
  const sqlPath = path.join(__dirname, "../../sql/feature-init.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  try {
    await pool.query(sql);
    console.log("Feature backend schema initialized successfully");
  } catch (error) {
    console.error("Feature schema initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();
