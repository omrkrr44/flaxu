import { AccessLevel } from '@prisma/client';
import { prisma } from '../config/database';
import { BingXClient } from './bingx.client';
import { decrypt } from '../utils/encryption';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import config from '../config/env';

const MINIMUM_BALANCE = 200; // $200 USD

interface GatekeeperResult {
  status: 'APPROVED' | 'NOT_REFERRAL' | 'INSUFFICIENT_BALANCE' | 'INVALID_API_KEYS';
  accessLevel: AccessLevel;
  message: string;
  details?: {
    isDirectReferral?: boolean;
    isIndirectReferral?: boolean;
    walletBalance?: number;
    required?: number;
  };
}

export class GatekeeperService {
  /**
   * Main gatekeeper check - validates referral status and wallet balance
   */
  async checkAccess(userId: string): Promise<GatekeeperResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if API keys and UID are set
    if (!user.bingxApiKey || !user.bingxSecretKey || !user.bingxUid) {
      return {
        status: 'INVALID_API_KEYS',
        accessLevel: AccessLevel.LIMITED,
        message: 'Please connect your BingX API keys and UID to continue',
      };
    }

    try {
      // Decrypt API keys
      const apiKey = decrypt(user.bingxApiKey);
      const secretKey = decrypt(user.bingxSecretKey);

      // Create BingX client
      const bingxClient = new BingXClient({ apiKey, secretKey });

      // Test API connection
      const isConnected = await bingxClient.testConnection();
      if (!isConnected) {
        return {
          status: 'INVALID_API_KEYS',
          accessLevel: AccessLevel.LIMITED,
          message: 'Invalid BingX API keys. Please update your credentials.',
        };
      }

      // Direct UID check - if user's UID matches our referrer ID, grant full access
      // Normalize UIDs for comparison (trim whitespace, convert to string)
      const userUid = String(user.bingxUid || '').trim();
      const referrerUid = String(config.BINGX_REFERRER_ID || '').trim();
      const isReferrerAccount = userUid.length > 0 && userUid === referrerUid;

      // Debug log for UID comparison
      logger.info(`UID Comparison - User: "${userUid}" | Referrer: "${referrerUid}" | Match: ${isReferrerAccount}`);

      // Check referral status via API (fallback if not referrer account)
      const referralInfo = !isReferrerAccount ? await bingxClient.getReferralInfo() : {
        isDirectReferral: true,
        isIndirectReferral: false,
      };

      const isDirectReferral = isReferrerAccount || referralInfo.isDirectReferral;
      const isIndirectReferral = !isReferrerAccount && referralInfo.isIndirectReferral;

      if (!isDirectReferral && !isIndirectReferral) {
        // Update user referral status
        await prisma.user.update({
          where: { id: userId },
          data: {
            isDirectReferral: false,
            isIndirectReferral: false,
            accessLevel: AccessLevel.LIMITED,
          },
        });

        return {
          status: 'NOT_REFERRAL',
          accessLevel: AccessLevel.LIMITED,
          message: 'You are not in our referral network. Please sign up using our referral link.',
          details: {
            isDirectReferral: false,
            isIndirectReferral: false,
          },
        };
      }

      // Check wallet balance
      const accountBalance = await bingxClient.getAccountBalance();
      const totalBalance = accountBalance.totalWalletBalance;

      if (totalBalance < MINIMUM_BALANCE) {
        // Update user with low balance
        await prisma.user.update({
          where: { id: userId },
          data: {
            isDirectReferral: referralInfo.isDirectReferral,
            isIndirectReferral: referralInfo.isIndirectReferral,
            walletBalance: totalBalance,
            lastBalanceCheck: new Date(),
            accessLevel: AccessLevel.LIMITED,
          },
        });

        return {
          status: 'INSUFFICIENT_BALANCE',
          accessLevel: AccessLevel.LIMITED,
          message: `Wallet balance is below minimum requirement. Please deposit at least $${MINIMUM_BALANCE}.`,
          details: {
            isDirectReferral: referralInfo.isDirectReferral,
            isIndirectReferral: referralInfo.isIndirectReferral,
            walletBalance: totalBalance,
            required: MINIMUM_BALANCE,
          },
        };
      }

      // All checks passed - grant FULL access
      const previousAccessLevel = user.accessLevel;

      await prisma.user.update({
        where: { id: userId },
        data: {
          isDirectReferral: referralInfo.isDirectReferral,
          isIndirectReferral: referralInfo.isIndirectReferral,
          walletBalance: totalBalance,
          lastBalanceCheck: new Date(),
          accessLevel: AccessLevel.FULL,
        },
      });

      // Log access upgrade
      if (previousAccessLevel !== AccessLevel.FULL) {
        logger.info(`User ${user.email} access upgraded to FULL`);
      }

      return {
        status: 'APPROVED',
        accessLevel: AccessLevel.FULL,
        message: 'Access granted. Welcome to FLAXU!',
        details: {
          isDirectReferral: referralInfo.isDirectReferral,
          isIndirectReferral: referralInfo.isIndirectReferral,
          walletBalance: totalBalance,
        },
      };
    } catch (error) {
      logger.error(`Gatekeeper check failed for user ${userId}:`, error);
      throw new AppError('Failed to verify account access. Please try again later.', 500);
    }
  }

  /**
   * Update BingX API keys
   */
  async updateApiKeys(
    userId: string,
    apiKey: string,
    secretKey: string,
    uid: string
  ): Promise<{ message: string }> {
    // Test API keys first
    const bingxClient = new BingXClient({ apiKey, secretKey });
    const isValid = await bingxClient.testConnection();

    if (!isValid) {
      throw new AppError('Invalid BingX API keys. Please check your credentials.', 400);
    }

    // Encrypt and store
    const { encrypt } = await import('../utils/encryption');
    const encryptedApiKey = encrypt(apiKey);
    const encryptedSecretKey = encrypt(secretKey);

    await prisma.user.update({
      where: { id: userId },
      data: {
        bingxApiKey: encryptedApiKey,
        bingxSecretKey: encryptedSecretKey,
        bingxUid: uid,
      },
    });

    logger.info(`API keys and UID updated for user ${userId}`);

    // Run gatekeeper check immediately after updating keys
    await this.checkAccess(userId);

    return { message: 'BingX API keys and UID updated successfully' };
  }

  /**
   * Remove API keys
   */
  async removeApiKeys(userId: string): Promise<{ message: string }> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        bingxApiKey: null,
        bingxSecretKey: null,
        isDirectReferral: false,
        isIndirectReferral: false,
        walletBalance: null,
        lastBalanceCheck: null,
        accessLevel: AccessLevel.LIMITED,
      },
    });

    logger.info(`API keys removed for user ${userId}`);

    return { message: 'BingX API keys removed successfully' };
  }

  /**
   * Periodic balance check (runs via cron job)
   * Checks all users with FULL access and downgrades if balance drops
   */
  async periodicBalanceCheck(): Promise<void> {
    logger.info('Starting periodic balance check for all users...');

    const users = await prisma.user.findMany({
      where: {
        accessLevel: AccessLevel.FULL,
        bingxApiKey: { not: null },
        bingxSecretKey: { not: null },
      },
    });

    logger.info(`Checking ${users.length} users with FULL access`);

    for (const user of users) {
      try {
        // Decrypt API keys
        const apiKey = decrypt(user.bingxApiKey!);
        const secretKey = decrypt(user.bingxSecretKey!);

        // Create BingX client
        const bingxClient = new BingXClient({ apiKey, secretKey });

        // Get current balance
        const accountBalance = await bingxClient.getAccountBalance();
        const totalBalance = accountBalance.totalWalletBalance;

        // Update balance
        await prisma.user.update({
          where: { id: user.id },
          data: {
            walletBalance: totalBalance,
            lastBalanceCheck: new Date(),
          },
        });

        // Check if balance dropped below threshold
        if (totalBalance < MINIMUM_BALANCE) {
          // Downgrade access
          await prisma.user.update({
            where: { id: user.id },
            data: { accessLevel: AccessLevel.LIMITED },
          });

          // Send warning email
          await emailService.sendBalanceWarning(user.email, totalBalance);

          // Create notification
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'BALANCE_WARNING',
              title: 'Wallet Balance Below Minimum',
              message: `Your wallet balance ($${totalBalance.toFixed(2)}) is below the minimum requirement ($${MINIMUM_BALANCE}). Access downgraded to LIMITED.`,
              data: {
                currentBalance: totalBalance,
                required: MINIMUM_BALANCE,
              },
            },
          });

          logger.warn(`User ${user.email} downgraded to LIMITED (balance: $${totalBalance})`);
        }
      } catch (error) {
        logger.error(`Failed to check balance for user ${user.id}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    logger.info('Periodic balance check completed');
  }

  /**
   * Get gatekeeper status for user
   */
  async getStatus(userId: string): Promise<{
    hasApiKeys: boolean;
    isDirectReferral: boolean;
    isIndirectReferral: boolean;
    walletBalance: number | null;
    accessLevel: AccessLevel;
    lastBalanceCheck: Date | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bingxApiKey: true,
        bingxSecretKey: true,
        isDirectReferral: true,
        isIndirectReferral: true,
        walletBalance: true,
        accessLevel: true,
        lastBalanceCheck: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      hasApiKeys: Boolean(user.bingxApiKey && user.bingxSecretKey),
      isDirectReferral: user.isDirectReferral,
      isIndirectReferral: user.isIndirectReferral,
      walletBalance: user.walletBalance ? parseFloat(user.walletBalance.toString()) : null,
      accessLevel: user.accessLevel,
      lastBalanceCheck: user.lastBalanceCheck,
    };
  }
}

export const gatekeeperService = new GatekeeperService();
