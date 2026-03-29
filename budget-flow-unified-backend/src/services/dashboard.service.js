const budgetsService = require("./budgets.service");
const metaService = require("./meta.service");
const reportsService = require("./reports.service");
const savingsService = require("./savings.service");
const settingsService = require("./settings.service");
const transactionsService = require("./transactions.service");
const { getMonthKey, getMonthLabel, parseMonthKey } = require("../utils/date");

async function getDashboardSummary(userId, monthKey = getMonthKey()) {
  const normalizedMonth = parseMonthKey(monthKey).monthKey;
  const [totals, weeklySpending, categoryBreakdown, recentTransactions, budget, savings] =
    await Promise.all([
      transactionsService.getTransactionTotals(userId, normalizedMonth),
      transactionsService.getWeeklySpending(userId),
      transactionsService.getCategoryBreakdown(userId, normalizedMonth, "expense"),
      transactionsService.getRecentTransactions(userId, 5),
      budgetsService.getCurrentBudget(userId, normalizedMonth),
      savingsService.getSavingsSummary(userId)
    ]);

  return {
    month: normalizedMonth,
    monthLabel: getMonthLabel(normalizedMonth),
    totals: {
      income: totals.income,
      expenses: totals.expenses,
      netBalance: Number((totals.income - totals.expenses).toFixed(2))
    },
    weeklySpending,
    categoryBreakdown,
    recentTransactions,
    budget,
    savings
  };
}

async function getBootstrap(userId, monthKey = getMonthKey()) {
  const normalizedMonth = parseMonthKey(monthKey).monthKey;
  const [dashboard, budget, savings, settings, transactions, report] = await Promise.all([
    getDashboardSummary(userId, normalizedMonth),
    budgetsService.getCurrentBudget(userId, normalizedMonth),
    savingsService.getSavingsSnapshot(userId),
    settingsService.getSettingsBundle(userId),
    transactionsService.listTransactions(userId, { month: normalizedMonth, limit: 20 }),
    reportsService.getCurrentReport(userId, normalizedMonth)
  ]);

  return {
    month: normalizedMonth,
    meta: metaService.getMeta(),
    dashboard,
    budget,
    savings,
    settings,
    transactions,
    report
  };
}

module.exports = {
  getBootstrap,
  getDashboardSummary
};
