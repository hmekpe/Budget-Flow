const pool = require("../config/db");
const { getMonthKey, getMonthLabel, parseMonthKey } = require("../utils/date");

function toAmount(value) {
  return Number(value || 0);
}

function mapCategory(row) {
  const limit = toAmount(row.monthly_limit);
  const spent = toAmount(row.spent_amount);
  const progress = limit > 0 ? Number(Math.min((spent / limit) * 100, 100).toFixed(1)) : 0;

  return {
    id: row.id,
    budgetId: null,
    emoji: row.emoji,
    name: row.name,
    limit,
    spent,
    progress,
    remaining: Number((limit - spent).toFixed(2)),
    isOverBudget: spent > limit
  };
}

async function getBudgetRow(userId, monthKey = getMonthKey()) {
  const { year, month } = parseMonthKey(monthKey);
  const { rows } = await pool.query(
    `SELECT id, user_id, year, month, amount, created_at, updated_at
     FROM monthly_budgets
     WHERE user_id = $1 AND year = $2 AND month = $3
     LIMIT 1`,
    [userId, year, month]
  );

  return rows[0] || null;
}

async function ensureBudgetRow(userId, monthKey = getMonthKey()) {
  const { year, month } = parseMonthKey(monthKey);
  const { rows } = await pool.query(
    `INSERT INTO monthly_budgets (user_id, year, month, amount)
     VALUES ($1, $2, $3, 0)
     ON CONFLICT (user_id, year, month)
     DO UPDATE SET updated_at = NOW()
     RETURNING id, user_id, year, month, amount, created_at, updated_at`,
    [userId, year, month]
  );

  return rows[0];
}

async function getCategoriesForBudget(userId, budgetId) {
  void budgetId;

  const { rows } = await pool.query(
    `SELECT id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at
     FROM budget_categories
     WHERE user_id = $1
     ORDER BY created_at ASC, id ASC`,
    [userId]
  );

  return rows.map(mapCategory);
}

async function getCurrentBudget(userId, monthKey = getMonthKey()) {
  const normalizedMonth = parseMonthKey(monthKey).monthKey;
  const budgetRow = await getBudgetRow(userId, normalizedMonth);
  const categories = budgetRow ? await getCategoriesForBudget(userId, budgetRow.id) : [];
  const total = budgetRow ? toAmount(budgetRow.amount) : 0;
  const spent = categories.reduce((sum, category) => sum + category.spent, 0);
  const remaining = Number((total - spent).toFixed(2));
  const progress = total > 0 ? Number(Math.min((spent / total) * 100, 100).toFixed(1)) : 0;

  return {
    month: normalizedMonth,
    monthLabel: getMonthLabel(normalizedMonth),
    total,
    spent,
    remaining,
    progress,
    isOverBudget: total > 0 && spent > total,
    categoriesCount: categories.length,
    categories
  };
}

async function setCurrentBudget(userId, payload) {
  const monthKey = parseMonthKey(payload.month || getMonthKey()).monthKey;
  const amount = Number(payload.total || payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Budget total must be greater than 0");
  }

  const { year, month } = parseMonthKey(monthKey);

  await pool.query(
    `INSERT INTO monthly_budgets (user_id, year, month, amount)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, year, month)
     DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()`,
    [userId, year, month, amount]
  );

  return getCurrentBudget(userId, monthKey);
}

async function listBudgetCategories(userId, monthKey = getMonthKey()) {
  const budget = await getCurrentBudget(userId, monthKey);
  return budget.categories;
}

async function addBudgetCategory(userId, payload) {
  const monthKey = parseMonthKey(payload.month || getMonthKey()).monthKey;
  const name = String(payload.name || "").trim();
  const emoji = String(payload.emoji || "\u{1F4CC}").trim() || "\u{1F4CC}";
  const limit = Number(payload.limit);

  if (!name) {
    throw new Error("Category name is required");
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Category limit must be greater than 0");
  }

  await ensureBudgetRow(userId, monthKey);

  const { rows } = await pool.query(
    `INSERT INTO budget_categories (user_id, emoji, name, monthly_limit, spent_amount)
     VALUES ($1, $2, $3, $4, 0)
     RETURNING id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at`,
    [userId, emoji, name, limit]
  );

  return mapCategory(rows[0]);
}

async function getOwnedCategory(userId, categoryId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at
     FROM budget_categories
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [categoryId, userId]
  );

  if (!rows.length) {
    throw new Error("Budget category not found");
  }

  return rows[0];
}

async function updateBudgetCategory(userId, categoryId, payload) {
  const existing = await getOwnedCategory(userId, categoryId);
  const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
  const emoji =
    payload.emoji !== undefined
      ? String(payload.emoji).trim() || "\u{1F4CC}"
      : existing.emoji || "\u{1F4CC}";
  const limit = payload.limit !== undefined ? Number(payload.limit) : toAmount(existing.monthly_limit);

  if (!name) {
    throw new Error("Category name is required");
  }

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error("Category limit must be greater than 0");
  }

  const { rows } = await pool.query(
    `UPDATE budget_categories
     SET name = $1,
         emoji = $2,
         monthly_limit = $3,
         updated_at = NOW()
     WHERE id = $4 AND user_id = $5
     RETURNING id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at`,
    [name, emoji, limit, categoryId, userId]
  );

  return mapCategory(rows[0]);
}

async function deleteBudgetCategory(userId, categoryId) {
  const { rows } = await pool.query(
    `DELETE FROM budget_categories
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [categoryId, userId]
  );

  if (!rows.length) {
    throw new Error("Budget category not found");
  }

  return { message: "Budget category deleted successfully" };
}

async function logBudgetSpend(userId, categoryId, payload) {
  const amount = Number(payload.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Spend amount must be greater than 0");
  }

  const { rows } = await pool.query(
    `UPDATE budget_categories
     SET spent_amount = spent_amount + $1,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at`,
    [amount, categoryId, userId]
  );

  if (!rows.length) {
    throw new Error("Budget category not found");
  }

  return mapCategory(rows[0]);
}

async function correctBudgetSpend(userId, categoryId, payload) {
  const amount = Number(payload.amount);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Corrected spend must be 0 or greater");
  }

  const { rows } = await pool.query(
    `UPDATE budget_categories
     SET spent_amount = $1,
         updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING id, user_id, emoji, name, monthly_limit, spent_amount, created_at, updated_at`,
    [amount, categoryId, userId]
  );

  if (!rows.length) {
    throw new Error("Budget category not found");
  }

  return mapCategory(rows[0]);
}

module.exports = {
  addBudgetCategory,
  correctBudgetSpend,
  deleteBudgetCategory,
  getCurrentBudget,
  listBudgetCategories,
  logBudgetSpend,
  setCurrentBudget,
  updateBudgetCategory
};
