import { prisma } from '../config/database';
// import { AppError } from '../middleware/errorHandler';
import { AccessLevel } from '@prisma/client';

export class AdminService {
    /**
     * Get all users with stats
     */
    async getAllUsers() {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                accessLevel: true,
                isDirectReferral: true,
                walletBalance: true,
                createdAt: true,
                lastBalanceCheck: true,
            },
            orderBy: { createdAt: 'desc' }
        });
        return users;
    }

    /**
     * Get system statistics
     */
    async getSystemStats() {
        const totalUsers = await prisma.user.count();
        const activeUsers = await prisma.user.count({
            where: { accessLevel: 'FULL' }
        });
        const totalVolume = 0; // Placeholder until Trade model is populated

        return {
            totalUsers,
            activeUsers,
            totalVolume,
            systemHealth: 'Healthy'
        };
    }

    /**
     * Update user access level manually
     */
    async updateUserAccess(userId: string, accessLevel: AccessLevel) {
        return await prisma.user.update({
            where: { id: userId },
            data: { accessLevel }
        });
    }
}

export const adminService = new AdminService();
