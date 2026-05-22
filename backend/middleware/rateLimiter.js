const rateLimit = require('express-rate-limit');

const createRateLimiter = ({ windowMs, max, message }) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      code: 'RATE_LIMIT_EXCEEDED',
      message,
    });
  },
});

const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please try again in a minute.',
});

const chatLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Too many AI chat requests. Please slow down.',
});

const repoLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many repository actions. Please try again later.',
});

module.exports = { authLimiter, chatLimiter, repoLimiter };
