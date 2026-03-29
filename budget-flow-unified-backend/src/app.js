const express = require("express")
const cors = require("cors")
const { requireAuth } = require("./middlewares/auth.middleware")
const { notFound, errorHandler } = require("./middlewares/error.middleware")
const aiRoutes = require("./routes/ai.routes")
const appRoutes = require("./routes/app.routes")
const assistantRoutes = require("./routes/assistant.routes")
const budgetsRoutes = require("./routes/budgets.routes")
const chatRoutes = require("./routes/chat.routes")
const dashboardRoutes = require("./routes/dashboard.routes")
const metaRoutes = require("./routes/meta.routes")
const reportsRoutes = require("./routes/reports.routes")
const savingsRoutes = require("./routes/savings.routes")
const settingsRoutes = require("./routes/settings.routes")
const transactionsRoutes = require("./routes/transactions.routes")

const app = express()

function splitCommaSeparated(value) {
  return String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase())
}

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5500"
const FEATURE_FRONTEND_URL = process.env.FEATURE_FRONTEND_URL || "http://localhost:5500"

const allowedOrigins = new Set([
  CLIENT_URL,
  FEATURE_FRONTEND_URL,
  ...splitCommaSeparated(process.env.ALLOWED_ORIGINS)
])
const isLocalDevOrigin = (origin) =>
  typeof origin === "string" &&
  (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"))

if (toBoolean(process.env.TRUST_PROXY)) {
  app.set("trust proxy", true)
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true)
      }

      if (allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
        return callback(null, true)
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`))
    },
    credentials: true,
    maxAge: 86400
  })
)

app.use(express.json({ limit: "1mb" }))

app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Budget Flow feature backend is running"
  })
})

app.use("/api/meta", metaRoutes)
app.use("/api/app", requireAuth, appRoutes)
app.use("/api/dashboard", requireAuth, dashboardRoutes)
app.use("/api/transactions", requireAuth, transactionsRoutes)
app.use("/api/budgets", requireAuth, budgetsRoutes)
app.use("/api/savings", requireAuth, savingsRoutes)
app.use("/api/reports", requireAuth, reportsRoutes)
app.use("/api/settings", requireAuth, settingsRoutes)
app.use("/api/assistant", requireAuth, assistantRoutes)
app.use("/api/chat", requireAuth, chatRoutes)
app.use("/api/ai", requireAuth, aiRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
