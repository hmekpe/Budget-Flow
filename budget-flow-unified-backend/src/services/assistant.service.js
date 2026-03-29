const dashboardService = require("./dashboard.service")
const reportsService = require("./reports.service")
const savingsService = require("./savings.service")
const settingsService = require("./settings.service")
const assistantConfigService = require("./assistant-config.service")
const { getMonthKey } = require("../utils/date")
const createHttpError = require("../utils/httpError")

function money(value) {
  return `GHS ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`
}

function toBullets(lines) {
  return lines.filter(Boolean).map((line) => `- ${line}`).join("\n")
}

function sanitizeUserMessage(rawMessage) {
  const message = String(rawMessage || "")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!message) {
    throw createHttpError(400, "Message is required")
  }

  if (message.length > 1000) {
    throw createHttpError(400, "Message must be 1000 characters or fewer")
  }

  return message
}

function resolveAiToolBaseUrl() {
  const candidate =
    process.env.AI_TOOL_BASE_URL ||
    process.env.FEATURE_API_BASE_URL ||
    `http://localhost:${process.env.PORT || 5002}`

  return String(candidate).trim().replace(/\/+$/, "")
}

function extractFlowiseReply(payload) {
  const directCandidates = [
    payload?.text,
    payload?.message,
    payload?.answer,
    payload?.result,
    payload?.response,
    payload?.output,
    payload?.data?.text,
    payload?.data?.message,
    payload?.data?.output,
    payload?.json?.text,
    payload?.json?.message
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  if (Array.isArray(payload?.messages) && payload.messages.length) {
    const lastMessage = payload.messages[payload.messages.length - 1]
    const content = lastMessage?.content || lastMessage?.text

    if (typeof content === "string" && content.trim()) {
      return content.trim()
    }
  }

  return null
}

function extractGroqReply(payload) {
  const content = payload?.choices?.[0]?.message?.content

  if (typeof content === "string" && content.trim()) {
    return content.trim()
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") {
          return part
        }

        if (part?.type === "text") {
          return part.text
        }

        return ""
      })
      .join("")
      .trim()

    if (text) {
      return text
    }
  }

  return null
}

function getBudgetSnapshot(dashboard = {}, report = {}) {
  const budget = dashboard.budget || {}
  const reportTotals = report.totals || {}
  const total = Number(budget.total || 0)
  const spent = Number(reportTotals.expenses || budget.spent || 0)
  const remaining = Number((total - spent).toFixed(2))
  const progress = total > 0 ? Number(Math.min((spent / total) * 100, 100).toFixed(1)) : 0

  return {
    monthLabel: budget.monthLabel || dashboard.monthLabel || "This month",
    total,
    spent,
    remaining,
    progress,
    hasBudget: total > 0,
    isOverBudget: total > 0 && spent > total,
    categoriesCount: Number(budget.categoriesCount || 0)
  }
}

async function buildFinanceContext(userId, month = getMonthKey()) {
  const [dashboard, report, savings, preferences] = await Promise.all([
    dashboardService.getDashboardSummary(userId, month),
    reportsService.getCurrentReport(userId, month),
    savingsService.getSavingsSummary(userId),
    settingsService.getPreferences(userId)
  ])

  return {
    dashboard,
    report,
    savings,
    preferences,
    latestTransaction: dashboard.recentTransactions?.[0] || null,
    budgetSnapshot: getBudgetSnapshot(dashboard, report)
  }
}

