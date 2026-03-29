const budgetsService = require("./budgets.service");
const transactionsService = require("./transactions.service");
const { getMonthKey, getMonthLabel, parseMonthKey } = require("../utils/date");

async function getCurrentReport(userId, monthKey = getMonthKey()) {
  const normalizedMonth = parseMonthKey(monthKey).monthKey;
  const [totals, incomeSources, expenseBreakdown, totalTransactions, budget] = await Promise.all([
    transactionsService.getTransactionTotals(userId, normalizedMonth),
    transactionsService.getCategoryBreakdown(userId, normalizedMonth, "income"),
    transactionsService.getCategoryBreakdown(userId, normalizedMonth, "expense"),
    transactionsService.countTransactions(userId, normalizedMonth),
    budgetsService.getCurrentBudget(userId, normalizedMonth)
  ]);

  const netSavings = Number((totals.income - totals.expenses).toFixed(2));
  const savingsRate =
    totals.income > 0 ? Number(((netSavings / totals.income) * 100).toFixed(1)) : 0;

  return {
    month: normalizedMonth,
    monthLabel: getMonthLabel(normalizedMonth),
    totals: {
      income: totals.income,
      expenses: totals.expenses,
      netSavings,
      savingsRate
    },
    incomeSources,
    expenseBreakdown,
    topSpendingCategory: expenseBreakdown[0] || null,
    totalTransactions,
    trackedBudgetCategories: budget.categories.length,
    budgetComparison: budget.categories.map((category) => ({
      id: category.id,
      category: category.name,
      emoji: category.emoji,
      spent: category.spent,
      limit: category.limit,
      difference: Number((category.limit - category.spent).toFixed(2)),
      status: category.spent > category.limit ? "over" : category.progress >= 80 ? "warning" : "ok"
    }))
  };
}

module.exports = {
  getCurrentReport
};
