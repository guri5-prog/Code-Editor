import Redis from 'ioredis';
import { env } from '../config/env.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  await client.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!redis) return false;
    const result = await redis.ping();
    return result === 'PONG';
  } catch {
    return false;
  }
}
