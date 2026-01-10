'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SniperSignal {
  symbol: string;
  timestamp: number;
  type: 'PUMP_REVERSAL' | 'DUMP_REVERSAL' | 'LIQUIDATION_CASCADE' | 'NONE';
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reason: string;
  indicators: {
    pumpDetected: boolean;
    dumpDetected: boolean;
    liquidationCascade: boolean;
    volumeSpike: number;
    priceChange5m: number;
    priceChange15m: number;
  };
}

export default function SniperScalpPage() {
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [signal, setSignal] = useState<SniperSignal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'all'>('all');
  const [scanStats, setScanStats] = useState<{ totalScanned: number; signalsFound: number } | null>(null);
  const [autoScan, setAutoScan] = useState(false);

  const analyzeSymbol = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/trading/sniper/analyze/${symbol}`);
      // Backend returns { success: true, data: {...} }
      if (response.data?.success && response.data?.data) {
        setSignal(response.data.data);
      } else {
        setSignal(response.data);
      }
      setScanStats(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to analyze symbol';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      console.error('Sniper analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const scanAllSymbols = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/trading/sniper/scan-all');

      if (response.data?.success && response.data?.data) {
        const { latestSignal, totalScanned, signalsFound } = response.data.data;

        if (latestSignal) {
          setSymbol(latestSignal.symbol);
          setSignal(latestSignal.signal);
          setScanStats({ totalScanned, signalsFound });
        } else {
          setError('No signals found across all symbols');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to scan all symbols';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scanMode === 'all') {
      scanAllSymbols();
    } else {
      analyzeSymbol();
    }
  }, [scanMode]);

  useEffect(() => {
    if (!autoScan) return;

    const interval = setInterval(() => {
      if (scanMode === 'all') {
        scanAllSymbols();
      } else {
        analyzeSymbol();
      }
    }, 30000); // Scan every 30 seconds

    return () => clearInterval(interval);
  }, [autoScan, symbol, scanMode]);

  const getSignalColor = (type: string) => {
    switch (type) {
      case 'PUMP_REVERSAL':
        return 'from-red-500 to-orange-500';
      case 'DUMP_REVERSAL':
        return 'from-green-500 to-emerald-500';
      case 'LIQUIDATION_CASCADE':
        return 'from-purple-500 to-pink-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sniper Scalp Bot</h1>
          {scanStats && (
            <p className="text-sm text-muted-foreground mt-1">
              Scanned {scanStats.totalScanned} symbols • Found {scanStats.signalsFound} signals
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1">
            <button
              onClick={() => setScanMode('all')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                scanMode === 'all'
                  ? 'bg-neon-purple text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🔍 Scan All
            </button>
            <button
              onClick={() => setScanMode('single')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                scanMode === 'single'
                  ? 'bg-neon-purple text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📊 Single Symbol
            </button>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScan}
              onChange={(e) => setAutoScan(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Auto-scan (30s)</span>
          </label>
          {scanMode === 'single' && (
            <>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Symbol (e.g., BTC-USDT)"
                className="px-4 py-2 border rounded-lg bg-background text-foreground"
              />
              <Button onClick={analyzeSymbol} disabled={loading}>
                {loading ? 'Scanning...' : 'Scan Now'}
              </Button>
            </>
          )}
          {scanMode === 'all' && (
            <Button onClick={scanAllSymbols} disabled={loading}>
              {loading ? 'Scanning...' : '🔄 Rescan All'}
            </Button>
          )}
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-neon-purple/30">
        <h2 className="text-xl font-bold mb-2 text-neon-purple">Fast Scalping Signals</h2>
        <p className="text-muted-foreground">
          Detects pump/dump reversals, liquidation cascades, and volume spikes for quick scalp opportunities.
        </p>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {signal && (
        <>
          {/* Main Signal Card */}
          <Card className={`p-6 bg-gradient-to-br ${getSignalColor(signal.type)} text-white`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold mb-1">{signal.symbol}</h2>
                <p className="text-white/80">
                  {signal.type !== 'NONE' ? signal.type.replace('_', ' ') : 'No Signal'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/80">Confidence</div>
                <div className="text-4xl font-bold">{signal.confidence.toFixed(0)}%</div>
              </div>
            </div>

            {signal.type !== 'NONE' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-white/20">
                <div>
                  <div className="text-sm text-white/80">Direction</div>
                  <div className="text-xl font-bold">{signal.direction}</div>
                </div>
                <div>
                  <div className="text-sm text-white/80">Entry</div>
                  <div className="text-xl font-bold">${signal.entryPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/80">Stop Loss</div>
                  <div className="text-xl font-bold">${signal.stopLoss.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-white/80">Take Profit</div>
                  <div className="text-xl font-bold">${signal.takeProfit.toFixed(2)}</div>
                </div>
              </div>
            )}

            {signal.reason && (
              <div className="mt-4 p-3 bg-white/10 rounded-lg">
                <div className="text-sm font-semibold mb-1">Reason</div>
                <div className="text-white/90">{signal.reason}</div>
              </div>
            )}

            {signal.type !== 'NONE' && (
              <div className="mt-4 flex gap-3">
                <Button
                  className={`flex-1 text-lg font-bold py-3 ${
                    signal.direction === 'LONG'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                  onClick={() => alert(`Opening ${signal.direction} position for ${signal.symbol}\nEntry: $${signal.entryPrice}\nSL: $${signal.stopLoss}\nTP: $${signal.takeProfit}`)}
                >
                  🚀 Open {signal.direction} Position
                </Button>
              </div>
            )}
          </Card>

          {/* Indicators Card */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Market Indicators</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-lg ${signal.indicators.pumpDetected ? 'bg-red-900/20 border-2 border-red-500' : 'bg-card border border-border'}`}>
                <div className="text-sm text-muted-foreground mb-1">Pump Detected</div>
                <div className={`text-2xl font-bold ${signal.indicators.pumpDetected ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {signal.indicators.pumpDetected ? 'YES' : 'NO'}
                </div>
              </div>

              <div className={`p-4 rounded-lg ${signal.indicators.dumpDetected ? 'bg-green-900/20 border-2 border-green-500' : 'bg-card border border-border'}`}>
                <div className="text-sm text-muted-foreground mb-1">Dump Detected</div>
                <div className={`text-2xl font-bold ${signal.indicators.dumpDetected ? 'text-green-400' : 'text-muted-foreground'}`}>
                  {signal.indicators.dumpDetected ? 'YES' : 'NO'}
                </div>
              </div>

              <div className={`p-4 rounded-lg ${signal.indicators.liquidationCascade ? 'bg-purple-900/20 border-2 border-purple-500' : 'bg-card border border-border'}`}>
                <div className="text-sm text-muted-foreground mb-1">Liquidation Cascade</div>
                <div className={`text-2xl font-bold ${signal.indicators.liquidationCascade ? 'text-purple-400' : 'text-muted-foreground'}`}>
                  {signal.indicators.liquidationCascade ? 'YES' : 'NO'}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-900/20 border border-neon-blue/30">
                <div className="text-sm text-muted-foreground mb-1">Volume Spike</div>
                <div className="text-2xl font-bold text-neon-blue">
                  {signal.indicators.volumeSpike.toFixed(1)}x
                </div>
              </div>

              <div className="p-4 rounded-lg bg-indigo-900/20 border border-border">
                <div className="text-sm text-muted-foreground mb-1">5m Price Change</div>
                <div className={`text-2xl font-bold ${signal.indicators.priceChange5m > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {signal.indicators.priceChange5m > 0 ? '+' : ''}{signal.indicators.priceChange5m.toFixed(2)}%
                </div>
              </div>

              <div className="p-4 rounded-lg bg-violet-900/20 border border-border">
                <div className="text-sm text-muted-foreground mb-1">15m Price Change</div>
                <div className={`text-2xl font-bold ${signal.indicators.priceChange15m > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {signal.indicators.priceChange15m > 0 ? '+' : ''}{signal.indicators.priceChange15m.toFixed(2)}%
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-yellow-900/20 border-neon-yellow/30">
            <h3 className="text-lg font-bold text-neon-yellow mb-2">⚡ Fast Scalp Strategy</h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• <strong>Entry:</strong> Enter at detected reversal or liquidation bounce</li>
              <li>• <strong>Quick Exit:</strong> Take profit at first resistance/support (0.5-1.5% target)</li>
              <li>• <strong>Tight Stop:</strong> Use tight stop-loss to minimize risk (0.3-0.5%)</li>
              <li>• <strong>Time Limit:</strong> Close position within 15-30 minutes if no movement</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
