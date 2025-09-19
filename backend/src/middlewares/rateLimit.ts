import rateLimit from 'express-rate-limit';
export const authLimiter = rateLimit({ windowMs: 60_000, max: 60 });       // 60/min
export const bookingLimiter = rateLimit({ windowMs: 60_000, max: 30 });    // tighter for bookings
