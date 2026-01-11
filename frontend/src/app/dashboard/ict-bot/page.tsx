'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ICTSignal {
  symbol: string;
  timeframe: string;
  direction: 'LONG' | 'SHORT';
  signalType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskRewardRatio: number;
  confidence: number;
  trend: string;
  volatility: number;
}

interface SignalWithStatus extends ICTSignal {
  leverage: number;
  progress: number;
  status: 'Active' | 'TP1 Hit' | 'TP2 Hit' | 'TP3 Hit' | 'SL Hit';
  pnl: number;
  timestamp: number;
}

export default function ICTBotPage() {
  const [signals, setSignals] = useState<SignalWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'long' | 'short'>('all');

  // Stats
  const totalSignals = signals.length;
  const activeSignals = signals.filter(s => s.status === 'Active').length;
  const tpHits = signals.filter(s => s.status.includes('TP')).length;
  const slHits = signals.filter(s => s.status === 'SL Hit').length;
  const longWins = signals.filter(s => s.direction === 'LONG' && s.status.includes('TP')).length;
  const longTotal = signals.filter(s => s.direction === 'LONG' && s.status !== 'Active').length;
  const shortWins = signals.filter(s => s.direction === 'SHORT' && s.status.includes('TP')).length;
  const shortTotal = signals.filter(s => s.direction === 'SHORT' && s.status !== 'Active').length;
  const winRate = totalSignals > 0 ? ((tpHits / (tpHits + slHits)) * 100) : 0;
  const longWinRate = longTotal > 0 ? ((longWins / longTotal) * 100) : 0;
  const shortWinRate = shortTotal > 0 ? ((shortWins / shortTotal) * 100) : 0;
  const avgPnl = signals.length > 0 ? (signals.reduce((sum, s) => sum + s.pnl, 0) / signals.length) : 0;

  const fetchAllSignals = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/trading/ict/scan-all');

      if (response.data?.success && response.data?.data) {
        const { allSignals } = response.data.data;

        if (allSignals && allSignals.length > 0) {
          // Convert signals to SignalWithStatus format
          const processedSignals: SignalWithStatus[] = allSignals
            .filter((item: any) => item.analysis?.bestSignal)
            .map((item: any) => {
              const signal = item.analysis.bestSignal;
              const currentPrice = signal.entryPrice * (1 + (Math.random() - 0.5) * 0.02); // Mock current price

              // Calculate progress and status
              let progress = 0;
              let status: SignalWithStatus['status'] = 'Active';
              let pnl = 0;

              if (signal.direction === 'LONG') {
                if (currentPrice <= signal.stopLoss) {
                  status = 'SL Hit';
                  pnl = -2; // Mock loss
                  progress = 0;
                } else if (currentPrice >= signal.takeProfit3) {
                  status = 'TP3 Hit';
                  pnl = signal.riskRewardRatio * 3;
                  progress = 100;
                } else if (currentPrice >= signal.takeProfit2) {
                  status = 'TP2 Hit';
                  pnl = signal.riskRewardRatio * 2;
                  progress = 75;
                } else if (currentPrice >= signal.takeProfit1) {
                  status = 'TP1 Hit';
                  pnl = signal.riskRewardRatio;
                  progress = 50;
                } else {
                  const range = signal.takeProfit1 - signal.entryPrice;
                  const moved = currentPrice - signal.entryPrice;
                  progress = Math.max(0, Math.min(100, (moved / range) * 50));
                  pnl = (currentPrice - signal.entryPrice) / signal.entryPrice * 100 * 3; // 3x leverage
                }
              } else {
                if (currentPrice >= signal.stopLoss) {
                  status = 'SL Hit';
                  pnl = -2;
                  progress = 0;
                } else if (currentPrice <= signal.takeProfit3) {
                  status = 'TP3 Hit';
                  pnl = signal.riskRewardRatio * 3;
                  progress = 100;
                } else if (currentPrice <= signal.takeProfit2) {
                  status = 'TP2 Hit';
                  pnl = signal.riskRewardRatio * 2;
                  progress = 75;
                } else if (currentPrice <= signal.takeProfit1) {
                  status = 'TP1 Hit';
                  pnl = signal.riskRewardRatio;
                  progress = 50;
                } else {
                  const range = signal.entryPrice - signal.takeProfit1;
                  const moved = signal.entryPrice - currentPrice;
                  progress = Math.max(0, Math.min(100, (moved / range) * 50));
                  pnl = (signal.entryPrice - currentPrice) / signal.entryPrice * 100 * 3;
                }
              }

              return {
                ...signal,
                leverage: 3,
                progress,
                status,
                pnl,
                timestamp: item.timestamp || Date.now(),
              };
            });

          setSignals(processedSignals);
        } else {
          setError('No signals found');
        }
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to fetch signals';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSignals();
  }, []);

  const filteredSignals = signals.filter(s => {
    if (filter === 'long') return s.direction === 'LONG';
    if (filter === 'short') return s.direction === 'SHORT';
    return true;
  });

  const getStatusColor = (status: string) => {
    if (status.includes('TP')) return 'text-green-400';
    if (status === 'SL Hit') return 'text-red-400';
    return 'text-orange-400';
  };

  const getStatusBgColor = (status: string) => {
    if (status.includes('TP')) return 'bg-green-900/30 border-green-500';
    if (status === 'SL Hit') return 'bg-red-900/30 border-red-500';
    return 'bg-orange-900/30 border-orange-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📊 ICT Signal <span className="text-neon-cyan">Performance</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            All tokens scanned - Latest signals from ALL BingX pairs
          </p>
        </div>
        <Button onClick={fetchAllSignals} disabled={loading}>
          {loading ? 'Scanning...' : '🔄 Scan All Tokens'}
        </Button>
      </div>

      {/* Stats - Compact Horizontal */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-blue-400">{totalSignals}</div>
            <div className="text-xs text-muted-foreground uppercase">Total Signals</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-cyan-400">{activeSignals}</div>
            <div className="text-xs text-muted-foreground uppercase">Active</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-400">{winRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground uppercase">Win Rate</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-emerald-400">{tpHits}</div>
            <div className="text-xs text-muted-foreground uppercase">TP Hits</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-red-400">{slHits}</div>
            <div className="text-xs text-muted-foreground uppercase">SL Hits</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-green-400">{longWinRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground uppercase">Long Win Rate</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-rose-400">{shortWinRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground uppercase">Short Win Rate</div>
          </div>
          <div className="h-8 w-px bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-purple-400">{avgPnl.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground uppercase">Ort. Sinyal Güç</div>
          </div>
        </div>
      </Card>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-neon-cyan text-background'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          All Signals <span className="ml-2 text-xs bg-background/30 px-2 py-1 rounded">{signals.length}</span>
        </button>
        <button
          onClick={() => setFilter('long')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'long'
              ? 'bg-green-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Long Only
        </button>
        <button
          onClick={() => setFilter('short')}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            filter === 'short'
              ? 'bg-red-600 text-white'
              : 'bg-card text-muted-foreground hover:text-foreground'
          }`}
        >
          Short Only
        </button>
      </div>

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {/* Signals Table */}
      {filteredSignals.length > 0 ? (
        <Card className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-card/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Güç</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">TP1 / TP2 / TP3</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">SL</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Leverage</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">P&L</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredSignals.map((signal, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-card/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-foreground">{signal.symbol.split('-')[0]}</div>
                    <div className="text-xs text-muted-foreground">{signal.timeframe}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      signal.direction === 'LONG'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}>
                      {signal.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${signal.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-yellow-500">{signal.confidence.toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">${signal.entryPrice.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs font-mono">
                      <span className="text-green-400">${signal.takeProfit1.toFixed(2)}</span>
                      <span className="text-green-400">${signal.takeProfit2.toFixed(2)}</span>
                      <span className="text-green-400">${signal.takeProfit3.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-red-400">${signal.stopLoss.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs font-bold border border-yellow-500">
                      {signal.leverage}x
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 min-w-[60px]">
                        <div
                          className={`h-2 rounded-full ${
                            signal.status.includes('TP') ? 'bg-green-500' :
                            signal.status === 'SL Hit' ? 'bg-red-500' :
                            'bg-orange-500'
                          }`}
                          style={{ width: `${signal.progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold border ${getStatusBgColor(signal.status)} ${getStatusColor(signal.status)}`}>
                      {signal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${signal.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {signal.pnl >= 0 ? '+' : ''}{signal.pnl.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(signal.timestamp).toLocaleString('tr-TR', {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">
            {loading ? 'Loading signals...' : 'No signals found. Click Refresh to scan all symbols.'}
          </p>
        </Card>
      )}
    </div>
  );
}
