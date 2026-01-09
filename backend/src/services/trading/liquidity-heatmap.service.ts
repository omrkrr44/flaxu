import ccxt from 'ccxt';
import { logger } from '../../utils/logger';
import { cache } from '../../config/redis';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number; // Cumulative amount
}

export interface AggregatedOrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  exchanges: string[];
  totalBidLiquidity: number;
  totalAskLiquidity: number;
}

export interface LiquidityCluster {
  price: number;
  liquidity: number;
  side: 'bid' | 'ask';
  strength: number; // 0-100
  exchanges: string[]; // Which exchanges contribute to this cluster
}

export interface LiquidityHeatmapData {
  symbol: string;
  timestamp: number;
  currentPrice: number;

  // Aggregated order book
  orderBook: AggregatedOrderBook;

  // Liquidity clusters (support/resistance zones)
  bidClusters: LiquidityCluster[];
  askClusters: LiquidityCluster[];

  // Key levels
  strongestSupport: number;
  strongestResistance: number;

  // Liquidity ratio (bid/ask)
  liquidityRatio: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
}

export interface LiquidityLevel {
  price: number;
  volume: number;
  side: 'bid' | 'ask';
  percentFromMid: number;
}

// ============================================================================
// LIQUIDITY HEATMAP SERVICE
// ============================================================================

export class LiquidityHeatmapService {
        const ExchangeClass = (ccxt as any)[exchangeName] as any;
  private readonly SUPPORTED_EXCHANGES = [
    'binance',
    'bybit',
    'okx',
    'gateio',
    'kucoin',
  ];

