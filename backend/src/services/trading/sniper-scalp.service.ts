import { logger } from '../../utils/logger';
import { Candle } from './ict-bot.service';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface VolumeSpike {
  timestamp: number;
  volume: number;
  avgVolume: number;
  spikeRatio: number; // volume / avgVolume
  priceChange: number; // percentage
}

export interface PumpDumpSignal {
  type: 'pump' | 'dump';
  timestamp: number;
  startPrice: number;
  peakPrice: number;
  currentPrice: number;
  priceChangePercent: number;
  volumeRatio: number;
  confidence: number; // 0-100
  stage: 'accumulation' | 'pump' | 'distribution' | 'dump' | 'recovery';
}

export interface LiquidationCascade {
  side: 'LONG' | 'SHORT'; // Which side is getting liquidated
  timestamp: number;
  price: number;
  totalLiquidated: number; // Total value liquidated (USDT)
  cascadeStrength: number; // 0-100
  expectedRetracement: number; // Expected bounce/drop percentage
}

export interface SniperScalpSignal {
  symbol: string;
  timestamp: number;
  type: 'PUMP_REVERSAL' | 'DUMP_REVERSAL' | 'LIQUIDATION_LONG' | 'LIQUIDATION_SHORT';

  // Entry & Exit
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  direction: 'LONG' | 'SHORT';

  // Fast scalp params
  targetProfitPercent: number; // Usually 0.5-2%
  maxHoldTime: number; // Seconds (usually 60-300)

  // Risk
  confidence: number; // 0-100
  riskRewardRatio: number;

  // Supporting data
  pumpDumpSignal?: PumpDumpSignal;
  liquidationCascade?: LiquidationCascade;
  volumeSpike?: VolumeSpike;
}

// ============================================================================
// SNIPER SCALP BOT SERVICE
// ============================================================================

export class SniperScalpService {
  /**
   * Detect volume spikes (potential pump/dump indicator)
   */
  detectVolumeSpikes(candles: Candle[], lookbackPeriod: number = 20): VolumeSpike[] {
    const spikes: VolumeSpike[] = [];

    if (candles.length < lookbackPeriod + 1) return spikes;

    for (let i = lookbackPeriod; i < candles.length; i++) {
      const currentCandle = candles[i];
      const previousCandles = candles.slice(i - lookbackPeriod, i);

      const avgVolume = previousCandles.reduce((sum, c) => sum + c.volume, 0) / lookbackPeriod;
      const spikeRatio = currentCandle.volume / avgVolume;

      // Consider it a spike if volume is 2x or more of average
      if (spikeRatio >= 2.0) {
        const priceChange = ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100;

        spikes.push({
          timestamp: currentCandle.timestamp,
          volume: currentCandle.volume,
          avgVolume,
          spikeRatio,
          priceChange,
        });
      }
    }

    return spikes;
  }

