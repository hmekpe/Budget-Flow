const pool = require("../config/db");
const { getCategoryEmoji, PAYMENT_METHODS } = require("../utils/constants");
const { getMonthDateRange, getWeekDays, parseMonthKey, toSqlDate } = require("../utils/date");

function formatDateLabel(value) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

function mapTransaction(row) {
  const amount = Number(row.amount);
  const type = row.type;

  return {
    id: row.id,
    type,
    category: row.category,
    emoji: getCategoryEmoji(row.category),
    amount,
    signedAmount: type === "expense" ? -amount : amount,
    paymentMethod: row.payment_method,
    note: row.note || "",
    name: row.note || row.category,
    occurredOn: row.occurred_on,
    displayDate: formatDateLabel(row.occurred_on),
    createdAt: row.created_at
  };
}

function normalizeLimit(limitValue) {
  if (limitValue === undefined || limitValue === null || limitValue === "") {
    return null;
  }

  const limit = Number(limitValue);

  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error("Limit must be a positive integer");
  }

  return limit;
}

async function listTransactions(userId, query = {}) {
  let sql = `
    SELECT id, type, category, amount, payment_method, note, occurred_on, created_at
    FROM transactions
    WHERE user_id = $1
  `;
  const values = [userId];
  let index = 2;

  if (query.type && ["income", "expense"].includes(query.type)) {
    sql += ` AND type = $${index++}`;
    values.push(query.type);
  }

  if (query.search) {
    sql += ` AND (category ILIKE $${index} OR COALESCE(note, '') ILIKE $${index})`;
    values.push(`%${String(query.search).trim()}%`);
    index += 1;
  }

  if (query.month) {
    const { start, endExclusive } = getMonthDateRange(query.month);
    sql += ` AND occurred_on >= $${index++} AND occurred_on < $${index++}`;
    values.push(start, endExclusive);
  }

  if (query.startDate) {
    sql += ` AND occurred_on >= $${index++}`;
    values.push(toSqlDate(query.startDate));
  }

  if (query.endDate) {
    sql += ` AND occurred_on <= $${index++}`;
    values.push(toSqlDate(query.endDate));
  }

  sql += " ORDER BY occurred_on DESC, created_at DESC";

  const limit = normalizeLimit(query.limit);
  if (limit) {
    sql += ` LIMIT $${index++}`;
    values.push(limit);
  }

  const { rows } = await pool.query(sql, values);
  return rows.map(mapTransaction);
}

async function createTransaction(userId, payload) {
  const type = String(payload.type || "expense").toLowerCase();
  const category = String(payload.category || "").trim();
  const amount = Number(payload.amount);
  const paymentMethod = String(payload.paymentMethod || payload.payment_method || "cash").toLowerCase();
  const note = String(payload.note || payload.description || payload.name || "").trim() || null;
  const occurredOn = toSqlDate(payload.occurredOn || payload.occurred_on || payload.date);

  if (!["income", "expense"].includes(type)) {
    throw new Error("Transaction type must be income or expense");
  }

  if (!category) {
    throw new Error("Category is required");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0");
  }

  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    throw new Error(`Payment method must be one of: ${PAYMENT_METHODS.join(", ")}`);
  }

  const { rows } = await pool.query(
    `INSERT INTO transactions (user_id, type, category, amount, payment_method, note, occurred_on)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, type, category, amount, payment_method, note, occurred_on, created_at`,
    [userId, type, category, amount, paymentMethod, note, occurredOn]
  );

  return mapTransaction(rows[0]);
}

async function deleteTransaction(userId, transactionId) {
  const { rows } = await pool.query(
    `DELETE FROM transactions
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [transactionId, userId]
  );

  if (!rows.length) {
    throw new Error("Transaction not found");
  }

  return { message: "Transaction deleted successfully" };
}

async function getTransactionTotals(userId, monthKey) {
  const { start, endExclusive } = getMonthDateRange(monthKey);
  const { rows } = await pool.query(
    `SELECT type, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1
       AND occurred_on >= $2
       AND occurred_on < $3
     GROUP BY type`,
    [userId, start, endExclusive]
  );

  const totals = { income: 0, expenses: 0 };

  rows.forEach((row) => {
    if (row.type === "income") {
      totals.income = Number(row.total);
    }

    if (row.type === "expense") {
      totals.expenses = Number(row.total);
    }
  });

  return totals;
}

async function getCategoryBreakdown(userId, monthKey, type = "expense") {
  const { start, endExclusive } = getMonthDateRange(monthKey);
  const { rows } = await pool.query(
    `SELECT category, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1
       AND type = $2
       AND occurred_on >= $3
       AND occurred_on < $4
     GROUP BY category
     ORDER BY total DESC, category ASC`,
    [userId, type, start, endExclusive]
  );

  return rows.map((row) => ({
    category: row.category,
    emoji: getCategoryEmoji(row.category),
    amount: Number(row.total)
  }));
}

async function countTransactions(userId, monthKey) {
  const { start, endExclusive } = getMonthDateRange(monthKey);
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM transactions
     WHERE user_id = $1
       AND occurred_on >= $2
       AND occurred_on < $3`,
    [userId, start, endExclusive]
  );

  return rows[0]?.count || 0;
}

async function getRecentTransactions(userId, limit = 5) {
  return listTransactions(userId, { limit });
}

async function getWeeklySpending(userId, referenceDate = new Date()) {
  const weekDays = getWeekDays(referenceDate);
  const start = weekDays[0].date;
  const end = weekDays[weekDays.length - 1].date;

  const { rows } = await pool.query(
    `SELECT occurred_on::date AS occurred_on, COALESCE(SUM(amount), 0) AS total
     FROM transactions
     WHERE user_id = $1
       AND type = 'expense'
       AND occurred_on BETWEEN $2 AND $3
     GROUP BY occurred_on::date`,
    [userId, start, end]
  );

  const lookup = new Map(
    rows.map((row) => [toSqlDate(row.occurred_on), Number(row.total)])
  );

  return weekDays.map((day) => ({
    label: day.label,
    amount: lookup.get(day.date) || 0,
    date: day.date
  }));
}

function resolveMonthKey(queryMonth) {
  return parseMonthKey(queryMonth).monthKey;
}

module.exports = {
  countTransactions,
  createTransaction,
  deleteTransaction,
  getCategoryBreakdown,
  getRecentTransactions,
  getTransactionTotals,
  getWeeklySpending,
  listTransactions,
  mapTransaction,
  resolveMonthKey
};
