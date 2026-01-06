import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/profile', userController.getProfile.bind(userController));
router.post('/api-keys', userController.updateApiKeys.bind(userController));
router.delete('/api-keys', userController.removeApiKeys.bind(userController));
router.get('/gatekeeper/status', userController.getGatekeeperStatus.bind(userController));
router.post('/gatekeeper/check', userController.checkAccess.bind(userController));

export default router;
