const { CURRENCIES } = require("../utils/constants");

const RATE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EXCHANGE_RATE_API_BASE = "https://open.er-api.com/v6/latest";
const allowedCurrencyCodes = new Set(CURRENCIES.map((item) => item.code));
const rateCache = new Map();

function normalizeCurrencyCode(value) {
  return String(value || "").trim().toUpperCase();
}

function validateCurrencyCode(code, label) {
  if (!allowedCurrencyCodes.has(code)) {
    throw new Error(`Unsupported ${label}`);
  }
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `Exchange rate request failed with status ${response.status}`);
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function getExchangeRate(baseCurrency, targetCurrency) {
  const base = normalizeCurrencyCode(baseCurrency);
  const target = normalizeCurrencyCode(targetCurrency);

  validateCurrencyCode(base, "base currency");
  validateCurrencyCode(target, "target currency");

  if (base === target) {
    return {
      base,
      target,
      rate: 1,
      asOf: new Date().toISOString(),
      source: "identity"
    };
  }

  const cacheKey = `${base}:${target}`;
  const cached = rateCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const payload = await fetchJson(`${EXCHANGE_RATE_API_BASE}/${encodeURIComponent(base)}`);
    const rate = Number(payload?.rates?.[target]);

    if (payload?.result !== "success") {
      throw new Error(payload?.["error-type"] || "Exchange rate provider returned an unsuccessful response");
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Exchange rate provider returned an invalid rate");
    }

    const nextUpdateMs = Number(payload?.time_next_update_unix || 0) * 1000;
    const cacheExpiresAt = Number.isFinite(nextUpdateMs) && nextUpdateMs > Date.now()
      ? nextUpdateMs
      : Date.now() + RATE_CACHE_TTL_MS;

    const value = {
      base,
      target,
      rate,
      asOf: payload.time_last_update_utc || new Date().toISOString(),
      source: "ExchangeRate-API",
      attributionUrl: "https://www.exchangerate-api.com"
    };

    rateCache.set(cacheKey, {
      value,
      expiresAt: cacheExpiresAt
    });

    return value;
  } catch (error) {
    if (cached) {
      return cached.value;
    }

    throw error;
  }
}

module.exports = {
  getExchangeRate
};
