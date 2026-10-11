import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * Lightweight in-memory Rate Limiter middleware to prevent DoS/brute-force abuse
 * on sensitive security and terminal command API endpoints.
 */
export function createRateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
}) {
  const windowMs = options.windowMs ?? 60_000; // 1 minute default
  const max = options.max ?? 30; // 30 requests per window default
  const message = options.message ?? "Слишком много запросов. Пожалуйста, повторите попытку позже.";

  const hits = new Map<string, RateLimitRecord>();

  // Cleanup expired entries every minute to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, windowMs);

  // Unref interval if running in Node environment to allow graceful process termination
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    const record = hits.get(ip);

    if (!record || now > record.resetTime) {
      hits.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      next();
      return;
    }

    if (record.count >= max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    record.count += 1;
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - record.count));
    next();
  };
}
