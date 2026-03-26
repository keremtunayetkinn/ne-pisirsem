const { Ratelimit } = require('@upstash/ratelimit');
const { Redis } = require('@upstash/redis');

// Build Upstash-backed limiters only when env vars are present.
// Falls back to in-memory (best-effort) if not configured — safe for local dev.
function makeUpstashLimiter(requests, window) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
    prefix: 'rl',
  });
}

// In-memory fallback (resets on cold start, per-instance)
function makeMemoryLimiter(max, windowMs) {
  const map = new Map();
  return {
    async limit(ip) {
      const now = Date.now();
      const entry = map.get(ip);
      if (!entry || now - entry.start > windowMs) {
        map.set(ip, { start: now, count: 1 });
        return { success: true };
      }
      if (entry.count >= max) return { success: false };
      entry.count++;
      return { success: true };
    }
  };
}

// Lazily initialised so env vars are read at request time, not module load time
let _claudeLimiter = undefined;
let _pexelsLimiter = undefined;

function getClaudeLimiter() {
  if (_claudeLimiter === undefined) {
    _claudeLimiter = makeUpstashLimiter(10, '1 h') || makeMemoryLimiter(10, 3_600_000);
  }
  return _claudeLimiter;
}

function getPexelsLimiter() {
  if (_pexelsLimiter === undefined) {
    _pexelsLimiter = makeUpstashLimiter(30, '1 m') || makeMemoryLimiter(30, 60_000);
  }
  return _pexelsLimiter;
}

module.exports = { getClaudeLimiter, getPexelsLimiter };
