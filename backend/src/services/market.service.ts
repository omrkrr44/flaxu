import axios from 'axios';
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

interface ExchangePrice {
  symbol: string;
  price: number;
  exchange: string;
}

export class MarketService {
  // Common symbols to check for arbitrage
  private readonly TARGET_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC'];
  
  // Base URLs for public APIs
  private readonly BINGX_API_URL = 'https://open-api.bingx.com';
  private readonly BINANCE_API_URL = 'https://api.binance.com';
  private readonly OKX_API_URL = 'https://www.okx.com';

  /**
   * Scans for arbitrage opportunities across supported exchanges
   */
  async scanArbitrageOpportunities(): Promise<ArbitrageOpportunity[]> {
    try {
      const opportunities: ArbitrageOpportunity[] = [];
      
      // Fetch prices in parallel
      const [bingxPrices, binancePrices] = await Promise.all([
        this.getBingXPrices(),
        this.getBinancePrices()
      ]);

      // Compare prices for target symbols
      for (const symbol of this.TARGET_SYMBOLS) {
        const bingx = bingxPrices.find(p => p.symbol === `${symbol}-USDT`);
        const binance = binancePrices.find(p => p.symbol === `${symbol}USDT`);

        if (bingx && binance) {
          const prices = [bingx, binance];
          const minPrice = Math.min(...prices.map(p => p.price));
          const maxPrice = Math.max(...prices.map(p => p.price));
          
          const spreadPercentage = ((maxPrice - minPrice) / minPrice) * 100;

          // If spread is > 0.5% (considering potential fees ~0.2%)
          if (spreadPercentage > 0.5) {
            const buyOp = prices.find(p => p.price === minPrice)!;
            const sellOp = prices.find(p => p.price === maxPrice)!;

            opportunities.push({
              symbol,
              buyExchange: buyOp.exchange,
              sellExchange: sellOp.exchange,
              buyPrice: buyOp.price,
              sellPrice: sellOp.price,
              spread: parseFloat(spreadPercentage.toFixed(2)),
              potentialProfit: `${spreadPercentage.toFixed(2)}%`,
              timestamp: new Date()
            });
          }
        }
      }

      return opportunities.sort((a, b) => b.spread - a.spread);

    } catch (error) {
      logger.error('Error scanning arbitrage opportunities:', error);
      throw new AppError('Failed to scan market data', 500);
    }
  }

  /**
   * Fetches latest prices from BingX
   */
  private async getBingXPrices(): Promise<ExchangePrice[]> {
    try {
      // BingX Swap Ticker Endpoint
      const response = await axios.get(`${this.BINGX_API_URL}/openApi/swap/v2/quote/ticker`);
      
      if (response.data?.code === 0 && Array.isArray(response.data?.data)) {
        return response.data.data.map((item: any) => ({
          symbol: item.symbol,
          price: parseFloat(item.lastPrice),
          exchange: 'BingX'
        }));
      }
      return [];
    } catch (error) {
      logger.error('BingX API Error:', error);
      return [];
    }
  }

  /**
   * Fetches latest prices from Binance
   */
  private async getBinancePrices(): Promise<ExchangePrice[]> {
    try {
      // Binance Ticker Price Endpoint
      const response = await axios.get(`${this.BINANCE_API_URL}/api/v3/ticker/price`);
      
      if (Array.isArray(response.data)) {
        return response.data.map((item: any) => ({
          symbol: item.symbol,
          price: parseFloat(item.price),
          exchange: 'Binance'
        }));
      }
      return [];
    } catch (error) {
      logger.error('Binance API Error:', error);
      return [];
    }
  }

  /**
   * Get Global Liquidation Heatmap Data
   * Note: Using Coinglass API requires an API Key. 
   * As fallback/demo, we return mock data structure or limited free data if available.
   */
  async getLiquidationHeatmap(): Promise<any> {
    // TODO: Integrate Coinglass API when key is available
    // For now, return a structural placeholder
    return {
      source: 'Coinglass (Mock)',
      timestamp: new Date(),
      data: [
        { symbol: 'BTC', price: 42500, liquidationIntensity: 'High', volume: '15M' },
        { symbol: 'ETH', price: 2250, liquidationIntensity: 'Medium', volume: '5M' },
        { symbol: 'SOL', price: 95, liquidationIntensity: 'High', volume: '2M' }
      ]
    };
  }
}

export const marketService = new MarketService();
