import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import { TooManyRequestsError } from '../lib/errors';

interface LimiterOptions {
  windowMs: number;
  limit: number;
  key?: (req: Request) => string;
  /** Count only failed (status >= 400) responses, e.g. wrong-password logins. */
  skipSuccessfulRequests?: boolean;
  /** Limiters are skipped under NODE_ENV=test so route tests stay deterministic. */
  enforceInTest?: boolean;
}

const ipKey = (req: Request) => ipKeyGenerator(req.ip ?? '');

/** Per user once authenticated (requires requireAuth earlier in the chain), else per IP. */
const userOrIpKey = (req: Request) => req.user?.id ?? ipKey(req);

/**
 * Counters live in process memory, which is correct for a single instance only.
 * Running more than one instance needs a shared store (e.g. rate-limit-redis).
 */
export function createLimiter(opts: LimiterOptions) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: 'draft-7', // emits RateLimit-* and Retry-After
    legacyHeaders: false,
    skipSuccessfulRequests: opts.skipSuccessfulRequests ?? false,
    skip: () => process.env.NODE_ENV === 'test' && !opts.enforceInTest,
    keyGenerator: opts.key ?? ipKey,
    // Route through the central errorHandler so a 429 has the same body shape as every other error.
    handler: (_req, _res, next) => next(new TooManyRequestsError()),
  });
}

// Baseline for the whole API.
export const globalLimiter = createLimiter({ windowMs: 60_000, limit: 100 });

// Brute-force protection. Keyed on IP + email so rotating IPs doesn't help an
// attacker, and spamming one email can't lock that user out from other IPs.
export const loginLimiter = createLimiter({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  key: (req) => `${ipKey(req)}:${String(req.body?.email ?? '').toLowerCase()}`,
});

export const registerLimiter = createLimiter({ windowMs: 60 * 60_000, limit: 5 });

// The limiters below are user-keyed, so they must sit after requireAuth.
export const ticketCreateLimiter = createLimiter({
  windowMs: 60 * 60_000,
  limit: 20,
  key: userOrIpKey,
});
export const commentLimiter = createLimiter({ windowMs: 60_000, limit: 30, key: userOrIpKey });
export const writeLimiter = createLimiter({ windowMs: 60_000, limit: 60, key: userOrIpKey });
