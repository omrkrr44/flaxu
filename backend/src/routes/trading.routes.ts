import { Router } from 'express';
import { authenticate, requireAccessLevel } from '../middleware/auth';
import * as tradingController from '../controllers/trading.controller';

const router = Router();

// All trading endpoints require authentication and FULL access
router.use(authenticate);
router.use(requireAccessLevel('FULL'));

// ============================================================================
// ICT & PA BOT ROUTES
// ============================================================================

router.get('/ict/analyze/:symbol', tradingController.analyzeICT);
router.get('/ict/signal/:symbol/:timeframe', tradingController.getICTSignal);
router.get('/ict/scan-all', tradingController.scanAllICT);

// ============================================================================
// SNIPER SCALP BOT ROUTES
// ============================================================================

router.get('/sniper/analyze/:symbol', tradingController.analyzeSniperScalp);
router.get('/sniper/scan-all', tradingController.scanAllSniper);

// ============================================================================
// ARBITRAGE SCANNER ROUTES
// ============================================================================

router.get('/arbitrage/scan', tradingController.scanArbitrage);
router.get('/arbitrage/opportunity/:symbol', tradingController.getArbitrageOpportunity);
router.get('/arbitrage/symbols', tradingController.getArbitrageSymbols);

// ============================================================================
// LIQUIDITY HEATMAP ROUTES
// ============================================================================

router.get('/liquidity/heatmap/:symbol', tradingController.getLiquidityHeatmap);
router.get('/liquidity/levels/:symbol', tradingController.getLiquidityLevels);

// ============================================================================
// GENERAL ROUTES
// ============================================================================

router.get('/status', tradingController.getTradingStatus);

export default router;
