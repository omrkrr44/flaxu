import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import config from '../config/env';
import { logger } from '../utils/logger';
import { cache } from '../config/redis';

interface BingXCredentials {
  apiKey: string;
  secretKey: string;
}

interface AccountBalance {
  totalWalletBalance: number; // Total balance in USDT
  availableBalance: number;
  totalMarginUsed: number;
  totalUnrealizedProfit: number;
}

interface ReferralInfo {
  referrerId?: string;
  referralChain?: string[]; // Array of referrer IDs (direct -> indirect)
  isDirectReferral: boolean;
  isIndirectReferral: boolean;
}

interface DepositHistory {
  coin: string;
  amount: number;
  status: string;
  time: number;
}

interface OpenPosition {
  symbol: string;
  side: 'LONG' | 'SHORT';
  positionSize: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnL: number;
  leverage: number;
  liquidationPrice: number;
}

export class BingXClient {
  private apiKey: string;
  private secretKey: string;
  private baseURL: string;
  private axiosInstance: AxiosInstance;

  constructor(credentials: BingXCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    this.baseURL = config.BINGX_USE_TESTNET
      ? config.BINGX_API_URL.replace('open-api', 'open-api-vst')
      : config.BINGX_API_URL;

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-BX-APIKEY': this.apiKey,
      },
    });
  }

  /**
   * Generate signature for BingX API
   */
  private generateSignature(params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(sortedParams)
      .digest('hex');
  }

  /**
   * Make signed request to BingX API
   */
  private async signedRequest<T>(
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    params: Record<string, any> = {}
  ): Promise<T> {
    const timestamp = Date.now();
    const requestParams = {
      ...params,
      timestamp,
    };

    const signature = this.generateSignature(requestParams);
    const finalParams = {
      ...requestParams,
      signature,
    };

    try {
      const response = await this.axiosInstance.request({
        method,
        url: endpoint,
        params: method === 'GET' ? finalParams : undefined,
        data: method !== 'GET' ? finalParams : undefined,
      });

      if (response.data.code !== 0 && response.data.code !== undefined) {
        throw new Error(`BingX API Error: ${response.data.msg || 'Unknown error'}`);
      }

      return response.data.data || response.data;
    } catch (error: any) {
      logger.error(`BingX API request failed: ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get account balance (Futures)
   */
  async getAccountBalance(): Promise<AccountBalance> {
    const cacheKey = `bingx:balance:${this.apiKey}`;
    const cached = await cache.get<AccountBalance>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.signedRequest<any>('GET', '/openApi/swap/v2/user/balance');

      const balance: AccountBalance = {
        totalWalletBalance: parseFloat(response.balance?.balance || '0'),
        availableBalance: parseFloat(response.balance?.availableMargin || '0'),
        totalMarginUsed: parseFloat(response.balance?.usedMargin || '0'),
        totalUnrealizedProfit: parseFloat(response.balance?.unrealizedProfit || '0'),
      };

      // Cache for 30 seconds
      await cache.set(cacheKey, balance, 30);

      return balance;
    } catch (error) {
      logger.error('Failed to fetch BingX account balance', error);
      throw error;
    }
  }

  /**
   * Check if a user is invited by the admin (requires admin API keys)
   * Docs: https://bingx-api.github.io/docs/#/en-us/swapV2/account-api.html#Query%20agent%20user%20information
   * Endpoint: GET /openApi/agent/v1/account/inviteRelationCheck
   */
  async checkUserInvitation(uid: string): Promise<{
    isInvited: boolean;
    isDirectInvitation: boolean;
    superiorsUid: string | null;
  }> {
    const cacheKey = `bingx:invitation:${uid}`;
    const cached = await cache.get<{ isInvited: boolean; isDirectInvitation: boolean; superiorsUid: string | null }>(cacheKey);
    if (cached) return cached;

    try {
      logger.info(`Checking BingX invitation for UID: ${uid} using admin API key: ${this.apiKey.substring(0, 10)}...`);

      const response = await this.signedRequest<any>('GET', '/openApi/agent/v1/account/inviteRelationCheck', { uid });

      const isInvited = response.inviteResult === true;
      const isDirectInvitation = response.directInvitation === true;
      const superiorsUid = response.superiorsUid ? String(response.superiorsUid) : null;

      const result = {
        isInvited,
        isDirectInvitation,
        superiorsUid,
      };

      logger.info(`BingX Invitation Check - UID: ${uid} | Invited: ${isInvited} | Direct: ${isDirectInvitation} | Inviter UID: ${superiorsUid}`);

      // Cache for 1 hour (invitation relationship doesn't change)
      await cache.set(cacheKey, result, 3600);

      return result;
    } catch (error: any) {
      logger.error(`Failed to check BingX invitation for UID ${uid}`);
      logger.error(`Error type: ${typeof error}, constructor: ${error?.constructor?.name}`);
      logger.error(`Error message: ${error?.message || 'NO MESSAGE'}`);
      logger.error(`Error code: ${error?.code || 'NO CODE'}`);
      logger.error(`HTTP status: ${error?.response?.status || 'NO STATUS'}`);
      logger.error(`Response data: ${JSON.stringify(error?.response?.data) || 'NO DATA'}`);
      logger.error(`Stack trace: ${error?.stack || 'NO STACK'}`);

      // If API fails, return default (not invited)
      return {
        isInvited: false,
        isDirectInvitation: false,
        superiorsUid: null,
      };
    }
  }

  /**
   * Get referral information (deprecated - kept for backward compatibility)
   */
  async getReferralInfo(): Promise<ReferralInfo> {
    // This method is no longer used - BingX Agent API doesn't support querying from user perspective
    return {
      referrerId: undefined,
      referralChain: [],
      isDirectReferral: false,
      isIndirectReferral: false,
    };
  }

  /**
   * Get deposit history
   */
  async getDepositHistory(startTime?: number, endTime?: number): Promise<DepositHistory[]> {
    try {
      const params: Record<string, any> = {};
      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await this.signedRequest<any>('GET', '/openApi/api/v3/capital/deposit/history', params);

      return (response || []).map((deposit: any) => ({
        coin: deposit.coin,
        amount: parseFloat(deposit.amount),
        status: deposit.status,
        time: deposit.insertTime || deposit.time,
      }));
    } catch (error) {
      logger.error('Failed to fetch BingX deposit history', error);
      return [];
    }
  }

  /**
   * Get open positions (Futures)
   */
  async getOpenPositions(symbol?: string): Promise<OpenPosition[]> {
    try {
      const params: Record<string, any> = {};
      if (symbol) params.symbol = symbol;

      const response = await this.signedRequest<any>('GET', '/openApi/swap/v2/user/positions', params);

      return (response || []).map((position: any) => ({
        symbol: position.symbol,
        side: parseFloat(position.positionAmt) > 0 ? 'LONG' as const : 'SHORT' as const,
        positionSize: Math.abs(parseFloat(position.positionAmt)),
        entryPrice: parseFloat(position.entryPrice),
        markPrice: parseFloat(position.markPrice),
        unrealizedPnL: parseFloat(position.unrealizedProfit),
        leverage: parseInt(position.leverage),
        liquidationPrice: parseFloat(position.liquidationPrice),
      }));
    } catch (error) {
      logger.error('Failed to fetch BingX open positions', error);
      return [];
    }
  }

  /**
   * Place market order (Futures)
   */
  async placeMarketOrder(params: {
    symbol: string;
    side: 'BUY' | 'SELL'; // BUY = LONG, SELL = SHORT
    positionSide: 'LONG' | 'SHORT';
    quantity: number;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<{ orderId: string; clientOrderId: string }> {
    try {
      const orderParams: Record<string, any> = {
        symbol: params.symbol,
        side: params.side,
        positionSide: params.positionSide,
        type: 'MARKET',
        quantity: params.quantity,
      };

      const response = await this.signedRequest<any>('POST', '/openApi/swap/v2/trade/order', orderParams);

      // If stop loss or take profit is provided, place them as separate orders
      if (params.stopLoss) {
        await this.placeStopLoss(params.symbol, params.positionSide, params.stopLoss, params.quantity);
      }

      if (params.takeProfit) {
        await this.placeTakeProfit(params.symbol, params.positionSide, params.takeProfit, params.quantity);
      }

      return {
        orderId: response.orderId,
        clientOrderId: response.clientOrderId,
      };
    } catch (error) {
      logger.error('Failed to place BingX market order', error);
      throw error;
    }
  }

  /**
   * Place stop loss order
   */
  private async placeStopLoss(symbol: string, positionSide: 'LONG' | 'SHORT', stopPrice: number, quantity: number): Promise<void> {
    try {
      await this.signedRequest('POST', '/openApi/swap/v2/trade/order', {
        symbol,
        side: positionSide === 'LONG' ? 'SELL' : 'BUY',
        positionSide,
        type: 'STOP_MARKET',
        stopPrice,
        quantity,
      });
    } catch (error) {
      logger.error('Failed to place stop loss', error);
      throw error;
    }
  }

  /**
   * Place take profit order
   */
  private async placeTakeProfit(symbol: string, positionSide: 'LONG' | 'SHORT', takeProfitPrice: number, quantity: number): Promise<void> {
    try {
      await this.signedRequest('POST', '/openApi/swap/v2/trade/order', {
        symbol,
        side: positionSide === 'LONG' ? 'SELL' : 'BUY',
        positionSide,
        type: 'TAKE_PROFIT_MARKET',
        stopPrice: takeProfitPrice,
        quantity,
      });
    } catch (error) {
      logger.error('Failed to place take profit', error);
      throw error;
    }
  }

  /**
   * Close position
   */
  async closePosition(symbol: string, positionSide: 'LONG' | 'SHORT'): Promise<void> {
    try {
      await this.signedRequest('POST', '/openApi/swap/v2/trade/closePosition', {
        symbol,
        positionSide,
      });
    } catch (error) {
      logger.error('Failed to close position', error);
      throw error;
    }
  }

  /**
   * Test API key validity
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountBalance();
      return true;
    } catch (error) {
      return false;
    }
  }
}
