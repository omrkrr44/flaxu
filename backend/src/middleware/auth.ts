import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';
import { AccessLevel } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    accessLevel: AccessLevel;
  };
}

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('No authentication token provided', 401);
    }

    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        accessLevel: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 401);
    }

    if (!user.isVerified) {
      throw new AppError('Email not verified', 403);
    }

    req.user = {
      id: user.id,
      email: user.email,
      accessLevel: user.accessLevel,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

/**
 * Require FULL access level (verified referral with $200+ balance)
 */
export const requireFullAccess = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?.accessLevel !== AccessLevel.FULL) {
    throw new AppError(
      'Access denied: Please ensure you are a verified referral with minimum $200 wallet balance',
      403
    );
  }
  next();
};

/**
 * Require admin access
 */
export const requireAdmin = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // Check if user email matches admin email
    if (req.user.email !== process.env.ADMIN_EMAIL) {
      throw new AppError('Admin access required', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - attaches user if token is present but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        accessLevel: true,
      },
    });

    if (user) {
      req.user = {
        id: user.id,
        email: user.email,
        accessLevel: user.accessLevel,
      };
    }
  } catch (error) {
    // Ignore errors for optional auth
  }

  next();
};
