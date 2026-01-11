import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
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

export const authenticate = async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = verify(token, config.JWT_SECRET) as any;

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, accessLevel: true }
            });

            if (!user) {
                throw new AppError('User not found', 401);
            }

            req.user = user;
            next();
        } catch (error) {
            throw new AppError('Invalid token', 401);
        }
    } catch (error) {
        next(error);
    }
};

export const authorize = (allowedLevels: AccessLevel[]) => {
    return (req: AuthRequest, _res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Not authenticated', 401));
        }

        if (!allowedLevels.includes(req.user.accessLevel)) {
            return next(new AppError('Not authorized', 403));
        }

        next();
    };
};