function buildGroqFinanceSnapshot(financeContext = {}) {
  const dashboard = financeContext.dashboard || {}
  const report = financeContext.report || {}
  const savings = financeContext.savings || {}
  const preferences = financeContext.preferences || {}
  const latestTransaction = financeContext.latestTransaction || null
  const budgetSnapshot = financeContext.budgetSnapshot || getBudgetSnapshot(dashboard, report)
  const topCategory = report.topSpendingCategory || null
  const currencyCode = preferences.currency || preferences.baseCurrency || "GHS"

  return {
    month: dashboard.month || report.month || getMonthKey(),
    monthLabel: dashboard.monthLabel || report.monthLabel || budgetSnapshot.monthLabel || "This month",
    currencyCode,
    totals: {
      income: Number(report?.totals?.income || dashboard?.totals?.income || 0),
      expenses: Number(report?.totals?.expenses || dashboard?.totals?.expenses || 0),
      netSavings: Number(report?.totals?.netSavings || 0),
      savingsRate: Number(report?.totals?.savingsRate || 0),
      netBalance: Number(dashboard?.totals?.netBalance || 0)
    },
    budget: {
      total: budgetSnapshot.total,
      spent: budgetSnapshot.spent,
      remaining: budgetSnapshot.remaining,
      progress: budgetSnapshot.progress,
      hasBudget: budgetSnapshot.hasBudget,
      isOverBudget: budgetSnapshot.isOverBudget,
      categoriesCount: budgetSnapshot.categoriesCount
    },
    savings: {
      totalSaved: Number(savings.totalSaved || 0),
      remaining: Number(savings.remaining || 0),
      progress: Number(savings.progress || 0),
      goalsCount: Number(savings.goalsCount || 0)
    },
    topSpendingCategory: topCategory
      ? {
          category: topCategory.category,
          emoji: topCategory.emoji,
          amount: Number(topCategory.amount || 0)
        }
      : null,
    expenseBreakdown: Array.isArray(report.expenseBreakdown)
      ? report.expenseBreakdown.slice(0, 6).map((entry) => ({
          category: entry.category,
          emoji: entry.emoji,
          amount: Number(entry.amount || 0)
        }))
      : [],
    recentTransaction: latestTransaction
      ? {
          category: latestTransaction.category,
          emoji: latestTransaction.emoji,
          date: latestTransaction.displayDate || latestTransaction.date || null
        }
      : null,
    totalTransactions: Number(report.totalTransactions || 0)
  }
}

