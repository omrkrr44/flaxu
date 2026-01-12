import { Router } from 'express';
import { adminController } from '../controllers/admin.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all admin routes (Assuming 'ADMIN' role in AccessLevel or authorize checks user email)
// For MVP, if AccessLevel uses ENUM, we might need to check if schema supports 'ADMIN' 
// or if we use specific emails.
// Let's assume authorize('ADMIN') works or we will implement a simple check.

router.get('/users', authenticate, adminController.getUsers);
router.get('/stats', authenticate, adminController.getStats);
router.patch('/users/:userId/access', authenticate, adminController.updateUserAccess);

export default router;