  /**
   * Detect pump and dump patterns
   * Characteristics:
   * - Rapid price increase with high volume (pump)
   * - Followed by rapid price decrease (dump)
   */
  detectPumpDump(candles: Candle[]): PumpDumpSignal | null {
    if (candles.length < 30) return null;

    const recentCandles = candles.slice(-30); // Last 30 candles
    const veryRecentCandles = candles.slice(-10); // Last 10 candles

    // Calculate average volume for baseline
    const avgVolume = recentCandles.reduce((sum, c) => sum + c.volume, 0) / recentCandles.length;
    const recentAvgVolume = veryRecentCandles.reduce((sum, c) => sum + c.volume, 0) / veryRecentCandles.length;
    const volumeRatio = recentAvgVolume / avgVolume;

    // Find peak and start prices
    const startPrice = recentCandles[0].open;
    const peakCandle = recentCandles.reduce((max, c) => c.high > max.high ? c : max, recentCandles[0]);
    const currentPrice = candles[candles.length - 1].close;
    const currentCandle = candles[candles.length - 1];

    // Calculate price changes
    const pumpPercent = ((peakCandle.high - startPrice) / startPrice) * 100;
    const currentChangePercent = ((currentPrice - startPrice) / startPrice) * 100;
    const dropFromPeak = ((peakCandle.high - currentPrice) / peakCandle.high) * 100;

    // PUMP DETECTION
    // - Price increased >3% in last 30 candles
    // - Volume is 2x average
    // - Currently near peak (within 2% of peak)
    if (pumpPercent > 3 && volumeRatio > 2 && dropFromPeak < 2) {
      let confidence = 60;
      if (pumpPercent > 5) confidence += 10;
      if (volumeRatio > 3) confidence += 15;
      if (dropFromPeak < 1) confidence += 10;

      return {
        type: 'pump',
        timestamp: currentCandle.timestamp,
        startPrice,
        peakPrice: peakCandle.high,
        currentPrice,
        priceChangePercent: pumpPercent,
        volumeRatio,
        confidence: Math.min(100, confidence),
        stage: 'pump',
      };
    }

    // DUMP DETECTION (reversal opportunity)
    // - Price increased >3% recently (there was a pump)
    // - Now dropped >2% from peak
    // - High volume on the dump
    if (pumpPercent > 3 && dropFromPeak > 2 && volumeRatio > 1.5) {
      let confidence = 60;
      if (dropFromPeak > 5) confidence += 15;
      if (volumeRatio > 2.5) confidence += 10;
      if (dropFromPeak < 10) confidence += 10; // Not too late

      return {
        type: 'dump',
        timestamp: currentCandle.timestamp,
        startPrice,
        peakPrice: peakCandle.high,
        currentPrice,
        priceChangePercent: currentChangePercent,
        volumeRatio,
        confidence: Math.min(100, confidence),
        stage: 'dump',
      };
    }

    return null;
  }

  /**
   * Detect liquidation cascades from recent liquidation data
   * This would typically come from WebSocket feeds or API data
   */
  detectLiquidationCascade(
    _symbol: string,
    recentLiquidations: Array<{
      side: 'LONG' | 'SHORT';
      price: number;
      quantity: number;
      timestamp: number;
    }>
  ): LiquidationCascade | null {
    if (recentLiquidations.length < 5) return null;

    // Group by side
    const longLiqs = recentLiquidations.filter(l => l.side === 'LONG');
    const shortLiqs = recentLiquidations.filter(l => l.side === 'SHORT');

    // Calculate total liquidated value for each side
    const longLiqValue = longLiqs.reduce((sum, l) => sum + (l.price * l.quantity), 0);
    const shortLiqValue = shortLiqs.reduce((sum, l) => sum + (l.price * l.quantity), 0);

    // Determine which side has more liquidations
    const dominantSide = longLiqValue > shortLiqValue ? 'LONG' : 'SHORT';
    const totalLiquidated = Math.max(longLiqValue, shortLiqValue);
    const avgPrice = dominantSide === 'LONG'
      ? longLiqs.reduce((sum, l) => sum + l.price, 0) / longLiqs.length
      : shortLiqs.reduce((sum, l) => sum + l.price, 0) / shortLiqs.length;

    // Calculate cascade strength based on liquidation value
    let cascadeStrength = 50;
    if (totalLiquidated > 1000000) cascadeStrength += 20; // >1M liquidated
    if (totalLiquidated > 5000000) cascadeStrength += 15; // >5M liquidated
    if (recentLiquidations.length > 20) cascadeStrength += 10; // Many liquidations

    cascadeStrength = Math.min(100, cascadeStrength);

    // Expected retracement (liquidations often cause temporary bounces)
    const expectedRetracement = dominantSide === 'LONG' ? -0.5 : 0.5; // 0.5% bounce

    return {
      side: dominantSide,
      timestamp: Date.now(),
      price: avgPrice,
      totalLiquidated,
      cascadeStrength,
      expectedRetracement,
    };
  }

  /**
   * Generate sniper scalp signal
   */
  generateSniperSignal(
    symbol: string,
    candles: Candle[],
    pumpDump: PumpDumpSignal | null,
    liquidationCascade: LiquidationCascade | null
  ): SniperScalpSignal | null {
    if (candles.length < 10) return null;

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;

    // PUMP REVERSAL (SHORT)
    // Enter short when pump is detected and showing signs of exhaustion
    if (pumpDump && pumpDump.type === 'pump' && pumpDump.confidence > 70) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 1.015; // 1.5% stop
      const takeProfit = entryPrice * 0.985; // 1.5% target

      return {
        symbol,
        timestamp: currentCandle.timestamp,
        type: 'PUMP_REVERSAL',
        entryPrice,
        stopLoss,
        takeProfit,
        direction: 'SHORT',
        targetProfitPercent: 1.5,
        maxHoldTime: 300, // 5 minutes max
        confidence: pumpDump.confidence,
        riskRewardRatio: (entryPrice - takeProfit) / (stopLoss - entryPrice),
        pumpDumpSignal: pumpDump,
      };
    }

