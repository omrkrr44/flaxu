import ccxt from 'ccxt';
import { logger } from '../../utils/logger';
import { cache } from '../../config/redis';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ExchangePrice {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  timestamp: number;
  volume24h?: number;
}

export interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  profitUSD: number; // Estimated profit on $1000 trade
  volume24h: number;
  timestamp: number;
  confidence: number; // 0-100 (based on volume, spread stability, etc.)
  fees: {
    buyFee: number;
    sellFee: number;
    withdrawalFee: number;
    totalFees: number;
  };
  netProfitPercent: number; // After fees
}

export interface ArbitrageScanResult {
  timestamp: number;
  totalOpportunities: number;
  opportunities: ArbitrageOpportunity[];
  exchanges: string[];
  symbolsScanned: number;
}

// ============================================================================
// ARBITRAGE SCANNER SERVICE
// ============================================================================

export class ArbitrageScannerService {
      const ExchangeClass = (ccxt as any)[exchangeName] as any;
  private readonly SUPPORTED_EXCHANGES = [
    'binance',
    'bybit',
    'okx',
    'gateio',
    'kucoin',
  ];

  private readonly MIN_PROFIT_PERCENT = 0.5; // Minimum 0.5% profit to consider
  private readonly MIN_VOLUME_24H = 100000; // Minimum $100k daily volume

  constructor() {
    this.initializeExchanges();
  }

  /**
   * Initialize exchange connections
   */
  private initializeExchanges(): void {
    for (const exchangeName of this.SUPPORTED_EXCHANGES) {
      try {
        const ExchangeClass = ccxt[exchangeName as keyof typeof ccxt] as typeof ccxt.Exchange;
        const exchange = new ExchangeClass({
          enableRateLimit: true,
          timeout: 10000,
        });

        this.exchanges.set(exchangeName, exchange);
        logger.info(`Initialized exchange: ${exchangeName}`);
      } catch (error) {
        logger.error(`Failed to initialize exchange ${exchangeName}:`, error);
      }
    }
  }

