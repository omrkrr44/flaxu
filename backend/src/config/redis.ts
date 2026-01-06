import Redis from 'ioredis';
import config from './env';
import { logger } from '../utils/logger';

// Create Redis client
const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  logger.error('❌ Redis error:', err);
});

redis.on('close', () => {
  logger.warn('⚠️  Redis connection closed');
});

/**
 * Cache helper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set value in cache with TTL
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error);
    }
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Cache exists check error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Set expiration on existing key
   */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await redis.expire(key, ttlSeconds);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error);
    }
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await redis.incr(key);
    } catch (error) {
      logger.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get multiple keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await redis.keys(pattern);
    } catch (error) {
      logger.error(`Cache keys error for pattern ${pattern}:`, error);
      return [];
    }
  },

  /**
   * Flush all cache (use carefully!)
   */
  async flushAll(): Promise<void> {
    if (config.NODE_ENV === 'production') {
      throw new Error('Cannot flush cache in production');
    }
    await redis.flushall();
    logger.warn('⚠️  Redis cache flushed');
  },
};

/**
 * Health check
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
}

export { redis };
export default redis;
