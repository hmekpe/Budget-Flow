const { ASSISTANT_SUGGESTIONS } = require("../utils/constants")

function toPositiveInteger(value, fallback) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback
  }

  if (typeof value === "boolean") {
    return value
  }

  const normalized = String(value).trim().toLowerCase()
  return ["1", "true", "yes", "on"].includes(normalized)
}

function getFlowiseConfig() {
  const baseUrl = String(process.env.FLOWISE_BASE_URL || "").trim().replace(/\/+$/, "")
  const chatflowId = String(process.env.FLOWISE_CHATFLOW_ID || "").trim()
  const groqApiKey = String(process.env.GROQ_API_KEY || "").trim()

  return {
    mode: String(process.env.ASSISTANT_MODE || "hybrid").trim().toLowerCase(),
    enabled: toBoolean(process.env.FLOWISE_ENABLED, Boolean(baseUrl && chatflowId)),
    baseUrl,
    chatflowId,
    apiKey: String(process.env.FLOWISE_API_KEY || "").trim(),
    timeoutMs: toPositiveInteger(process.env.FLOWISE_TIMEOUT_MS, 6000),
    groqEnabled: toBoolean(process.env.GROQ_ENABLED, Boolean(groqApiKey)),
    groqApiKey,
    groqModel: String(process.env.GROQ_MODEL || "openai/gpt-oss-20b").trim(),
    groqBaseUrl: String(process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1")
      .trim()
      .replace(/\/+$/, ""),
    groqTimeoutMs: toPositiveInteger(process.env.GROQ_TIMEOUT_MS, 10000)
  }
}

function shouldUseGroq(config = getFlowiseConfig()) {
  if (config.mode === "rules" || config.mode === "flowise") {
    return false
  }

  return Boolean(
    config.groqEnabled && config.groqApiKey && config.groqModel && config.groqBaseUrl
  )
}

function shouldUseFlowise(config = getFlowiseConfig()) {
  if (config.mode === "rules" || config.mode === "groq") {
    return false
  }

  if (shouldUseGroq(config)) {
    return false
  }

  return Boolean(config.enabled && config.baseUrl && config.chatflowId)
}

function getAssistantStatusLabel(mode) {
  switch (mode) {
    case "groq":
      return "Live Groq AI + finance data"
    case "flowise":
      return "Live AI + finance data"
    case "rules-fallback":
      return "Live AI unavailable - fallback active"
    default:
      return "Data-backed finance mode"
  }
}

function getAssistantClientState(
  config = getFlowiseConfig(),
  mode = shouldUseGroq(config) ? "groq" : shouldUseFlowise(config) ? "flowise" : "rules"
) {
  return {
    mode,
    liveModelReady: shouldUseGroq(config) || shouldUseFlowise(config),
    groqConfigured: Boolean(config.groqApiKey && config.groqModel),
    flowiseConfigured: Boolean(config.baseUrl && config.chatflowId && config.apiKey),
    suggestions: ASSISTANT_SUGGESTIONS,
    statusLabel: getAssistantStatusLabel(mode)
  }
}

module.exports = {
  getAssistantClientState,
  getFlowiseConfig,
  getAssistantStatusLabel,
  shouldUseGroq,
  shouldUseFlowise
}
