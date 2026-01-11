import { Request, Response } from 'express';
import { adminService } from '../services/admin.service';
import { AppError } from '../middleware/errorHandler';

export class AdminController {
    async getUsers(_req: Request, res: Response) {
        try {
            const users = await adminService.getAllUsers();
            res.status(200).json({ status: 'success', data: { users } });
        } catch (error) {
            throw new AppError('Failed to fetch users', 500);
        }
    }

    async getStats(_req: Request, res: Response) {
        try {
            const stats = await adminService.getSystemStats();
            res.status(200).json({ status: 'success', data: { stats } });
        } catch (error) {
            throw new AppError('Failed to fetch stats', 500);
        }
    }

    async updateUserAccess(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const { accessLevel } = req.body;

            const user = await adminService.updateUserAccess(userId, accessLevel);
            res.status(200).json({ status: 'success', data: { user } });
        } catch (error) {
            throw new AppError('Failed to update user access', 500);
        }
    }
}

export const adminController = new AdminController();
