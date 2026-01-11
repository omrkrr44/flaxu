'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PumpDumpSignal {
  symbol: string;
  percentChange: number;
  type: 'PUMP' | 'DUMP';
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  firstPrice: number;
  lastPrice: number;
  timestamp: number;
  timeDetected: string;
}

export default function SniperScalpPage() {
  const [signals, setSignals] = useState<PumpDumpSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalScanned, setTotalScanned] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const scanPumpDump = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/trading/sniper/scan-all');

      if (response.data?.success && response.data?.data) {
        const { signals: newSignals, totalScanned: scanned } = response.data.data;
        setSignals(newSignals || []);
        setTotalScanned(scanned);
      } else {
        setError('No pump/dump signals found');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to scan';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanPumpDump();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => scanPumpDump(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            🎯 Sniper <span className="text-neon-cyan">Scalp Bot</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            Auto-detects 5%+ pump/dump in 5 minutes across ALL BingX Futures
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Auto-refresh (30s)</span>
          </label>
          <Button onClick={scanPumpDump} disabled={loading}>
            {loading ? 'Scanning...' : '🔄 Scan Now'}
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-400">{totalScanned}</div>
            <div className="text-xs text-muted-foreground uppercase">Pairs Scanned</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-cyan-400">{signals.length}</div>
            <div className="text-xs text-muted-foreground uppercase">Active Signals</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-400">
              {signals.filter(s => s.type === 'DUMP').length}
            </div>
            <div className="text-xs text-muted-foreground uppercase">Dump → Long</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-400">
              {signals.filter(s => s.type === 'PUMP').length}
            </div>
            <div className="text-xs text-muted-foreground uppercase">Pump → Short</div>
          </div>
        </div>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {signals.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Movement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">% Change</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Price Range</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Strategy</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-card/30">
                  <td className="px-4 py-3">
                    <div className="font-bold text-lg">{signal.symbol.split('-')[0]}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      signal.type === 'PUMP' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
                    }`}>
                      {signal.type === 'PUMP' ? '📈 PUMP' : '📉 DUMP'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-2xl font-bold ${
                      signal.percentChange > 0 ? 'text-red-400' : 'text-green-400'
                    }`}>
                      {signal.percentChange > 0 ? '+' : ''}{signal.percentChange.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-mono">
                      ${signal.firstPrice.toFixed(4)} → ${signal.lastPrice.toFixed(4)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-lg font-bold ${
                      signal.direction === 'LONG' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {signal.direction === 'LONG' ? '↗️ LONG' : '↘️ SHORT'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono">${signal.entryPrice.toFixed(4)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(signal.timeDetected).toLocaleTimeString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      className={`text-sm font-bold ${
                        signal.direction === 'LONG'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                      onClick={() => alert(`Opening ${signal.direction} for ${signal.symbol}`)}
                    >
                      🚀 {signal.direction}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            {loading ? '🔍 Scanning...' : 'No 5%+ pump/dump found. Auto-refreshing every 30s.'}
          </p>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/30">
        <h3 className="text-lg font-bold text-purple-400 mb-3">🎯 How It Works</h3>
        <ul className="space-y-2 text-sm">
          <li>• Scans <strong>ALL BingX Futures</strong> every 30 seconds</li>
          <li>• Detects <strong>5%+ movement</strong> in 5 minutes</li>
          <li>• PUMP → <strong className="text-red-400">SHORT</strong> (reversal)</li>
          <li>• DUMP → <strong className="text-green-400">LONG</strong> (reversal)</li>
          <li>• One-click trading</li>
        </ul>
      </Card>
    </div>
  );
}
