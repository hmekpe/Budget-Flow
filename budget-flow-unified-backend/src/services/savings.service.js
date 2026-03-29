const pool = require("../config/db");
const { getMonthKey, toSqlDate } = require("../utils/date");

function toAmount(value) {
  return Number(value || 0);
}

function mapGoal(row) {
  const target = toAmount(row.target_amount);
  const saved = toAmount(row.current_amount);
  const progress = target > 0 ? Number(Math.min((saved / target) * 100, 100).toFixed(1)) : 0;

  return {
    id: row.id,
    emoji: row.emoji,
    name: row.name,
    target,
    saved,
    remaining: Number((target - saved).toFixed(2)),
    progress,
    deadline: row.deadline,
    isComplete: saved >= target
  };
}

async function listGoals(userId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at
     FROM savings_goals
     WHERE user_id = $1
     ORDER BY created_at ASC, id ASC`,
    [userId]
  );

  return rows.map(mapGoal);
}

async function getGoalRow(userId, goalId) {
  const { rows } = await pool.query(
    `SELECT id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at
     FROM savings_goals
     WHERE id = $1 AND user_id = $2
     LIMIT 1`,
    [goalId, userId]
  );

  if (!rows.length) {
    throw new Error("Savings goal not found");
  }

  return rows[0];
}

async function createGoal(userId, payload) {
  const name = String(payload.name || "").trim();
  const emoji = String(payload.emoji || "\u{1F3D6}\uFE0F").trim() || "\u{1F3D6}\uFE0F";
  const target = Number(payload.target || payload.targetAmount || payload.target_amount);
  const deadline = payload.deadline ? toSqlDate(payload.deadline) : null;

  if (!name) {
    throw new Error("Goal name is required");
  }

  if (!Number.isFinite(target) || target <= 0) {
    throw new Error("Target amount must be greater than 0");
  }

  const { rows } = await pool.query(
    `INSERT INTO savings_goals (user_id, emoji, name, target_amount, current_amount, deadline)
     VALUES ($1, $2, $3, $4, 0, $5)
     RETURNING id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at`,
    [userId, emoji, name, target, deadline]
  );

  return mapGoal(rows[0]);
}

async function updateGoal(userId, goalId, payload) {
  const existing = await getGoalRow(userId, goalId);
  const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
  const emoji =
    payload.emoji !== undefined
      ? String(payload.emoji).trim() || "\u{1F3D6}\uFE0F"
      : existing.emoji || "\u{1F3D6}\uFE0F";
  const target =
    payload.target !== undefined || payload.targetAmount !== undefined || payload.target_amount !== undefined
      ? Number(payload.target ?? payload.targetAmount ?? payload.target_amount)
      : toAmount(existing.target_amount);
  const deadline =
    payload.deadline !== undefined
      ? payload.deadline
        ? toSqlDate(payload.deadline)
        : null
      : existing.deadline;

  if (!name) {
    throw new Error("Goal name is required");
  }

  if (!Number.isFinite(target) || target <= 0) {
    throw new Error("Target amount must be greater than 0");
  }

  const { rows } = await pool.query(
    `UPDATE savings_goals
     SET name = $1,
         emoji = $2,
         target_amount = $3,
         deadline = $4,
         updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at`,
    [name, emoji, target, deadline, goalId, userId]
  );

  return mapGoal(rows[0]);
}

async function deleteGoal(userId, goalId) {
  const { rows } = await pool.query(
    `DELETE FROM savings_goals
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [goalId, userId]
  );

  if (!rows.length) {
    throw new Error("Savings goal not found");
  }

  return { message: "Savings goal deleted successfully" };
}

async function recordGoalEntry(client, userId, goalId, entryType, amount, note) {
  void note;

  await client.query(
    `INSERT INTO savings_entries (goal_id, user_id, type, amount)
     VALUES ($1, $2, $3, $4)`,
    [goalId, userId, entryType, amount]
  );
}

async function depositToGoal(userId, goalId, payload) {
  const amount = Number(payload.amount);
  const note = String(payload.note || "Manual savings deposit").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Deposit amount must be greater than 0");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE savings_goals
       SET current_amount = current_amount + $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at`,
      [amount, goalId, userId]
    );

    if (!rows.length) {
      throw new Error("Savings goal not found");
    }

    await recordGoalEntry(client, userId, goalId, "deposit", amount, note);
    await client.query("COMMIT");

    return mapGoal(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function withdrawFromGoal(userId, goalId, payload) {
  const amount = Number(payload.amount);
  const note = String(payload.note || "Manual savings withdrawal").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Withdrawal amount must be greater than 0");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT current_amount
       FROM savings_goals
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [goalId, userId]
    );

    if (!existing.rows.length) {
      throw new Error("Savings goal not found");
    }

    const currentAmount = toAmount(existing.rows[0].current_amount);

    if (amount > currentAmount) {
      throw new Error("Insufficient savings in this goal");
    }

    const { rows } = await client.query(
      `UPDATE savings_goals
       SET current_amount = current_amount - $1,
           updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, user_id, emoji, name, target_amount, current_amount, deadline, created_at, updated_at`,
      [amount, goalId, userId]
    );

    await recordGoalEntry(client, userId, goalId, "withdrawal", amount, note);
    await client.query("COMMIT");

    return mapGoal(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getSavingsSummary(userId) {
  const goals = await listGoals(userId);
  const totalSaved = goals.reduce((sum, goal) => sum + goal.saved, 0);
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target, 0);

  return {
    month: getMonthKey(),
    totalSaved,
    totalTarget,
    remaining: Number((totalTarget - totalSaved).toFixed(2)),
    goalsCount: goals.length,
    progress: totalTarget > 0 ? Number(Math.min((totalSaved / totalTarget) * 100, 100).toFixed(1)) : 0
  };
}

async function getSavingsSnapshot(userId) {
  const [summary, goals] = await Promise.all([getSavingsSummary(userId), listGoals(userId)]);

  return {
    summary,
    goals
  };
}

module.exports = {
  createGoal,
  deleteGoal,
  depositToGoal,
  getSavingsSnapshot,
  getSavingsSummary,
  listGoals,
  updateGoal,
  withdrawFromGoal
};
