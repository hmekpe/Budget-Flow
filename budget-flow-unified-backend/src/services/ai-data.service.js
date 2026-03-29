const budgetsService = require("./budgets.service")
const dashboardService = require("./dashboard.service")
const reportsService = require("./reports.service")
const savingsService = require("./savings.service")
const settingsService = require("./settings.service")
const transactionsService = require("./transactions.service")
const { getMonthKey, getMonthLabel, parseMonthKey } = require("../utils/date")
const createHttpError = require("../utils/httpError")

const cache = new Map()

function toPositiveInteger(value, fallback, max = null) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  if (max && parsed > max) {
    return max
  }

  return parsed
}

function getCacheTtlMs() {
  return toPositiveInteger(process.env.AI_CACHE_TTL_MS, 30000)
}

function getCachedValue(key) {
  const cached = cache.get(key)

  if (!cached) {
    return null
  }

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  return cached.value
}

function setCachedValue(key, value) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + getCacheTtlMs()
  })

  if (cache.size > 200) {
    for (const [entryKey, entry] of cache.entries()) {
      if (entry.expiresAt <= Date.now()) {
        cache.delete(entryKey)
      }
    }
  }
}

async function remember(key, loader) {
  const cached = getCachedValue(key)

  if (cached) {
    return cached
  }

  const value = await loader()
  setCachedValue(key, value)
  return value
}

function normalizeMonth(month) {
  return month ? parseMonthKey(month).monthKey : getMonthKey()
}

function normalizeTransactionLimit(limit) {
  return toPositiveInteger(limit, 10, 25)
}

function toPercent(part, total) {
  if (!total) {
    return 0
  }

  return Number(((part / total) * 100).toFixed(1))
}

function toAiTransaction(transaction) {
  return {
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    emoji: transaction.emoji,
    amount: transaction.amount,
    signedAmount: transaction.signedAmount,
    paymentMethod: transaction.paymentMethod,
    note: transaction.note,
    occurredOn: transaction.occurredOn,
    displayDate: transaction.displayDate
  }
}

function createInsight(key, severity, title, detail, metrics = {}) {
  return {
    key,
    severity,
    title,
    detail,
    metrics
  }
}

async function getSummary(userId, month = getMonthKey()) {
  const normalizedMonth = normalizeMonth(month)

  return remember(`summary:${userId}:${normalizedMonth}`, async () => {
    const [dashboard, report, savings, preferences] = await Promise.all([
      dashboardService.getDashboardSummary(userId, normalizedMonth),
      reportsService.getCurrentReport(userId, normalizedMonth),
      savingsService.getSavingsSummary(userId),
      settingsService.getPreferences(userId)
    ])

    return {
      month: normalizedMonth,
      monthLabel: dashboard.monthLabel,
      generatedAt: new Date().toISOString(),
      currency: preferences.currency,
      totals: dashboard.totals,
      budget: {
        total: dashboard.budget.total,
        spent: dashboard.budget.spent,
        remaining: dashboard.budget.remaining,
        progress: dashboard.budget.progress,
        isOverBudget: dashboard.budget.isOverBudget,
        categoriesCount: dashboard.budget.categoriesCount
      },
      savings: {
        totalSaved: savings.totalSaved,
        totalTarget: savings.totalTarget,
        remaining: savings.remaining,
        goalsCount: savings.goalsCount,
        progress: savings.progress
      },
      report: {
        totalTransactions: report.totalTransactions,
        savingsRate: report.totals.savingsRate,
        topSpendingCategory: report.topSpendingCategory
      }
    }
  })
}

async function getCategories(userId, month = getMonthKey()) {
  const normalizedMonth = normalizeMonth(month)
  const [expenseCategories, incomeCategories, budget] = await Promise.all([
    transactionsService.getCategoryBreakdown(userId, normalizedMonth, "expense"),
    transactionsService.getCategoryBreakdown(userId, normalizedMonth, "income"),
    budgetsService.getCurrentBudget(userId, normalizedMonth)
  ])

  const expenseTotal = expenseCategories.reduce((sum, item) => sum + item.amount, 0)
  const incomeTotal = incomeCategories.reduce((sum, item) => sum + item.amount, 0)
  const budgetByName = new Map(
    budget.categories.map((category) => [String(category.name).toLowerCase(), category])
  )

  const enrichCategory = (item, total) => {
    const linkedBudget = budgetByName.get(String(item.category).toLowerCase())

    return {
      category: item.category,
      emoji: item.emoji,
      amount: item.amount,
      share: toPercent(item.amount, total),
      budgetLimit: linkedBudget ? linkedBudget.limit : null,
      budgetSpent: linkedBudget ? linkedBudget.spent : null,
      budgetRemaining: linkedBudget ? linkedBudget.remaining : null,
      budgetStatus: linkedBudget
        ? linkedBudget.isOverBudget
          ? "over"
          : linkedBudget.progress >= 80
            ? "warning"
            : "ok"
        : "untracked"
    }
  }

  return {
    month: normalizedMonth,
    monthLabel: getMonthLabel(normalizedMonth),
    topExpenseCategories: expenseCategories.slice(0, 8).map((item) => enrichCategory(item, expenseTotal)),
    topIncomeCategories: incomeCategories.slice(0, 8).map((item) => enrichCategory(item, incomeTotal))
  }
}

