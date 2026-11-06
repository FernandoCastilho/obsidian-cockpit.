// One publication window for news only. Indicator histories and event dates are unrelated.
export const NEWS_WINDOW_DAYS = 5
export const NEWS_WINDOW_HOURS = 120
export const NEWS_WINDOW_MS = NEWS_WINDOW_HOURS * 60 * 60 * 1000

// Inclusive endpoints: [now - 120 hours, now]. No future-date tolerance.
export function inNewsWindow(t, now = Date.now(), windowMs = NEWS_WINDOW_MS) {
  return Number.isFinite(now) && Number.isFinite(t) && t > 0 && t >= now - Math.min(windowMs, NEWS_WINDOW_MS) && t <= now
}

// Legacy RSS items store the original pubDate in t. Collection/generation/event dates
// must never be used to revive an expired or undated article.
export const recentNews = (items, now = Date.now(), windowMs = NEWS_WINDOW_MS) =>
  (Array.isArray(items) ? items : []).filter(item => inNewsWindow(item?.t, now, windowMs))

export function newsCollectionStale(data, now = Date.now()) {
  const generated = typeof data?.generatedAt === 'number' ? data.generatedAt : Date.parse(data?.generatedAt)
  const stale = data?.stale
  return Boolean((stale && (typeof stale !== 'object' || Object.keys(stale).length)) || data?.error || data?.errors?.length || !Number.isFinite(generated) || generated > now || now - generated > 3 * 3600000)
}
