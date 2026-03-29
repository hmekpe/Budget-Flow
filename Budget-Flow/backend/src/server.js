const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = require("./app");
const pool = require("./config/db");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET environment variable is required");
    }

    await pool.query("SELECT NOW()");
    console.log("Connected to PostgreSQL database");
  } catch (error) {
    console.error("Database connection error:", error.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

