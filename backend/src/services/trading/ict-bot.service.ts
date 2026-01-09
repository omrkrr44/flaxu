import { logger } from '../../utils/logger';
import { cache } from '../../config/redis';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  filled: boolean;
  strength: number; // 0-100
}

export interface OrderBlock {
  type: 'bullish' | 'bearish';
  price: number;
  high: number;
  low: number;
  timestamp: number;
  volume: number;
  strength: number; // 0-100
  tested: boolean;
  broken: boolean;
}

export interface LiquidityZone {
  type: 'buy_side' | 'sell_side';
  price: number;
  strength: number; // 0-100
  timestamp: number;
}

export interface BreakerBlock {
  type: 'bullish' | 'bearish';
  originalOrderBlock: OrderBlock;
  breakTimestamp: number;
  newSupport: number;
  newResistance: number;
}

export interface MarketStructureShift {
  type: 'bullish_bos' | 'bearish_bos' | 'bullish_choch' | 'bearish_choch';
  timestamp: number;
  price: number;
  previousHigh?: number;
  previousLow?: number;
  strength: number; // 0-100
}

export interface ICTSignal {
  symbol: string;
  timeframe: string;
  timestamp: number;

  // Signal Type
  direction: 'LONG' | 'SHORT';
  signalType: string; // e.g., "FVG_LONG", "OB_SHORT", "MSS_REVERSAL"

  // Entry & Exit
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;

  // Risk Management
  riskRewardRatio: number;
  confidence: number; // 0-100

  // Supporting Evidence
  fairValueGaps: FairValueGap[];
  orderBlocks: OrderBlock[];
  liquidityZones: LiquidityZone[];
  marketStructureShift?: MarketStructureShift;

  // Additional Context
  currentPrice: number;
  trend: 'bullish' | 'bearish' | 'ranging';
  volatility: number;
}

export interface MultiTimeframeAnalysis {
  symbol: string;
  timestamp: number;

  // Timeframe-specific signals
  '15m': ICTSignal | null;
  '1h': ICTSignal | null;
  '4h': ICTSignal | null;
  '1d': ICTSignal | null;

  // Confluence Score (how many timeframes agree)
  confluenceScore: number; // 0-100

  // Best signal (highest confidence with confluence)
  bestSignal: ICTSignal | null;
}

// ============================================================================
// ICT & PA BOT SERVICE
// ============================================================================

export class ICTBotService {
  /**
   * Detect Fair Value Gaps in candle data
   * A FVG occurs when there's a gap between candle 1's high/low and candle 3's low/high
   */
  detectFairValueGaps(candles: Candle[]): FairValueGap[] {
    const fvgs: FairValueGap[] = [];

    // Need at least 3 candles to detect FVG
    if (candles.length < 3) return fvgs;

    for (let i = 0; i < candles.length - 2; i++) {
      const candle1 = candles[i];
      const candle2 = candles[i + 1];
      const candle3 = candles[i + 2];

      // Bullish FVG: Gap between candle1.high and candle3.low (with candle2 creating the imbalance)
      if (candle3.low > candle1.high) {
        const gapSize = candle3.low - candle1.high;
        const avgRange = (candle1.high - candle1.low + candle2.high - candle2.low + candle3.high - candle3.low) / 3;
        const strength = Math.min(100, (gapSize / avgRange) * 50);

        fvgs.push({
          type: 'bullish',
          startPrice: candle1.high,
          endPrice: candle3.low,
          startTime: candle1.timestamp,
          endTime: candle3.timestamp,
          filled: false,
          strength,
        });
      }

      // Bearish FVG: Gap between candle1.low and candle3.high
      if (candle3.high < candle1.low) {
        const gapSize = candle1.low - candle3.high;
        const avgRange = (candle1.high - candle1.low + candle2.high - candle2.low + candle3.high - candle3.low) / 3;
        const strength = Math.min(100, (gapSize / avgRange) * 50);

        fvgs.push({
          type: 'bearish',
          startPrice: candle3.high,
          endPrice: candle1.low,
          startTime: candle1.timestamp,
          endTime: candle3.timestamp,
          filled: false,
          strength,
        });
      }
    }

    // Check if recent price action has filled any FVGs
    const latestCandle = candles[candles.length - 1];
    fvgs.forEach(fvg => {
      if (fvg.type === 'bullish' && latestCandle.low <= fvg.startPrice) {
        fvg.filled = true;
      }
      if (fvg.type === 'bearish' && latestCandle.high >= fvg.endPrice) {
        fvg.filled = true;
      }
    });

    return fvgs.filter(fvg => !fvg.filled); // Only return unfilled FVGs
  }

