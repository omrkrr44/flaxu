import cron from 'node-cron';
import { gatekeeperService } from '../services/gatekeeper.service';
import { logger } from '../utils/logger';

/**
 * Periodic balance check job
 * Runs every 24 hours at 00:00 (midnight)
 */
export function startBalanceCheckJob() {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      logger.info('Starting scheduled balance check job...');
      await gatekeeperService.periodicBalanceCheck();
      logger.info('Scheduled balance check job completed successfully');
    } catch (error) {
      logger.error('Scheduled balance check job failed:', error);
    }
  });

  logger.info('✅ Balance check cron job scheduled (runs daily at 00:00)');
}

/**
 * Run balance check manually (for testing)
 */
export async function runBalanceCheckNow() {
  try {
    logger.info('Running manual balance check...');
    await gatekeeperService.periodicBalanceCheck();
    logger.info('Manual balance check completed successfully');
  } catch (error) {
    logger.error('Manual balance check failed:', error);
    throw error;
  }
}
