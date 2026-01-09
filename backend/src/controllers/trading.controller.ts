import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { ictBotService } from '../services/trading/ict-bot.service';
import { sniperScalpService } from '../services/trading/sniper-scalp.service';
import { arbitrageScannerService } from '../services/trading/arbitrage-scanner.service';
import { liquidityHeatmapService } from '../services/trading/liquidity-heatmap.service';
import { cache } from '../config/redis';
import type { Candle } from '../services/trading/ict-bot.service';

// ============================================================================
// HELPER: Fetch candles from BingX (or cache)
// ============================================================================

async function fetchCandlesFromBingX(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<Candle[]> {
  const cacheKey = `candles:${symbol}:${interval}`;
  const cached = await cache.get<Candle[]>(cacheKey);
  if (cached) return cached;

  try {
    // For now, we'll use a mock implementation since BingX client doesn't have fetchCandles
    // In production, you'd implement this using BingX kline API
    // GET /openApi/swap/v2/quote/klines

    // Mock data for demonstration
    const now = Date.now();
    const intervalMs = getIntervalMs(interval);
    const candles: Candle[] = [];

    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      const basePrice = 40000; // Mock BTC price
      const volatility = Math.random() * 0.02;

      candles.push({
        timestamp,
        open: basePrice * (1 + (Math.random() - 0.5) * volatility),
        high: basePrice * (1 + Math.random() * volatility),
        low: basePrice * (1 - Math.random() * volatility),
        close: basePrice * (1 + (Math.random() - 0.5) * volatility),
        volume: Math.random() * 1000,
      });
    }

    // Cache for interval duration
    await cache.set(cacheKey, candles, intervalMs / 1000);

    return candles;
  } catch (error) {
    logger.error(`Failed to fetch candles for ${symbol}:`, error);
    return [];
  }
}

function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return map[interval] || 60 * 1000;
}

// ============================================================================
// ICT & PA BOT ENDPOINTS
// ============================================================================

/**
 * GET /api/trading/ict/analyze/:symbol
 * Analyze a symbol using ICT methodology (multi-timeframe)
 */
export async function analyzeICT(req: Request, res: Response) {
  try {
    const { symbol } = req.params;

    logger.info(`ICT analysis requested for ${symbol}`);

    // Fetch candles for all timeframes
    const [candles15m, candles1h, candles4h, candles1d] = await Promise.all([
      fetchCandlesFromBingX(symbol, '15m', 200),
      fetchCandlesFromBingX(symbol, '1h', 200),
      fetchCandlesFromBingX(symbol, '4h', 200),
      fetchCandlesFromBingX(symbol, '1d', 200),
    ]);

    // Run multi-timeframe analysis
    const analysis = await ictBotService.analyzeMultiTimeframe(symbol, {
      '15m': candles15m,
      '1h': candles1h,
      '4h': candles4h,
      '1d': candles1d,
    });

    res.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    logger.error('ICT analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze ICT signals',
    });
  }
}

/**
 * GET /api/trading/ict/signal/:symbol/:timeframe
 * Get ICT signal for a specific symbol and timeframe
 */
export async function getICTSignal(req: Request, res: Response) {
  try {
    const { symbol, timeframe } = req.params;

    const candles = await fetchCandlesFromBingX(symbol, timeframe, 200);
    const signal = await ictBotService.analyzeSingleTimeframe(symbol, timeframe, candles);

    res.json({
      success: true,
      data: signal,
    });
  } catch (error) {
    logger.error('Failed to get ICT signal:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate ICT signal',
    });
  }
}

// ============================================================================
// SNIPER SCALP BOT ENDPOINTS
// ============================================================================

/**
 * GET /api/trading/sniper/analyze/:symbol
 * Analyze symbol for sniper scalp opportunities
 */
