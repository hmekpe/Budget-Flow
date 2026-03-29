function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonthKey(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function parseMonthKey(monthKey = getMonthKey()) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error("Month must be in YYYY-MM format");
  }

  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Month must be in YYYY-MM format");
  }

  return {
    year,
    month,
    monthKey: `${year}-${pad(month)}`
  };
}

function getMonthDateRange(monthKey = getMonthKey()) {
  const { year, month } = parseMonthKey(monthKey);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    start: `${year}-${pad(month)}-01`,
    endExclusive: `${nextYear}-${pad(nextMonth)}-01`
  };
}

function getMonthLabel(monthKey = getMonthKey()) {
  const { year, month } = parseMonthKey(monthKey);

  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function toSqlDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return formatLocalDate(date);
}

function getWeekDays(referenceDate = new Date()) {
  const anchor = referenceDate instanceof Date ? new Date(referenceDate) : new Date(referenceDate);

  if (Number.isNaN(anchor.getTime())) {
    throw new Error("Invalid reference date");
  }

  anchor.setHours(0, 0, 0, 0);
  const offset = (anchor.getDay() + 6) % 7;
  anchor.setDate(anchor.getDate() - offset);

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(anchor);
    current.setDate(anchor.getDate() + index);

    return {
      label: current.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC"
      }),
      date: formatLocalDate(current)
    };
  });
}

module.exports = {
  getMonthDateRange,
  getMonthKey,
  getMonthLabel,
  getWeekDays,
  parseMonthKey,
  toSqlDate
};
