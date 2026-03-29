const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const pool = require("../config/db");

async function main() {
  const { rows } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  console.log("Public tables:", rows.map((r) => r.table_name));
}

main()
  .catch((err) => {
    console.error("DB verification failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
