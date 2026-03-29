const buckets = new Map()

function toPositiveInteger(value, fallback) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function pruneExpiredBuckets(now) {
  if (buckets.size < 500) {
    return
  }

  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

function createRateLimiter(options = {}) {
  const windowMs = toPositiveInteger(options.windowMs, 60000)
  const max = toPositiveInteger(options.max, 15)
  const message = options.message || "Too many requests. Please try again shortly."
  const keyGenerator =
    typeof options.keyGenerator === "function"
      ? options.keyGenerator
      : (req) => `${req.user?.id || req.ip}:${req.method}:${req.baseUrl}${req.path}`

  return (req, res, next) => {
    const now = Date.now()
    pruneExpiredBuckets(now)

    const key = keyGenerator(req)
    const existing = buckets.get(key)

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      })

      return next()
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000))
      res.set("Retry-After", String(retryAfterSeconds))
      return res.status(429).json({ message })
    }

    existing.count += 1
    buckets.set(key, existing)
    return next()
  }
}

module.exports = {
  createRateLimiter
}
