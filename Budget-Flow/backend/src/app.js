const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const { notFound, errorHandler } = require("./middlewares/error.middleware");

const app = express();

function splitCommaSeparated(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5500";
const allowedOrigins = new Set([CLIENT_URL, ...splitCommaSeparated(process.env.ALLOWED_ORIGINS)]);
const isLocalDevOrigin = (origin) =>
  typeof origin === "string" &&
  (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));

if (toBoolean(process.env.TRUST_PROXY)) {
  app.set("trust proxy", true);
}

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header).
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin) || isLocalDevOrigin(origin)) return callback(null, true);

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    maxAge: 86400
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Budget Flow auth backend is running" });
});

app.use("/api/auth", authRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

