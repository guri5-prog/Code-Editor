import rateLimit from 'express-rate-limit';
import { getRedis } from '../database/redis.js';
import { env } from '../config/env.js';
import type { Store, IncrementResponse, Options } from 'express-rate-limit';
import type { RequestHandler } from 'express';

class RedisStore implements Store {
  windowMs!: number;
  prefix: string;

  constructor(prefix = 'rl:') {
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redis = getRedis();
    const redisKey = `${this.prefix}${key}`;
    const current = await redis.incr(redisKey);
    if (current === 1) {
      await redis.pexpire(redisKey, this.windowMs);
    }
    const ttl = await redis.pttl(redisKey);
    return {
      totalHits: current,
      resetTime: new Date(Date.now() + Math.max(ttl, 0)),
    };
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedis();
    await redis.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedis();
    await redis.del(`${this.prefix}${key}`);
  }
}

const devBypassLimiter: RequestHandler = (_req, _res, next) => {
  next();
};

function createLimiter(options: Parameters<typeof rateLimit>[0]): RequestHandler {
  if (env.NODE_ENV === 'development') {
    return devBypassLimiter;
  }

  return rateLimit(options);
}

export const authLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:auth:'),
  message: { error: { code: 429, message: 'Too many requests, try again later' } },
});

export const apiLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:api:'),
  message: { error: { code: 429, message: 'Too many requests, try again later' } },
});

export const executionLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:exec:'),
  keyGenerator: (req) => {
    return req.authPayload?.userId ?? req.ip ?? 'unauthenticated';
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: { code: 429, message: 'Execution rate limit exceeded - max 10 per minute' } },
});

export const authenticatedLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  store: new RedisStore('rl:authed:'),
  keyGenerator: (req) => {
    return req.authPayload?.userId ?? 'unauthenticated';
  },
  validate: { keyGeneratorIpFallback: false },
  message: { error: { code: 429, message: 'Too many requests, try again later' } },
});