    // DUMP REVERSAL (LONG)
    // Enter long after dump when price shows signs of recovery
    if (pumpDump && pumpDump.type === 'dump' && pumpDump.confidence > 70) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.985; // 1.5% stop
      const takeProfit = entryPrice * 1.020; // 2% target (catch the bounce)

      return {
        symbol,
        timestamp: currentCandle.timestamp,
        type: 'DUMP_REVERSAL',
        entryPrice,
        stopLoss,
        takeProfit,
        direction: 'LONG',
        targetProfitPercent: 2.0,
        maxHoldTime: 300, // 5 minutes max
        confidence: pumpDump.confidence,
        riskRewardRatio: (takeProfit - entryPrice) / (entryPrice - stopLoss),
        pumpDumpSignal: pumpDump,
      };
    }

    // LONG LIQUIDATION CASCADE (SHORT)
    // When many longs get liquidated, price drops fast - can short the cascade
    if (liquidationCascade && liquidationCascade.side === 'LONG' && liquidationCascade.cascadeStrength > 70) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 1.01; // 1% stop
      const takeProfit = entryPrice * 0.99; // 1% target

      return {
        symbol,
        timestamp: currentCandle.timestamp,
        type: 'LIQUIDATION_SHORT',
        entryPrice,
        stopLoss,
        takeProfit,
        direction: 'SHORT',
        targetProfitPercent: 1.0,
        maxHoldTime: 180, // 3 minutes max
        confidence: liquidationCascade.cascadeStrength,
        riskRewardRatio: (entryPrice - takeProfit) / (stopLoss - entryPrice),
        liquidationCascade,
      };
    }

    // SHORT LIQUIDATION CASCADE (LONG)
    // When many shorts get liquidated, price pumps fast - can long the cascade
    if (liquidationCascade && liquidationCascade.side === 'SHORT' && liquidationCascade.cascadeStrength > 70) {
      const entryPrice = currentPrice;
      const stopLoss = entryPrice * 0.99; // 1% stop
      const takeProfit = entryPrice * 1.01; // 1% target

      return {
        symbol,
        timestamp: currentCandle.timestamp,
        type: 'LIQUIDATION_LONG',
        entryPrice,
        stopLoss,
        takeProfit,
        direction: 'LONG',
        targetProfitPercent: 1.0,
        maxHoldTime: 180, // 3 minutes max
        confidence: liquidationCascade.cascadeStrength,
        riskRewardRatio: (takeProfit - entryPrice) / (entryPrice - stopLoss),
        liquidationCascade,
      };
    }

    return null;
  }

  /**
   * Main analysis function for Sniper Scalp Bot
   */
  async analyze(
    symbol: string,
    candles: Candle[],
    recentLiquidations?: Array<{
      side: 'LONG' | 'SHORT';
      price: number;
      quantity: number;
      timestamp: number;
    }>
  ): Promise<SniperScalpSignal | null> {
    try {
      // Detect patterns
      const pumpDump = this.detectPumpDump(candles);
      const volumeSpikes = this.detectVolumeSpikes(candles);
      const liquidationCascade = recentLiquidations
        ? this.detectLiquidationCascade(symbol, recentLiquidations)
        : null;

      // Generate signal
      const signal = this.generateSniperSignal(symbol, candles, pumpDump, liquidationCascade);

      if (signal && volumeSpikes.length > 0) {
        signal.volumeSpike = volumeSpikes[volumeSpikes.length - 1];
      }

      return signal;
    } catch (error) {
      logger.error(`Sniper Scalp analysis failed for ${symbol}:`, error);
      return null;
    }
  }
}

export const sniperScalpService = new SniperScalpService();
