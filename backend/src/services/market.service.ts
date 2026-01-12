import ccxt, { Exchange, Ticker } from 'ccxt';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  potentialProfit: string;
  timestamp: Date;
}

export class MarketService {
  // Common symbols to check for arbitrage
  private readonly TARGET_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'BNB/USDT', 'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'DOT/USDT', 'MATIC/USDT'];

  private exchanges: Record<string, Exchange> = {};

  constructor() {
    // Initialize exchanges via CCXT
    // Note: We catch errors during init to prevent app crash if an exchange API is down or changed
    try {
      const options = { enableRateLimit: true };
      this.exchanges['bingx'] = new ccxt.bingx(options);
      this.exchanges['binance'] = new ccxt.binance(options);
      this.exchanges['okx'] = new ccxt.okx(options);
      this.exchanges['bybit'] = new ccxt.bybit(options);
      this.exchanges['kraken'] = new ccxt.kraken(options);
      this.exchanges['kucoin'] = new ccxt.kucoin(options);
      this.exchanges['gate'] = new ccxt.gate(options);
      this.exchanges['huobi'] = new ccxt.huobi(options);
      this.exchanges['bitget'] = new ccxt.bitget(options);
    } catch (e) {
      logger.error('Failed to initialize some exchanges', e);
    }
  }

  /**
   * Scans for arbitrage opportunities across supported exchanges using CCXT
   */
  async scanArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      const opportunities: ArbitrageOpportunity[] = [];

      // Fetch tickers in parallel
      const exchangeNames = Object.keys(this.exchanges);

      const pricePromises = exchangeNames.map(async (name) => {
        try {
          // Fetch tickers and narrow type
          const tickers = await this.exchanges[name].fetchTickers(this.TARGET_SYMBOLS);
          return { name, tickers };
        } catch (e) {
          logger.error(`Failed to fetch tickers from ${name}:`, e);
          return { name, tickers: {} as Record<string, Ticker> };
        }
      });

      const results = await Promise.all(pricePromises);
      const priceMap: Record<string, Record<string, number>> = {}; // symbol -> exchange -> price

      // Organize prices
      results.forEach(({ name, tickers }) => {
        Object.entries(tickers).forEach(([symbol, ticker]) => {
          // Safe access to ticker
          const t = ticker as Ticker;
          if (t && t.last !== undefined) {
            if (!priceMap[symbol]) priceMap[symbol] = {};
            priceMap[symbol][name] = t.last;
          }
        });
      });

      // Calculate spreads
      Object.entries(priceMap).forEach(([symbol, exchanges]) => {
        const prices = Object.entries(exchanges);
        if (prices.length < 2) return;

        // Find min and max
        prices.sort((a, b) => a[1] - b[1]);

        const min = prices[0];
        const max = prices[prices.length - 1];

        const spreadPercentage = ((max[1] - min[1]) / min[1]) * 100;

        // Opportunity if spread > 0.3% (slightly higher threshold for safety)
        if (spreadPercentage > 0.3) {
          opportunities.push({
            symbol: symbol.split('/')[0], // Remove /USDT
            buyExchange: min[0],
            sellExchange: max[0],
            buyPrice: min[1],
            sellPrice: max[1],
            spread: parseFloat(spreadPercentage.toFixed(2)),
            potentialProfit: `${spreadPercentage.toFixed(2)}%`,
            timestamp: new Date()
          });
        }
      });

      return opportunities.sort((a, b) => b.spread - a.spread);

    } catch (error) {
      logger.error('Error scanning arbitrage opportunities:', error);
      // Return empty array instead of crashing feature
      return [];
    }
  }

  /**
   * Get Global Liquidation Heatmap Data
   * Uses CCXT to fetch 24h volume and price change to generate a realistic heatmap
   */
  async getLiquidationHeatmap(): Promise<any> {
    try {
      const binance = this.exchanges['binance'];
      if (!binance) throw new Error('Binance exchange not authenticated');

      const tickers = await binance.fetchTickers();

      // Filter for top USDT pairs by volume
      const topPairs = Object.values(tickers)
        .map(t => t as Ticker)
        .filter(t => t.symbol && t.symbol.endsWith('/USDT') && t.quoteVolume && t.quoteVolume > 10000000)
        .sort((a, b) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
        .slice(0, 50);

      const data = topPairs.map(t => {
        const change = t.percentage || 0;
        let intensity = 'Low';
        if (Math.abs(change) > 5) intensity = 'High';
        else if (Math.abs(change) > 2.5) intensity = 'Medium';

        return {
          symbol: t.symbol.replace('/USDT', ''),
          price: t.last,
          change: parseFloat(change.toFixed(2)),
          liquidationIntensity: intensity,
          volume: `${((t.quoteVolume || 0) / 1000000).toFixed(1)}M`
        };
      });

      return {
        source: 'Binance Market Data (Live)',
        timestamp: new Date(),
        data: data
      };

    } catch (error) {
      logger.error('Heatmap Data Error:', error);
      // Fallback to empty if fails
      return { source: 'Error', timestamp: new Date(), data: [] };
    }
  }
}

export const marketService = new MarketService();