  /**
   * Fetch ticker data from a specific exchange
   */
  private async fetchExchangePrice(
    exchangeName: string,
    symbol: string
  ): Promise<ExchangePrice | null> {
    const cacheKey = `arb:price:${exchangeName}:${symbol}`;
    const cached = await cache.get<ExchangePrice>(cacheKey);
    if (cached) return cached;

    try {
      const exchange = this.exchanges.get(exchangeName);
      if (!exchange) return null;

      const ticker = await exchange.fetchTicker(symbol);

      const price: ExchangePrice = {
        exchange: exchangeName,
        symbol,
        bid: ticker.bid || 0,
        ask: ticker.ask || 0,
        timestamp: ticker.timestamp || Date.now(),
        volume24h: ticker.quoteVolume || 0,
      };

      // Cache for 2 seconds (arbitrage needs fresh data)
      await cache.set(cacheKey, price, 2);

      return price;
    } catch (error: any) {
      // Don't log every error to avoid spam
      if (error.message?.includes('does not have market symbol')) {
        // Symbol not available on this exchange
        return null;
      }
      logger.debug(`Failed to fetch ${symbol} from ${exchangeName}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get typical fees for an exchange
   */
  private getExchangeFees(exchangeName: string): { maker: number; taker: number; withdrawal: number } {
    const feeStructure: Record<string, { maker: number; taker: number; withdrawal: number }> = {
      binance: { maker: 0.1, taker: 0.1, withdrawal: 0.0005 }, // 0.1% trading, ~0.05% withdrawal
      bybit: { maker: 0.1, taker: 0.1, withdrawal: 0.0005 },
      okx: { maker: 0.08, taker: 0.1, withdrawal: 0.0004 },
      gateio: { maker: 0.15, taker: 0.15, withdrawal: 0.001 },
      kucoin: { maker: 0.1, taker: 0.1, withdrawal: 0.0005 },
    };

    return feeStructure[exchangeName] || { maker: 0.1, taker: 0.1, withdrawal: 0.001 };
  }

  /**
   * Calculate arbitrage opportunity
   */
  private calculateArbitrage(
    prices: ExchangePrice[],
    symbol: string
  ): ArbitrageOpportunity | null {
    if (prices.length < 2) return null;

    // Find exchange with lowest ask (best buy price)
    const lowestAsk = prices.reduce((min, p) =>
      p.ask > 0 && (min.ask === 0 || p.ask < min.ask) ? p : min
    );

    // Find exchange with highest bid (best sell price)
    const highestBid = prices.reduce((max, p) =>
      p.bid > 0 && p.bid > max.bid ? p : max
    );

    // Can't arbitrage on the same exchange
    if (lowestAsk.exchange === highestBid.exchange) return null;

    // Calculate gross profit
    const profitPercent = ((highestBid.bid - lowestAsk.ask) / lowestAsk.ask) * 100;

    // Calculate fees
    const buyFees = this.getExchangeFees(lowestAsk.exchange);
    const sellFees = this.getExchangeFees(highestBid.exchange);

    const totalFeePercent = buyFees.taker + sellFees.taker + sellFees.withdrawal;
    const netProfitPercent = profitPercent - totalFeePercent;

    // Only return if profitable after fees
    if (netProfitPercent < this.MIN_PROFIT_PERCENT) return null;

    // Calculate estimated profit on $1000 trade
    const profitUSD = 1000 * (netProfitPercent / 100);

    // Confidence score based on volume and spread stability
    let confidence = 50;
    const avgVolume = prices.reduce((sum, p) => sum + (p.volume24h || 0), 0) / prices.length;
    if (avgVolume > this.MIN_VOLUME_24H * 2) confidence += 20;
    if (avgVolume > this.MIN_VOLUME_24H * 5) confidence += 10;
    if (netProfitPercent > 1) confidence += 15;
    if (netProfitPercent > 2) confidence += 5;

    return {
      symbol,
      buyExchange: lowestAsk.exchange,
      sellExchange: highestBid.exchange,
      buyPrice: lowestAsk.ask,
      sellPrice: highestBid.bid,
      profitPercent,
      profitUSD,
      volume24h: avgVolume,
      timestamp: Date.now(),
      confidence: Math.min(100, confidence),
      fees: {
        buyFee: buyFees.taker,
        sellFee: sellFees.taker,
        withdrawalFee: sellFees.withdrawal,
        totalFees: totalFeePercent,
      },
      netProfitPercent,
    };
  }

  /**
   * Scan for arbitrage opportunities across all exchanges
   */
  async scanArbitrage(symbols: string[] = [
    'BTC/USDT',
    'ETH/USDT',
    'BNB/USDT',
    'SOL/USDT',
    'XRP/USDT',
    'ADA/USDT',
    'AVAX/USDT',
    'DOGE/USDT',
    'MATIC/USDT',
    'DOT/USDT',
  ]): Promise<ArbitrageScanResult> {
    const cacheKey = 'arb:scan:latest';
    const cached = await cache.get<ArbitrageScanResult>(cacheKey);
    if (cached) return cached;

    const opportunities: ArbitrageOpportunity[] = [];

    logger.info(`Scanning arbitrage opportunities for ${symbols.length} symbols across ${this.exchanges.size} exchanges...`);

    // Fetch prices for all symbols from all exchanges
    for (const symbol of symbols) {
      const prices: ExchangePrice[] = [];

      // Fetch from all exchanges in parallel
      const pricePromises = Array.from(this.exchanges.keys()).map(exchangeName =>
        this.fetchExchangePrice(exchangeName, symbol)
      );

      const results = await Promise.allSettled(pricePromises);

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          prices.push(result.value);
        }
      });

      // Calculate arbitrage for this symbol
      if (prices.length >= 2) {
        const opportunity = this.calculateArbitrage(prices, symbol);
        if (opportunity && opportunity.confidence > 60) {
          opportunities.push(opportunity);
        }
      }
    }

    // Sort by net profit percent (highest first)
    opportunities.sort((a, b) => b.netProfitPercent - a.netProfitPercent);

    const result: ArbitrageScanResult = {
      timestamp: Date.now(),
      totalOpportunities: opportunities.length,
      opportunities: opportunities.slice(0, 20), // Top 20 opportunities
      exchanges: Array.from(this.exchanges.keys()),
      symbolsScanned: symbols.length,
    };

    // Cache for 5 seconds
    await cache.set(cacheKey, result, 5);

    logger.info(`Found ${opportunities.length} arbitrage opportunities`);

    return result;
  }

  /**
   * Get real-time arbitrage opportunity for a specific symbol
   */
  async getOpportunityForSymbol(symbol: string): Promise<ArbitrageOpportunity | null> {
    const prices: ExchangePrice[] = [];

    // Fetch from all exchanges
    const pricePromises = Array.from(this.exchanges.keys()).map(exchangeName =>
      this.fetchExchangePrice(exchangeName, symbol)
    );

    const results = await Promise.allSettled(pricePromises);

    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        prices.push(result.value);
      }
    });

    if (prices.length < 2) return null;

    return this.calculateArbitrage(prices, symbol);
  }

  /**
   * Get list of common trading pairs across all exchanges
   */
  async getCommonSymbols(): Promise<string[]> {
    const cacheKey = 'arb:common_symbols';
    const cached = await cache.get<string[]>(cacheKey);
    if (cached) return cached;

    try {
      // Get markets from first exchange (usually Binance has most pairs)
        const exchange = (ccxt as any)[exchangeName];
      if (!firstExchange) return [];

      await firstExchange.loadMarkets();
      const symbols = Object.keys(firstExchange.markets)
        .filter(symbol => symbol.endsWith('/USDT'))
        .slice(0, 50); // Top 50 pairs

      // Cache for 1 hour
      await cache.set(cacheKey, symbols, 3600);

      return symbols;
    } catch (error) {
      logger.error('Failed to get common symbols:', error);
      return [
        'BTC/USDT',
        'ETH/USDT',
        'BNB/USDT',
        'SOL/USDT',
        'XRP/USDT',
      ];
    }
  }
}

export const arbitrageScannerService = new ArbitrageScannerService();