async function callGroq(
  userId,
  message,
  context = {},
  config = assistantConfigService.getFlowiseConfig()
) {
  const financeContext = context.financeContext || (await buildFinanceContext(userId, context.month))
  const snapshot = buildGroqFinanceSnapshot(financeContext)
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), config.groqTimeoutMs)

  try {
    const response = await fetch(`${config.groqBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.groqApiKey}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.groqModel,
        temperature: 0.2,
        max_tokens: 320,
        messages: [
          {
            role: "system",
            content: [
              "You are Budget AI, the finance assistant inside Budget Flow.",
              "Answer using the finance snapshot provided below as your source of truth.",
              "Use the currencyCode in that snapshot whenever you mention money and do not assume USD.",
              "Be concise, practical, and numeric when possible.",
              "If data is missing, say that clearly instead of inventing values.",
              "Use short bullet points when it helps readability.",
              "Never give investment, legal, or tax advice."
            ].join(" ")
          },
          {
            role: "system",
            content: `Finance snapshot:\n${JSON.stringify(snapshot, null, 2)}`
          },
          {
            role: "user",
            content: message
          }
        ]
      })
    })

    const responseText = await response.text()
    let payload = {}

    if (responseText) {
      try {
        payload = JSON.parse(responseText)
      } catch (error) {
        payload = {
          message: responseText
        }
      }
    }

    if (!response.ok) {
      throw new Error(payload?.error?.message || payload?.message || "Groq chat request failed")
    }

    const reply = extractGroqReply(payload)

    if (!reply) {
      throw new Error("Groq did not return a text response")
    }

    return reply
  } catch (error) {
    if (error.name === "AbortError") {
      throw createHttpError(504, "Budget AI timed out")
    }

    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

async function callFlowise(
  userId,
  message,
  context = {},
  config = assistantConfigService.getFlowiseConfig()
) {
  const controller = new AbortController()
  const timeoutHandle = setTimeout(() => controller.abort(), config.timeoutMs)
  const headers = {
    "Content-Type": "application/json"
  }

  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
    headers["x-api-key"] = config.apiKey
  }

  try {
    const response = await fetch(`${config.baseUrl}/api/v1/prediction/${config.chatflowId}`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        question: message,
        overrideConfig: {
          sessionId: `budget-flow-user-${userId}`,
          vars: {
            budgetFlowUserId: String(userId),
            budgetFlowJwt: context.authToken || "",
            budgetFlowApiBaseUrl: resolveAiToolBaseUrl(),
            budgetFlowMonth: context.month || getMonthKey()
          }
        }
      })
    })

    const responseText = await response.text()
    let payload = {}

    if (responseText) {
      try {
        payload = JSON.parse(responseText)
      } catch (error) {
        payload = {
          text: responseText
        }
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Flowise prediction request failed")
    }

    const reply = extractFlowiseReply(payload)

    if (!reply) {
      throw new Error("Flowise did not return a text response")
    }

    return reply
  } catch (error) {
    if (error.name === "AbortError") {
      throw createHttpError(504, "Budget AI timed out")
    }

    throw error
  } finally {
    clearTimeout(timeoutHandle)
  }
}

async function buildRulesResponse(
  userId,
  message,
  month = getMonthKey(),
  config = assistantConfigService.getFlowiseConfig(),
  financeContext = null
) {
  const {
    dashboard,
    report,
    savings,
    latestTransaction,
    budgetSnapshot
  } = financeContext || (await buildFinanceContext(userId, month))

  const normalized = message.toLowerCase()
  let reply

  if (/(^|\b)(hi|hello|hey)\b/.test(normalized)) {
    reply = toBullets([
      `I can help with ${dashboard.monthLabel.toLowerCase()} budgets, spending trends, savings goals, and quick report summaries.`,
      budgetSnapshot.hasBudget
        ? `Right now you have used ${budgetSnapshot.progress}% of this month's budget.`
        : `You have recorded ${money(report.totals.expenses)} in expenses so far this month.`,
      "Ask me about your budget, recent spending, top categories, or savings progress."
    ])
  } else if (
    normalized.includes("budget") ||
    normalized.includes("limit") ||
    normalized.includes("remaining") ||
    normalized.includes("left to spend")
  ) {
    if (!budgetSnapshot.hasBudget) {
      reply = toBullets([
        `You have not set a monthly budget for ${dashboard.monthLabel} yet.`,
        `Recorded expenses so far: ${money(report.totals.expenses)}.`,
        `Expense categories with activity: ${report.expenseBreakdown.length}.`,
        "Set a monthly budget to track how much you have left to spend."
      ])
    } else {
      reply = toBullets([
        `${budgetSnapshot.monthLabel} budget: ${money(budgetSnapshot.spent)} spent out of ${money(
          budgetSnapshot.total
        )}.`,
        budgetSnapshot.isOverBudget
          ? `You are over budget by ${money(Math.abs(budgetSnapshot.remaining))}.`
          : `${money(budgetSnapshot.remaining)} is still available.`,
        `Tracked categories: ${budgetSnapshot.categoriesCount}.`,
        `Budget usage so far: ${budgetSnapshot.progress}%.`
      ])
    }
  } else if (
    normalized.includes("saving") ||
    normalized.includes("savings") ||
    normalized.includes("goal")
  ) {
    reply = toBullets([
      `Total saved across goals: ${money(savings.totalSaved)}.`,
      `Remaining to reach all goals: ${money(savings.remaining)}.`,
      `Overall savings progress: ${savings.progress}%.`
    ])
  } else if (
    normalized.includes("top category") ||
    normalized.includes("top spending")
  ) {
    const topCategory = report.topSpendingCategory
    reply = toBullets([
      topCategory
        ? `Top spending category this month is ${topCategory.emoji} ${topCategory.category} at ${money(
            topCategory.amount
          )}.`
        : "There is no spending category data yet for this month.",
      `Total expenses recorded: ${money(report.totals.expenses)}.`,
      `Total transactions this month: ${report.totalTransactions}.`
    ])
  } else if (
    normalized.includes("spend") ||
    normalized.includes("expense") ||
    normalized.includes("transaction") ||
    normalized.includes("activity")
  ) {
    const topCategory = report.topSpendingCategory
    reply = toBullets([
      `This month's expenses: ${money(report.totals.expenses)}.`,
      topCategory
        ? `Top spending category right now is ${topCategory.emoji} ${topCategory.category} at ${money(
            topCategory.amount
          )}.`
        : "No expense transactions have been recorded this month yet.",
      `Income recorded this month: ${money(report.totals.income)}.`,
      latestTransaction
        ? `Most recent activity: ${latestTransaction.emoji} ${latestTransaction.category} on ${latestTransaction.displayDate}.`
        : "There is no recent transaction activity yet."
    ])
  } else if (
    normalized.includes("report") ||
    normalized.includes("summary") ||
    normalized.includes("overview")
  ) {
    reply = toBullets([
      `Net savings this month: ${money(report.totals.netSavings)}.`,
      `Savings rate: ${report.totals.savingsRate}%.`,
      `Total transactions this month: ${report.totalTransactions}.`
    ])
  } else if (
    normalized.includes("help") ||
    normalized.includes("feature") ||
    normalized.includes("what can you do")
  ) {
    reply = toBullets([
      "I can help with budgets, spending summaries, savings goals, and report-style overviews.",
      "Ask about your budget status, spending pattern, recent activity, or savings progress.",
      "If Flowise is online, I can also answer with richer data-driven guidance."
    ])
  } else {
    reply = toBullets([
      `Current net balance for the month: ${money(dashboard.totals.netBalance)}.`,
      budgetSnapshot.hasBudget
        ? `Budget progress: ${budgetSnapshot.progress}% used.`
        : `Expenses recorded this month: ${money(report.totals.expenses)}.`,
      "Ask me about budgets, savings goals, reports, or spending trends for a more specific answer."
    ])
  }

  return {
    mode: "rules",
    message: reply,
    suggestions: assistantConfigService.getAssistantClientState(config, "rules").suggestions,
    assistant: assistantConfigService.getAssistantClientState(config, "rules")
  }
}