  /**
   * Detect Order Blocks (institutional buying/selling zones)
   * An OB is a candle that precedes a strong move in the opposite direction
   */
  detectOrderBlocks(candles: Candle[]): OrderBlock[] {
    const orderBlocks: OrderBlock[] = [];

    if (candles.length < 5) return orderBlocks;

    for (let i = 1; i < candles.length - 3; i++) {
      const prevCandle = candles[i - 1];
      const currentCandle = candles[i];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];
      const next3 = candles[i + 3];

      // Bullish Order Block: Down candle followed by strong up move
      const isBearishCandle = currentCandle.close < currentCandle.open;
      const strongUpMove = next1.close > currentCandle.high &&
                           next2.close > next1.close &&
                           next3.close > next2.close;

      if (isBearishCandle && strongUpMove) {
        const moveStrength = ((next3.close - currentCandle.low) / currentCandle.low) * 100;
        const volumeStrength = currentCandle.volume > (prevCandle.volume * 1.2) ? 20 : 0;
        const strength = Math.min(100, moveStrength * 10 + volumeStrength);

        orderBlocks.push({
          type: 'bullish',
          price: (currentCandle.low + currentCandle.high) / 2,
          high: currentCandle.high,
          low: currentCandle.low,
          timestamp: currentCandle.timestamp,
          volume: currentCandle.volume,
          strength,
          tested: false,
          broken: false,
        });
      }

      // Bearish Order Block: Up candle followed by strong down move
      const isBullishCandle = currentCandle.close > currentCandle.open;
      const strongDownMove = next1.close < currentCandle.low &&
                             next2.close < next1.close &&
                             next3.close < next2.close;

      if (isBullishCandle && strongDownMove) {
        const moveStrength = ((currentCandle.high - next3.close) / currentCandle.high) * 100;
        const volumeStrength = currentCandle.volume > (prevCandle.volume * 1.2) ? 20 : 0;
        const strength = Math.min(100, moveStrength * 10 + volumeStrength);

        orderBlocks.push({
          type: 'bearish',
          price: (currentCandle.low + currentCandle.high) / 2,
          high: currentCandle.high,
          low: currentCandle.low,
          timestamp: currentCandle.timestamp,
          volume: currentCandle.volume,
          strength,
          tested: false,
          broken: false,
        });
      }
    }

