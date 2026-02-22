'use strict';

const rateLimit = require('express-rate-limit');

// Global limiter: 200 req per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' }
});

// Auth endpoints: 15 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
  skipSuccessfulRequests: true
});

// Manual news refresh: configurable cooldown per IP
const refreshCooldownMs = parseInt(process.env.MANUAL_REFRESH_COOLDOWN_MINUTES || '30') * 60 * 1000;
const refreshLimiter = rateLimit({
  windowMs: refreshCooldownMs,
  max: 1,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Please wait ${process.env.MANUAL_REFRESH_COOLDOWN_MINUTES || 30} minutes between manual refreshes.` }
});

// Password reset: 5 requests per hour per IP
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset requests. Please try again later.' }
});

module.exports = { globalLimiter, authLimiter, refreshLimiter, passwordResetLimiter };