async function chat(userId, payload = {}, context = {}) {
  const message = sanitizeUserMessage(payload.message)
  const config = assistantConfigService.getFlowiseConfig()
  const month = context.month || getMonthKey()
  const shouldUseGroq = assistantConfigService.shouldUseGroq(config)
  const shouldUseFlowise = assistantConfigService.shouldUseFlowise(config)

  if (!shouldUseGroq && !shouldUseFlowise) {
    return buildRulesResponse(userId, message, month, config)
  }

  try {
    if (shouldUseGroq) {
      const financeContext = await buildFinanceContext(userId, month)
      const reply = await callGroq(
        userId,
        message,
        {
          ...context,
          month,
          financeContext
        },
        config
      )

      return {
        mode: "groq",
        message: reply,
        suggestions: assistantConfigService.getAssistantClientState(config, "groq").suggestions,
        assistant: assistantConfigService.getAssistantClientState(config, "groq")
      }
    }

    const reply = await callFlowise(userId, message, context, config)

    return {
      mode: "flowise",
      message: reply,
      suggestions: assistantConfigService.getAssistantClientState(config, "flowise").suggestions,
      assistant: assistantConfigService.getAssistantClientState(config, "flowise")
    }
  } catch (error) {
    console.error(
      `${shouldUseGroq ? "Groq" : "Flowise"} assistant request failed:`,
      error.message
    )

    const fallbackFinanceContext = shouldUseGroq
      ? await buildFinanceContext(userId, month)
      : null
    const fallback = await buildRulesResponse(
      userId,
      message,
      month,
      config,
      fallbackFinanceContext
    )

    return {
      ...fallback,
      mode: "rules-fallback",
      message: `Budget AI could not reach the live model right now, so here is a quick data-backed fallback.\n\n${fallback.message}`,
      assistant: assistantConfigService.getAssistantClientState(config, "rules-fallback")
    }
  }
}

module.exports = {
  chat
}