async function getTransactions(userId, query = {}) {
  const month =
    query.month !== undefined && query.month !== null && String(query.month).trim()
      ? normalizeMonth(query.month)
      : null
  const limit = normalizeTransactionLimit(query.limit)

  const transactions = await transactionsService.listTransactions(userId, {
    month,
    limit
  })

  return {
    month,
    limit,
    total: transactions.length,
    transactions: transactions.map(toAiTransaction)
  }
}

async function getInsights(userId, month = getMonthKey()) {
  const normalizedMonth = normalizeMonth(month)

  return remember(`insights:${userId}:${normalizedMonth}`, async () => {
    const [dashboard, report, savings, recentTransactions] = await Promise.all([
      dashboardService.getDashboardSummary(userId, normalizedMonth),
      reportsService.getCurrentReport(userId, normalizedMonth),
      savingsService.getSavingsSummary(userId),
      transactionsService.getRecentTransactions(userId, 5)
    ])

    const insights = []
    const netBalance = dashboard.totals.netBalance

    if (report.totalTransactions === 0) {
      insights.push(
        createInsight(
          "no-transactions",
          "info",
          "No transactions recorded yet",
          `No income or expense transactions have been recorded for ${dashboard.monthLabel}.`,
          { totalTransactions: 0 }
        )
      )
    } else {
      if (netBalance < 0) {
        insights.push(
          createInsight(
            "negative-cashflow",
            "high",
            "Expenses are above income",
            `Recorded expenses are ${Math.abs(netBalance).toFixed(2)} higher than recorded income for ${dashboard.monthLabel}.`,
            {
              income: dashboard.totals.income,
              expenses: dashboard.totals.expenses,
              netBalance
            }
          )
        )
      } else {
        insights.push(
          createInsight(
            "positive-cashflow",
            "info",
            "Income is covering expenses",
            `Recorded income is ${netBalance.toFixed(2)} above recorded expenses for ${dashboard.monthLabel}.`,
            {
              income: dashboard.totals.income,
              expenses: dashboard.totals.expenses,
              netBalance
            }
          )
        )
      }

      if (dashboard.budget.total > 0) {
        if (dashboard.budget.isOverBudget) {
          insights.push(
            createInsight(
              "over-budget",
              "high",
              "Monthly budget has been exceeded",
              `Budget spending is ${Math.abs(dashboard.budget.remaining).toFixed(2)} above the monthly limit.`,
              {
                budgetTotal: dashboard.budget.total,
                budgetSpent: dashboard.budget.spent,
                budgetRemaining: dashboard.budget.remaining,
                budgetProgress: dashboard.budget.progress
              }
            )
          )
        } else if (dashboard.budget.progress >= 80) {
          insights.push(
            createInsight(
              "budget-warning",
              "medium",
              "Budget is close to the limit",
              `${dashboard.budget.progress}% of the monthly budget has already been used.`,
              {
                budgetTotal: dashboard.budget.total,
                budgetSpent: dashboard.budget.spent,
                budgetRemaining: dashboard.budget.remaining,
                budgetProgress: dashboard.budget.progress
              }
            )
          )
        }
      }

      if (report.topSpendingCategory) {
        insights.push(
          createInsight(
            "top-category",
            toPercent(report.topSpendingCategory.amount, report.totals.expenses) >= 40 ? "medium" : "info",
            "Largest expense category identified",
            `${report.topSpendingCategory.category} is the top expense category for ${dashboard.monthLabel}.`,
            {
              category: report.topSpendingCategory.category,
              amount: report.topSpendingCategory.amount,
              shareOfExpenses: toPercent(report.topSpendingCategory.amount, report.totals.expenses)
            }
          )
        )
      }
    }

    if (savings.goalsCount === 0) {
      insights.push(
        createInsight(
          "no-savings-goals",
          "info",
          "No savings goals have been created",
          "There are no active savings goals in the account yet.",
          {
            goalsCount: 0
          }
        )
      )
    } else if (savings.progress < 25) {
      insights.push(
        createInsight(
          "savings-low-progress",
          "medium",
          "Savings progress is still early",
          `Savings goals are ${savings.progress}% funded overall.`,
          {
            totalSaved: savings.totalSaved,
            totalTarget: savings.totalTarget,
            savingsProgress: savings.progress
          }
        )
      )
    } else if (savings.progress >= 80) {
      insights.push(
        createInsight(
          "savings-near-complete",
          "info",
          "Savings goals are close to completion",
          `Savings goals are ${savings.progress}% funded overall.`,
          {
            totalSaved: savings.totalSaved,
            totalTarget: savings.totalTarget,
            savingsProgress: savings.progress
          }
        )
      )
    }

    return {
      month: normalizedMonth,
      monthLabel: dashboard.monthLabel,
      snapshot: {
        income: report.totals.income,
        expenses: report.totals.expenses,
        netSavings: report.totals.netSavings,
        savingsRate: report.totals.savingsRate,
        budgetProgress: dashboard.budget.progress,
        savingsProgress: savings.progress,
        totalTransactions: report.totalTransactions
      },
      insights,
      recentTransactions: recentTransactions.map(toAiTransaction)
    }
  })
}

async function getToolPayload(toolName, userId, query = {}) {
  switch (toolName) {
    case "summary":
      return getSummary(userId, query.month)
    case "categories":
      return getCategories(userId, query.month)
    case "transactions":
      return getTransactions(userId, query)
    case "insights":
      return getInsights(userId, query.month)
    default:
      throw createHttpError(404, "AI tool endpoint not found")
  }
}

module.exports = {
  getCategories,
  getInsights,
  getSummary,
  getToolPayload,
  getTransactions
}
