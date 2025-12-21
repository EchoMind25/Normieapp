import rateLimit from "express-rate-limit";

// Strict limiter for login/signup attempts (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts, try again later" },
  validate: { xForwardedForHeader: false },
});

// Generous limiter for session-check endpoints (called on every page load)
export const authSessionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: "Too many requests, try again later" },
  validate: { xForwardedForHeader: false },
});

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests, try again later" },
  validate: { xForwardedForHeader: false },
});

// Embed rate limiter (more restrictive for external usage)
export const embedLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  message: { error: "Rate limit exceeded for embed API" },
  validate: { xForwardedForHeader: false },
});
