import { Router } from 'express';
import { marketController } from '../controllers/market.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect these routes as they are premium features
router.get('/arbitrage', authenticate, marketController.getArbitrageOpportunities);
router.get('/heatmap', authenticate, marketController.getHeatmapData);

export default router;
