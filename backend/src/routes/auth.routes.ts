import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes
router.post('/register', authLimiter, authController.register.bind(authController));
router.post('/login', authLimiter, authController.login.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.post('/request-password-reset', authLimiter, authController.requestPasswordReset.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/logout', authController.logout.bind(authController));

export default router;
