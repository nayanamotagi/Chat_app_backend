import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // allow 100 requests
  message: "Too many requests, please try again later."
});

export default limiter;

