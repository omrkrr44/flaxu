'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ArbitrageOpportunity {
  symbol: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profitPercent: number;
  profitUSD: number;
  volume24h: number;
  confidence: number;
  netProfitPercent: number;
  fees: {
    totalFees: number;
  };
}

interface ArbitrageScanResult {
  totalOpportunities: number;
  opportunities: ArbitrageOpportunity[];
  exchanges: string[];
  symbolsScanned: number;
}

export default function ArbitragePage() {
  const [scanResult, setScanResult] = useState<ArbitrageScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const scanArbitrage = async () => {
    setLoading(true);

    try {
      const response = await apiClient.get('/trading/arbitrage/scan');
      setScanResult(response.data);
    } catch (err) {
      console.error('Failed to scan arbitrage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanArbitrage();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        scanArbitrage();
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Arbitrage Scanner</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
          >
            {autoRefresh ? '⏸ Stop Auto-Refresh' : '▶ Auto-Refresh (10s)'}
          </Button>
          <Button onClick={scanArbitrage} disabled={loading}>
            {loading ? 'Scanning...' : '🔄 Scan Now'}
          </Button>
        </div>
      </div>

      {scanResult && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-gray-600 text-sm">Total Opportunities</p>
              <p className="text-3xl font-bold text-blue-600">{scanResult.totalOpportunities}</p>
            </Card>

            <Card className="p-4">
              <p className="text-gray-600 text-sm">Symbols Scanned</p>
              <p className="text-3xl font-bold text-purple-600">{scanResult.symbolsScanned}</p>
            </Card>

            <Card className="p-4">
              <p className="text-gray-600 text-sm">Exchanges</p>
              <p className="text-3xl font-bold text-green-600">{scanResult.exchanges.length}</p>
            </Card>

            <Card className="p-4">
              <p className="text-gray-600 text-sm">Best Profit</p>
              <p className="text-3xl font-bold text-orange-600">
                {scanResult.opportunities.length > 0
                  ? `${scanResult.opportunities[0].netProfitPercent.toFixed(2)}%`
                  : '0%'}
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Top Opportunities</h2>

            {scanResult.opportunities.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No profitable arbitrage opportunities found at the moment.
              </p>
            ) : (
              <div className="space-y-3">
                {scanResult.opportunities.map((opp, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <p className="text-gray-600 text-sm">Symbol</p>
                        <p className="font-bold text-lg">{opp.symbol}</p>
                      </div>

                      <div>
                        <p className="text-gray-600 text-sm">Buy @ {opp.buyExchange}</p>
                        <p className="font-medium text-blue-600">${opp.buyPrice.toFixed(4)}</p>
                      </div>

                      <div>
                        <p className="text-gray-600 text-sm">Sell @ {opp.sellExchange}</p>
                        <p className="font-medium text-green-600">${opp.sellPrice.toFixed(4)}</p>
                      </div>

                      <div>
                        <p className="text-gray-600 text-sm">Net Profit</p>
                        <p className="font-bold text-green-600 text-lg">
                          {opp.netProfitPercent.toFixed(2)}%
                        </p>
                        <p className="text-sm text-gray-500">
                          ${opp.profitUSD.toFixed(2)} on $1000
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-600 text-sm">Confidence</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${opp.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{opp.confidence}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Fees: {opp.fees.totalFees.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4 bg-blue-50">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How to Use</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Net Profit already includes trading fees and withdrawal fees</li>
              <li>• Higher confidence = higher volume and more stable spread</li>
              <li>• Consider transfer time between exchanges</li>
              <li>• Always verify prices on exchanges before executing</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
