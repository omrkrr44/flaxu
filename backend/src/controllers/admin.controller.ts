import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { cache } from '../config/redis';

const prisma = new PrismaClient();

// ============================================================================
// USER MANAGEMENT
// ============================================================================

/**
 * GET /api/admin/users
 * Get all users with pagination and filters
 */
export async function getAllUsers(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, accessLevel, search } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (accessLevel) {
      where.accessLevel = accessLevel;
    }

    if (search) {
      where.email = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: {
          id: true,
          email: true,
          accessLevel: true,
          isVerified: true,
          isDirectReferral: true,
          isIndirectReferral: true,
          walletBalance: true,
          lastBalanceCheck: true,
          createdAt: true,
          lastLoginAt: true,
          bingxUid: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users',
    });
  }
}

/**
 * GET /api/admin/users/:id
 * Get detailed user information
 */
export async function getUserDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        trades: {
          take: 10,
          orderBy: { openedAt: 'desc' },
        },
        sessions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        notifications: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Remove sensitive data
    const { passwordHash, bingxApiKey, bingxSecretKey, ...userWithoutSensitive } = user;

    res.json({
      success: true,
      data: userWithoutSensitive,
    });
  } catch (error) {
    logger.error('Failed to get user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details',
    });
  }
}

/**
 * PUT /api/admin/users/:id/access-level
 * Update user access level
 */
export async function updateUserAccessLevel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { accessLevel, reason } = req.body;
    const adminId = (req as any).user.id;

    if (!['LIMITED', 'FULL', 'ADMIN', 'SUSPENDED'].includes(accessLevel)) {
      res.status(400).json({
        success: false,
        error: 'Invalid access level',
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { accessLevel },
    });

    // Log admin action
    await prisma.adminAction.create({
      data: {
        adminId,
        action: 'update_access_level',
        targetId: id,
        reason: reason || `Changed access level to ${accessLevel}`,
        metadata: {
          newAccessLevel: accessLevel,
        },
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'SYSTEM_ALERT',
        title: 'Access Level Changed',
        message: `Your access level has been changed to ${accessLevel}`,
      },
    });

    logger.info(`Admin ${adminId} changed user ${id} access level to ${accessLevel}`);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Failed to update user access level:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update access level',
    });
  }
}

/**
 * DELETE /api/admin/users/:id
 * Delete a user (soft delete or hard delete)
 */
export async function deleteUser(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permanent } = req.query;
    const adminId = (req as any).user.id;

    if (permanent === 'true') {
      // Hard delete
      await prisma.user.delete({
        where: { id },
      });

      await prisma.adminAction.create({
        data: {
          adminId,
          action: 'delete_user',
          targetId: id,
          reason: 'Permanent user deletion',
        },
      });

      logger.warn(`Admin ${adminId} permanently deleted user ${id}`);
    } else {
      // Soft delete (suspend)
      await prisma.user.update({
        where: { id },
        data: { accessLevel: 'SUSPENDED' },
      });

      await prisma.adminAction.create({
        data: {
          adminId,
          action: 'suspend_user',
          targetId: id,
          reason: 'User suspended',
        },
      });

      logger.info(`Admin ${adminId} suspended user ${id}`);
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
}

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

/**
 * GET /api/admin/analytics/overview
 * Get platform analytics overview
 */
export async function getAnalyticsOverview(req: Request, res: Response) {
  try {
    const cacheKey = 'admin:analytics:overview';
    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      res.json({
        success: true,
        data: cached,
      });
      return;
    }

    const [
      totalUsers,
      verifiedUsers,
      activeUsers,
      suspendedUsers,
      totalTrades,
      openTrades,
      closedTrades,
      totalVolume,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { accessLevel: 'FULL' } }),
      prisma.user.count({ where: { accessLevel: 'SUSPENDED' } }),
      prisma.trade.count(),
      prisma.trade.count({ where: { status: 'OPEN' } }),
      prisma.trade.count({ where: { status: 'CLOSED' } }),
      prisma.trade.aggregate({
        _sum: { positionSize: true },
      }),
    ]);

    // Get recent trades
    const recentTrades = await prisma.trade.findMany({
      take: 10,
      orderBy: { openedAt: 'desc' },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    // Get profit/loss stats
    const profitStats = await prisma.trade.aggregate({
      where: { status: 'CLOSED' },
      _sum: { pnl: true },
      _avg: { pnl: true },
    });

    const analytics = {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        active: activeUsers,
        suspended: suspendedUsers,
      },
      trades: {
        total: totalTrades,
        open: openTrades,
        closed: closedTrades,
        totalVolume: totalVolume._sum.positionSize || 0,
      },
      profitLoss: {
        totalPnL: profitStats._sum.pnl || 0,
        avgPnL: profitStats._avg.pnl || 0,
      },
      recentTrades,
    };

    // Cache for 30 seconds
    await cache.set(cacheKey, analytics, 30);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Failed to get analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics',
    });
  }
}

/**
 * GET /api/admin/analytics/trades
 * Get detailed trade analytics
 */
export async function getTradeAnalytics(req: Request, res: Response) {
  try {
    const { startDate, endDate, signalType } = req.query;

    const where: any = {};

    if (startDate) {
      where.openedAt = { gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.openedAt = { ...where.openedAt, lte: new Date(endDate as string) };
    }

    if (signalType) {
      where.signalType = signalType;
    }

    const [trades, stats] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: {
            select: { email: true },
          },
        },
        orderBy: { openedAt: 'desc' },
        take: 100,
      }),
      prisma.trade.aggregate({
        where,
        _count: true,
        _sum: { pnl: true, positionSize: true },
        _avg: { pnl: true, confidence: true },
      }),
    ]);

    // Calculate win rate
    const closedTrades = trades.filter((t: any) => t.status === 'CLOSED');
    const winningTrades = closedTrades.filter((t: any) => t.pnl && Number(t.pnl) > 0);
    const winRate = closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

    res.json({
      success: true,
      data: {
        trades,
        stats: {
          total: stats._count,
          totalPnL: stats._sum.pnl || 0,
          avgPnL: stats._avg.pnl || 0,
          avgConfidence: stats._avg.confidence || 0,
          totalVolume: stats._sum.positionSize || 0,
          winRate,
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get trade analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trade analytics',
    });
  }
}

// ============================================================================
// SYSTEM LOGS & MONITORING
// ============================================================================

/**
 * GET /api/admin/logs
 * Get system logs
 */
export async function getSystemLogs(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50, level, service } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where: any = {};

    if (level) {
      where.level = level;
    }

    if (service) {
      where.service = service;
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { timestamp: 'desc' },
      }),
      prisma.systemLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get system logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs',
    });
  }
}

/**
 * GET /api/admin/actions
 * Get admin action history
 */
export async function getAdminActions(req: Request, res: Response) {
  try {
    const { page = 1, limit = 50 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [actions, total] = await Promise.all([
      prisma.adminAction.findMany({
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.adminAction.count(),
    ]);

    res.json({
      success: true,
      data: {
        actions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    logger.error('Failed to get admin actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get admin actions',
    });
  }
}
