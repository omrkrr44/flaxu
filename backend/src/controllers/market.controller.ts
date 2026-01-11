import { Request, Response } from 'express';
import { marketService } from '../services/market.service';
import { AppError } from '../middleware/errorHandler';

export class MarketController {
    /**
     * Get arbitrage opportunities
     */
    async getArbitrageOpportunities(_req: Request, res: Response) {
        try {
            const opportunities = await marketService.scanArbitrageOpportunities();

            res.status(200).json({
                status: 'success',
                results: opportunities.length,
                data: {
                    opportunities
                }
            });
        } catch (error) {
            throw new AppError('Failed to fetch arbitrage opportunities', 500);
        }
    }

    /**
     * Get liquidation heatmap data
     */
    async getHeatmapData(_req: Request, res: Response) {
        try {
            const data = await marketService.getLiquidationHeatmap();

            res.status(200).json({
                status: 'success',
                data
            });
        } catch (error) {
            throw new AppError('Failed to fetch heatmap data', 500);
        }
    }
}

export const marketController = new MarketController();
