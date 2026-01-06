import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { gatekeeperService } from '../services/gatekeeper.service';
import { prisma } from '../config/database';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler';

const updateApiKeysSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  secretKey: z.string().min(1, 'Secret key is required'),
});

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          isVerified: true,
          isDirectReferral: true,
          isIndirectReferral: true,
          walletBalance: true,
          lastBalanceCheck: true,
          accessLevel: true,
          createdAt: true,
          lastLoginAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateApiKeys(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const validated = updateApiKeysSchema.parse(req.body);
      const result = await gatekeeperService.updateApiKeys(
        req.user.id,
        validated.apiKey,
        validated.secretKey
      );

      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError(error.errors[0].message, 400));
      } else {
        next(error);
      }
    }
  }

  async removeApiKeys(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const result = await gatekeeperService.removeApiKeys(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async getGatekeeperStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const status = await gatekeeperService.getStatus(req.user.id);
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async checkAccess(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const result = await gatekeeperService.checkAccess(req.user.id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