  private readonly ORDERBOOK_DEPTH = 100; // Fetch top 100 levels

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
        logger.info(`Initialized exchange for liquidity: ${exchangeName}`);
      } catch (error) {
        logger.error(`Failed to initialize exchange ${exchangeName}:`, error);
      }
    }
  }

  /**
   * Fetch order book from a specific exchange
   */
  private async fetchOrderBook(
    exchangeName: string,
    symbol: string,
    limit: number = this.ORDERBOOK_DEPTH
  ): Promise<{ bids: [number, number][]; asks: [number, number][] } | null> {
    try {
      const exchange = this.exchanges.get(exchangeName);
      if (!exchange) return null;

      const orderbook = await exchange.fetchOrderBook(symbol, limit);

      return {
        bids: orderbook.bids || [],
        asks: orderbook.asks || [],
      };
    } catch (error: any) {
      logger.debug(`Failed to fetch order book from ${exchangeName} for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Aggregate order books from multiple exchanges
   */
  private aggregateOrderBooks(
    orderbooks: Map<string, { bids: [number, number][]; asks: [number, number][] }>,
    symbol: string
  ): AggregatedOrderBook {
    const aggregatedBids: Map<number, { amount: number; exchanges: Set<string> }> = new Map();
    const aggregatedAsks: Map<number, { amount: number; exchanges: Set<string> }> = new Map();

    // Aggregate bids
    orderbooks.forEach((book, exchangeName) => {
      book.bids.forEach(([price, amount]) => {
        const roundedPrice = Math.round(price * 100) / 100; // Round to 2 decimals
        const existing = aggregatedBids.get(roundedPrice) || { amount: 0, exchanges: new Set() };
        existing.amount += amount;
        existing.exchanges.add(exchangeName);
        aggregatedBids.set(roundedPrice, existing);
      });
    });

    // Aggregate asks
    orderbooks.forEach((book, exchangeName) => {
      book.asks.forEach(([price, amount]) => {
        const roundedPrice = Math.round(price * 100) / 100;
        const existing = aggregatedAsks.get(roundedPrice) || { amount: 0, exchanges: new Set() };
        existing.amount += amount;
        existing.exchanges.add(exchangeName);
        aggregatedAsks.set(roundedPrice, existing);
      });
    });

    // Convert to sorted arrays with cumulative totals
    const sortedBids = Array.from(aggregatedBids.entries())
      .sort(([a], [b]) => b - a) // Descending price
      .map(([price, data], index, arr) => ({
        price,
        amount: data.amount,
        total: arr.slice(0, index + 1).reduce((sum, [, d]) => sum + d.amount, 0),
      }));

    const sortedAsks = Array.from(aggregatedAsks.entries())
      .sort(([a], [b]) => a - b) // Ascending price
      .map(([price, data], index, arr) => ({
        price,
        amount: data.amount,
        total: arr.slice(0, index + 1).reduce((sum, [, d]) => sum + d.amount, 0),
      }));

    const totalBidLiquidity = sortedBids.reduce((sum, level) => sum + level.amount, 0);
    const totalAskLiquidity = sortedAsks.reduce((sum, level) => sum + level.amount, 0);

    return {
      symbol,
      timestamp: Date.now(),
      bids: sortedBids.slice(0, 50), // Top 50 levels
      asks: sortedAsks.slice(0, 50),
      exchanges: Array.from(orderbooks.keys()),
      totalBidLiquidity,
      totalAskLiquidity,
    };
  }

  /**
   * Detect liquidity clusters (zones with high liquidity)
   */
  private detectLiquidityClusters(
    orderBook: AggregatedOrderBook,
    currentPrice: number
  ): { bidClusters: LiquidityCluster[]; askClusters: LiquidityCluster[] } {
    const bidClusters: LiquidityCluster[] = [];
    const askClusters: LiquidityCluster[] = [];

    // Group nearby price levels into clusters (within 0.5% of each other)
    const clusterThreshold = currentPrice * 0.005; // 0.5%

    // Detect bid clusters
    let currentCluster: { price: number; liquidity: number; exchanges: Set<string> } | null = null;

    for (const level of orderBook.bids) {
      if (!currentCluster) {
        currentCluster = {
          price: level.price,
          liquidity: level.amount,
          exchanges: new Set(orderBook.exchanges),
        };
      } else if (Math.abs(level.price - currentCluster.price) <= clusterThreshold) {
        // Add to current cluster
        currentCluster.liquidity += level.amount;
      } else {
        // Save current cluster and start new one
        if (currentCluster.liquidity > 0) {
          const strength = Math.min(100, (currentCluster.liquidity / orderBook.totalBidLiquidity) * 500);
          bidClusters.push({
            price: currentCluster.price,
            liquidity: currentCluster.liquidity,
            side: 'bid',
            strength,
            exchanges: Array.from(currentCluster.exchanges),
          });
        }

        currentCluster = {
          price: level.price,
          liquidity: level.amount,
          exchanges: new Set(orderBook.exchanges),
        };
      }
    }

    // Add last bid cluster
    if (currentCluster && currentCluster.liquidity > 0) {
      const strength = Math.min(100, (currentCluster.liquidity / orderBook.totalBidLiquidity) * 500);
      bidClusters.push({
        price: currentCluster.price,
        liquidity: currentCluster.liquidity,
        side: 'bid',
        strength,
        exchanges: Array.from(currentCluster.exchanges),
      });
    }

    // Detect ask clusters
    currentCluster = null;

    for (const level of orderBook.asks) {
      if (!currentCluster) {
        currentCluster = {
          price: level.price,
          liquidity: level.amount,
          exchanges: new Set(orderBook.exchanges),
        };
      } else if (Math.abs(level.price - currentCluster.price) <= clusterThreshold) {
        currentCluster.liquidity += level.amount;
      } else {
        if (currentCluster.liquidity > 0) {
          const strength = Math.min(100, (currentCluster.liquidity / orderBook.totalAskLiquidity) * 500);
          askClusters.push({
            price: currentCluster.price,
            liquidity: currentCluster.liquidity,
            side: 'ask',
            strength,
            exchanges: Array.from(currentCluster.exchanges),
          });
        }

        currentCluster = {
          price: level.price,
          liquidity: level.amount,
          exchanges: new Set(orderBook.exchanges),
        };
      }
    }

    // Add last ask cluster
    if (currentCluster && currentCluster.liquidity > 0) {
      const strength = Math.min(100, (currentCluster.liquidity / orderBook.totalAskLiquidity) * 500);
      askClusters.push({
        price: currentCluster.price,
        liquidity: currentCluster.liquidity,
        side: 'ask',
        strength,
        exchanges: Array.from(currentCluster.exchanges),
      });
    }

    // Sort by strength
    bidClusters.sort((a, b) => b.strength - a.strength);
    askClusters.sort((a, b) => b.strength - a.strength);

    return { bidClusters, askClusters };
  }

  /**
   * Generate liquidity heatmap for a symbol
   */
  async generateHeatmap(symbol: string): Promise<LiquidityHeatmapData | null> {
    const cacheKey = `liquidity:heatmap:${symbol}`;
    const cached = await cache.get<LiquidityHeatmapData>(cacheKey);
    if (cached) return cached;

    try {
      logger.info(`Generating liquidity heatmap for ${symbol}...`);

      // Fetch order books from all exchanges in parallel
      const orderbookPromises = Array.from(this.exchanges.keys()).map(async exchangeName => {
        const book = await this.fetchOrderBook(exchangeName, symbol);
        return { exchangeName, book };
      });

      const results = await Promise.allSettled(orderbookPromises);

      const orderbooks = new Map<string, { bids: [number, number][]; asks: [number, number][] }>();
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.book) {
          orderbooks.set(result.value.exchangeName, result.value.book);
        }
      });

      if (orderbooks.size === 0) {
        logger.warn(`No order book data available for ${symbol}`);
        return null;
      }

      // Aggregate order books
      const aggregatedOrderBook = this.aggregateOrderBooks(orderbooks, symbol);

      // Get current price (mid price)
      const currentPrice = aggregatedOrderBook.bids.length > 0 && aggregatedOrderBook.asks.length > 0
        ? (aggregatedOrderBook.bids[0].price + aggregatedOrderBook.asks[0].price) / 2
        : 0;

      // Detect liquidity clusters
      const { bidClusters, askClusters } = this.detectLiquidityClusters(aggregatedOrderBook, currentPrice);

      // Find strongest support and resistance
      const strongestSupport = bidClusters.length > 0 ? bidClusters[0].price : 0;
      const strongestResistance = askClusters.length > 0 ? askClusters[0].price : 0;

      // Calculate liquidity ratio and sentiment
      const liquidityRatio = aggregatedOrderBook.totalBidLiquidity / (aggregatedOrderBook.totalAskLiquidity || 1);
      let marketSentiment: 'bullish' | 'bearish' | 'neutral';

      if (liquidityRatio > 1.2) marketSentiment = 'bullish';
      else if (liquidityRatio < 0.8) marketSentiment = 'bearish';
      else marketSentiment = 'neutral';

      const heatmapData: LiquidityHeatmapData = {
        symbol,
        timestamp: Date.now(),
        currentPrice,
        orderBook: aggregatedOrderBook,
        bidClusters: bidClusters.slice(0, 10), // Top 10 support zones
        askClusters: askClusters.slice(0, 10), // Top 10 resistance zones
        strongestSupport,
        strongestResistance,
        liquidityRatio,
        marketSentiment,
      };

      // Cache for 10 seconds
      await cache.set(cacheKey, heatmapData, 10);

      logger.info(`Generated liquidity heatmap for ${symbol}: ${bidClusters.length} bid clusters, ${askClusters.length} ask clusters`);

      return heatmapData;
    } catch (error) {
      logger.error(`Failed to generate liquidity heatmap for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get simplified liquidity levels for visualization
   */
  async getLiquidityLevels(symbol: string, numLevels: number = 20): Promise<LiquidityLevel[]> {
    const heatmap = await this.generateHeatmap(symbol);
    if (!heatmap) return [];

    const levels: LiquidityLevel[] = [];
    const midPrice = heatmap.currentPrice;

    // Add bid levels
    heatmap.orderBook.bids.slice(0, numLevels).forEach(bid => {
      levels.push({
        price: bid.price,
        volume: bid.amount,
        side: 'bid',
        percentFromMid: ((bid.price - midPrice) / midPrice) * 100,
      });
    });

    // Add ask levels
    heatmap.orderBook.asks.slice(0, numLevels).forEach(ask => {
      levels.push({
        price: ask.price,
        volume: ask.amount,
        side: 'ask',
        percentFromMid: ((ask.price - midPrice) / midPrice) * 100,
      });
    });

    return levels;
  }
}

export const liquidityHeatmapService = new LiquidityHeatmapService();