    return orderBlocks;
  }

  /**
   * Detect Liquidity Zones (areas where stop losses cluster)
   * These are typically around swing highs/lows
   */
  detectLiquidityZones(candles: Candle[]): LiquidityZone[] {
    const liquidityZones: LiquidityZone[] = [];

    if (candles.length < 10) return liquidityZones;

    // Find swing highs and lows (potential liquidity zones)
    for (let i = 5; i < candles.length - 5; i++) {
      const current = candles[i];
      const leftCandles = candles.slice(i - 5, i);
      const rightCandles = candles.slice(i + 1, i + 6);

      // Swing High (sell-side liquidity above)
      const isSwingHigh = leftCandles.every(c => c.high < current.high) &&
                          rightCandles.every(c => c.high < current.high);

      if (isSwingHigh) {
        const volumeStrength = current.volume > candles.slice(i - 10, i).reduce((sum, c) => sum + c.volume, 0) / 10 ? 30 : 0;
        const strength = Math.min(100, 50 + volumeStrength);

        liquidityZones.push({
          type: 'sell_side',
          price: current.high,
          strength,
          timestamp: current.timestamp,
        });
      }

      // Swing Low (buy-side liquidity below)
      const isSwingLow = leftCandles.every(c => c.low > current.low) &&
                         rightCandles.every(c => c.low > current.low);

      if (isSwingLow) {
        const volumeStrength = current.volume > candles.slice(i - 10, i).reduce((sum, c) => sum + c.volume, 0) / 10 ? 30 : 0;
        const strength = Math.min(100, 50 + volumeStrength);

        liquidityZones.push({
          type: 'buy_side',
          price: current.low,
          strength,
          timestamp: current.timestamp,
        });
      }
    }

    return liquidityZones;
  }

  /**
   * Detect Market Structure Shifts (BOS/CHOCH)
   * BOS = Break of Structure (continuation)
   * CHOCH = Change of Character (reversal)
   */
  detectMarketStructureShifts(candles: Candle[]): MarketStructureShift[] {
    const shifts: MarketStructureShift[] = [];

    if (candles.length < 20) return shifts;

    // Find recent swing highs and lows
    const swingHighs: { price: number; timestamp: number }[] = [];
    const swingLows: { price: number; timestamp: number }[] = [];

    for (let i = 5; i < candles.length - 5; i++) {
      const current = candles[i];
      const leftCandles = candles.slice(i - 5, i);
      const rightCandles = candles.slice(i + 1, i + 6);

      if (leftCandles.every(c => c.high < current.high) && rightCandles.every(c => c.high < current.high)) {
        swingHighs.push({ price: current.high, timestamp: current.timestamp });
      }

      if (leftCandles.every(c => c.low > current.low) && rightCandles.every(c => c.low > current.low)) {
        swingLows.push({ price: current.low, timestamp: current.timestamp });
      }
    }

    // Detect breaks of recent swing highs/lows
    const latestCandle = candles[candles.length - 1];
    const recentSwingHigh = swingHighs[swingHighs.length - 1];
    const recentSwingLow = swingLows[swingLows.length - 1];

    if (recentSwingHigh && latestCandle.close > recentSwingHigh.price) {
      // Bullish BOS or CHOCH
      const previousTrend = this.determineTrend(candles.slice(0, -10));
      const type = previousTrend === 'bearish' ? 'bullish_choch' as const : 'bullish_bos' as const;
      const strength = Math.min(100, ((latestCandle.close - recentSwingHigh.price) / recentSwingHigh.price) * 500);

      shifts.push({
        type,
        timestamp: latestCandle.timestamp,
        price: recentSwingHigh.price,
        previousHigh: recentSwingHigh.price,
        strength,
      });
    }

    if (recentSwingLow && latestCandle.close < recentSwingLow.price) {
      // Bearish BOS or CHOCH
      const previousTrend = this.determineTrend(candles.slice(0, -10));
      const type = previousTrend === 'bullish' ? 'bearish_choch' as const : 'bearish_bos' as const;
      const strength = Math.min(100, ((recentSwingLow.price - latestCandle.close) / recentSwingLow.price) * 500);

      shifts.push({
        type,
        timestamp: latestCandle.timestamp,
        price: recentSwingLow.price,
        previousLow: recentSwingLow.price,
        strength,
      });
    }

    return shifts;
  }

  /**
   * Determine trend from candle data
   */
  private determineTrend(candles: Candle[]): 'bullish' | 'bearish' | 'ranging' {
    if (candles.length < 20) return 'ranging';

    const sma20 = candles.slice(-20).reduce((sum, c) => sum + c.close, 0) / 20;
    const sma50 = candles.slice(-50).reduce((sum, c) => sum + c.close, 0) / 50;
    const currentPrice = candles[candles.length - 1].close;

    if (currentPrice > sma20 && sma20 > sma50) return 'bullish';
    if (currentPrice < sma20 && sma20 < sma50) return 'bearish';
    return 'ranging';
  }

  /**
   * Calculate volatility (ATR-based)
   */
  private calculateVolatility(candles: Candle[]): number {
    if (candles.length < 14) return 0;

    const atr = candles.slice(-14).reduce((sum, c, i, arr) => {
      if (i === 0) return 0;
      const tr = Math.max(
        c.high - c.low,
        Math.abs(c.high - arr[i - 1].close),
        Math.abs(c.low - arr[i - 1].close)
      );
      return sum + tr;
    }, 0) / 14;

    const currentPrice = candles[candles.length - 1].close;
    return (atr / currentPrice) * 100;
  }

  /**
   * Generate ICT trading signal from analysis
   */
  generateSignal(
    symbol: string,
    timeframe: string,
    candles: Candle[],
    fvgs: FairValueGap[],
    orderBlocks: OrderBlock[],
    liquidityZones: LiquidityZone[],
    marketStructureShifts: MarketStructureShift[]
  ): ICTSignal | null {
    if (candles.length < 50) return null;

    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;
    const trend = this.determineTrend(candles);
    const volatility = this.calculateVolatility(candles);

    // Look for bullish setup
    const bullishFVG = fvgs.find(fvg => fvg.type === 'bullish' && currentPrice >= fvg.startPrice && currentPrice <= fvg.endPrice);
    const bullishOB = orderBlocks.find(ob => ob.type === 'bullish' && currentPrice >= ob.low && currentPrice <= ob.high);
    const bullishMSS = marketStructureShifts.find(mss => (mss.type === 'bullish_bos' || mss.type === 'bullish_choch'));

    // Look for bearish setup
    const bearishFVG = fvgs.find(fvg => fvg.type === 'bearish' && currentPrice >= fvg.startPrice && currentPrice <= fvg.endPrice);
    const bearishOB = orderBlocks.find(ob => ob.type === 'bearish' && currentPrice >= ob.low && currentPrice <= ob.high);
    const bearishMSS = marketStructureShifts.find(mss => (mss.type === 'bearish_bos' || mss.type === 'bearish_choch'));

    // Bullish Signal
    if (bullishFVG || bullishOB) {
      const entryPrice = currentPrice;
      const stopLoss = bullishOB ? bullishOB.low * 0.995 : (bullishFVG ? bullishFVG.startPrice * 0.995 : entryPrice * 0.98);
      const atr = candles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14;

      const takeProfit1 = entryPrice + atr * 1.5;
      const takeProfit2 = entryPrice + atr * 2.5;
      const takeProfit3 = entryPrice + atr * 4;

      const riskRewardRatio = (takeProfit2 - entryPrice) / (entryPrice - stopLoss);

      // Confidence calculation
      let confidence = 50;
      if (bullishFVG) confidence += bullishFVG.strength * 0.2;
      if (bullishOB) confidence += bullishOB.strength * 0.2;
      if (bullishMSS) confidence += bullishMSS.strength * 0.15;
      if (trend === 'bullish') confidence += 10;
      confidence = Math.min(100, confidence);

      // Only generate signal if confidence > 60% and R:R > 1.5
      if (confidence > 60 && riskRewardRatio > 1.5) {
        return {
          symbol,
          timeframe,
          timestamp: currentCandle.timestamp,
          direction: 'LONG',
          signalType: bullishFVG ? 'FVG_LONG' : 'OB_LONG',
          entryPrice,
          stopLoss,
          takeProfit1,
          takeProfit2,
          takeProfit3,
          riskRewardRatio,
          confidence,
          fairValueGaps: bullishFVG ? [bullishFVG] : [],
          orderBlocks: bullishOB ? [bullishOB] : [],
          liquidityZones,
          marketStructureShift: bullishMSS,
          currentPrice,
          trend,
          volatility,
        };
      }
    }

    // Bearish Signal
    if (bearishFVG || bearishOB) {
      const entryPrice = currentPrice;
      const stopLoss = bearishOB ? bearishOB.high * 1.005 : (bearishFVG ? bearishFVG.endPrice * 1.005 : entryPrice * 1.02);
      const atr = candles.slice(-14).reduce((sum, c) => sum + (c.high - c.low), 0) / 14;

      const takeProfit1 = entryPrice - atr * 1.5;
      const takeProfit2 = entryPrice - atr * 2.5;
      const takeProfit3 = entryPrice - atr * 4;

      const riskRewardRatio = (entryPrice - takeProfit2) / (stopLoss - entryPrice);

      // Confidence calculation
      let confidence = 50;
      if (bearishFVG) confidence += bearishFVG.strength * 0.2;
      if (bearishOB) confidence += bearishOB.strength * 0.2;
      if (bearishMSS) confidence += bearishMSS.strength * 0.15;
      if (trend === 'bearish') confidence += 10;
      confidence = Math.min(100, confidence);

      // Only generate signal if confidence > 60% and R:R > 1.5
      if (confidence > 60 && riskRewardRatio > 1.5) {
        return {
          symbol,
          timeframe,
          timestamp: currentCandle.timestamp,
          direction: 'SHORT',
          signalType: bearishFVG ? 'FVG_SHORT' : 'OB_SHORT',
          entryPrice,
          stopLoss,
          takeProfit1,
          takeProfit2,
          takeProfit3,
          riskRewardRatio,
          confidence,
          fairValueGaps: bearishFVG ? [bearishFVG] : [],
          orderBlocks: bearishOB ? [bearishOB] : [],
          liquidityZones,
          marketStructureShift: bearishMSS,
          currentPrice,
          trend,
          volatility,
        };
      }
    }

    return null;
  }

  /**
   * Perform full ICT analysis on a single timeframe
   */
  async analyzeSingleTimeframe(symbol: string, timeframe: string, candles: Candle[]): Promise<ICTSignal | null> {
    try {
      // Run all detection algorithms
      const fvgs = this.detectFairValueGaps(candles);
      const orderBlocks = this.detectOrderBlocks(candles);
      const liquidityZones = this.detectLiquidityZones(candles);
      const marketStructureShifts = this.detectMarketStructureShifts(candles);

      // Generate signal
      const signal = this.generateSignal(
        symbol,
        timeframe,
        candles,
        fvgs,
        orderBlocks,
        liquidityZones,
        marketStructureShifts
      );

      return signal;
    } catch (error) {
      logger.error(`ICT analysis failed for ${symbol} ${timeframe}:`, error);
      return null;
    }
  }

  /**
   * Multi-timeframe analysis (15m, 1h, 4h, 1d)
   * Returns the best signal with confluence across timeframes
   */
  async analyzeMultiTimeframe(
    symbol: string,
    candlesData: {
      '15m': Candle[];
      '1h': Candle[];
      '4h': Candle[];
      '1d': Candle[];
    }
  ): Promise<MultiTimeframeAnalysis> {
    const cacheKey = `ict:mtf:${symbol}`;
    const cached = await cache.get<MultiTimeframeAnalysis>(cacheKey);
    if (cached) return cached;

    // Analyze each timeframe
    const signal15m = await this.analyzeSingleTimeframe(symbol, '15m', candlesData['15m']);
    const signal1h = await this.analyzeSingleTimeframe(symbol, '1h', candlesData['1h']);
    const signal4h = await this.analyzeSingleTimeframe(symbol, '4h', candlesData['4h']);
    const signal1d = await this.analyzeSingleTimeframe(symbol, '1d', candlesData['1d']);

    // Calculate confluence (how many timeframes agree on direction)
    const signals = [signal15m, signal1h, signal4h, signal1d].filter(s => s !== null) as ICTSignal[];
    const longSignals = signals.filter(s => s.direction === 'LONG').length;
    const shortSignals = signals.filter(s => s.direction === 'SHORT').length;

    const totalSignals = signals.length;
    const confluenceScore = totalSignals > 0
      ? Math.max(longSignals, shortSignals) / totalSignals * 100
      : 0;

    // Select best signal (highest confidence from higher timeframes)
    let bestSignal: ICTSignal | null = null;
    if (signal1d && signal1d.confidence > 70) bestSignal = signal1d;
    else if (signal4h && signal4h.confidence > 70) bestSignal = signal4h;
    else if (signal1h && signal1h.confidence > 75) bestSignal = signal1h;
    else if (signal15m && signal15m.confidence > 80) bestSignal = signal15m;

    const analysis: MultiTimeframeAnalysis = {
      symbol,
      timestamp: Date.now(),
      '15m': signal15m,
      '1h': signal1h,
      '4h': signal4h,
      '1d': signal1d,
      confluenceScore,
      bestSignal,
    };

    // Cache for 1 minute
    await cache.set(cacheKey, analysis, 60);

    return analysis;
  }
}

export const ictBotService = new ICTBotService();