export async function analyzeSniperScalp(req: Request, res: Response) {
  try {
    const { symbol } = req.params;

    logger.info(`Sniper scalp analysis requested for ${symbol}`);

    // Fetch 1-minute candles for fast scalping
    const candles = await fetchCandlesFromBingX(symbol, '1m', 100);

    // TODO: Fetch recent liquidation data from BingX or other sources
    const recentLiquidations = undefined;

    const signal = await sniperScalpService.analyze(symbol, candles, recentLiquidations);

    res.json({
      success: true,
      data: signal,
    });
  } catch (error) {
    logger.error('Sniper scalp analysis failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sniper scalp opportunities',
    });
  }
}

// ============================================================================
// ARBITRAGE SCANNER ENDPOINTS
// ============================================================================

/**
 * GET /api/trading/arbitrage/scan
 * Scan for arbitrage opportunities across exchanges
 */
export async function scanArbitrage(req: Request, res: Response) {
  try {
    const { symbols } = req.query;

    logger.info('Arbitrage scan requested');

    let symbolList: string[] | undefined;
    if (symbols && typeof symbols === 'string') {
      symbolList = symbols.split(',');
    }

    const result = await arbitrageScannerService.scanArbitrage(symbolList);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Arbitrage scan failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan arbitrage opportunities',
    });
  }
}

/**
 * GET /api/trading/arbitrage/opportunity/:symbol
 * Get arbitrage opportunity for a specific symbol
 */
export async function getArbitrageOpportunity(req: Request, res: Response) {
  try {
    const { symbol } = req.params;

    const opportunity = await arbitrageScannerService.getOpportunityForSymbol(symbol);

    res.json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    logger.error('Failed to get arbitrage opportunity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get arbitrage opportunity',
    });
  }
}

/**
 * GET /api/trading/arbitrage/symbols
 * Get list of common symbols for arbitrage
 */
export async function getArbitrageSymbols(_req: Request, res: Response) {
  try {
    const symbols = await arbitrageScannerService.getCommonSymbols();

    res.json({
      success: true,
      data: symbols,
    });
  } catch (error) {
    logger.error('Failed to get arbitrage symbols:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get symbols',
    });
  }
}

// ============================================================================
// LIQUIDITY HEATMAP ENDPOINTS
// ============================================================================

/**
 * GET /api/trading/liquidity/heatmap/:symbol
 * Get liquidity heatmap for a symbol
 */
export async function getLiquidityHeatmap(req: Request, res: Response) {
  try {
    const { symbol } = req.params;

    logger.info(`Liquidity heatmap requested for ${symbol}`);

    const heatmap = await liquidityHeatmapService.generateHeatmap(symbol);

    res.json({
      success: true,
      data: heatmap,
    });
  } catch (error) {
    logger.error('Failed to generate liquidity heatmap:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate liquidity heatmap',
    });
  }
}

/**
 * GET /api/trading/liquidity/levels/:symbol
 * Get simplified liquidity levels for visualization
 */
export async function getLiquidityLevels(req: Request, res: Response) {
  try {
    const { symbol } = req.params;
    const { numLevels } = req.query;

    const levels = await liquidityHeatmapService.getLiquidityLevels(
      symbol,
      numLevels ? parseInt(numLevels as string) : 20
    );

    res.json({
      success: true,
      data: levels,
    });
  } catch (error) {
    logger.error('Failed to get liquidity levels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get liquidity levels',
    });
  }
}

// ============================================================================
// GENERAL TRADING INFO
// ============================================================================

/**
 * GET /api/trading/status
 * Get overall trading bot status
 */
export async function getTradingStatus(_req: Request, res: Response) {
  try {
    res.json({
      success: true,
      data: {
        bots: {
          ict: { status: 'active', name: 'ICT & PA Bot' },
          sniper: { status: 'active', name: 'Sniper Scalp Bot' },
          arbitrage: { status: 'active', name: 'Arbitrage Scanner' },
          liquidity: { status: 'active', name: 'Liquidity Heatmap' },
        },
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    logger.error('Failed to get trading status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
}
