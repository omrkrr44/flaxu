import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient | undefined;

try {
  prisma = global.prisma || new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
} catch (error) {
  logger.warn('⚠️  Prisma client not available. Database features will be disabled.');
  logger.warn('   Run "prisma generate" to enable database features.');
  prisma = undefined;
}

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    if (e.duration > 100) {
      logger.warn(`Slow query detected (${e.duration}ms): ${e.query}`);
    }
  });
}

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  if (!prisma) {
    logger.warn('⚠️  Skipping database connection (Prisma not available)');
    return;
  }

  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
    logger.warn('⚠️  Continuing without database. Some features may be limited.');
  }
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (!prisma) {
    return;
  }
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

/**
 * Health check
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  if (!prisma) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

export { prisma };
export default prisma;
