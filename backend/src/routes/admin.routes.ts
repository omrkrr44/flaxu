import { Router } from 'express';
import { authenticate, requireAccessLevel } from '../middleware/auth';
import * as adminController from '../controllers/admin.controller';

const router = Router();

// All admin endpoints require authentication and ADMIN access
router.use(authenticate);
router.use(requireAccessLevel('ADMIN'));

// ============================================================================
// USER MANAGEMENT
// ============================================================================

router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetails);
router.put('/users/:id/access-level', adminController.updateUserAccessLevel);
router.delete('/users/:id', adminController.deleteUser);

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

router.get('/analytics/overview', adminController.getAnalyticsOverview);
router.get('/analytics/trades', adminController.getTradeAnalytics);

// ============================================================================
// SYSTEM LOGS & MONITORING
// ============================================================================

router.get('/logs', adminController.getSystemLogs);
router.get('/actions', adminController.getAdminActions);

export default router;
