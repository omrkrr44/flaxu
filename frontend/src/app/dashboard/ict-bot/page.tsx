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

interface MultiTimeframeAnalysis {
  symbol: string;
  '15m': ICTSignal | null;
  '1h': ICTSignal | null;
  '4h': ICTSignal | null;
  '1d': ICTSignal | null;
  confluenceScore: number;
  bestSignal: ICTSignal | null;
}

export default function ICTBotPage() {
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [analysis, setAnalysis] = useState<MultiTimeframeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<'single' | 'all'>('all');
  const [scanStats, setScanStats] = useState<{ totalScanned: number; signalsFound: number } | null>(null);

  const analyzeSymbol = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/api/trading/ict/analyze/${symbol}`);
      // Backend returns { success: true, data: {...} }
      if (response.data?.success && response.data?.data) {
        setAnalysis(response.data.data);
      } else {
        setAnalysis(response.data);
      }
      setScanStats(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to analyze symbol';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    } finally {
      setLoading(false);
    }
  };

  const scanAllSymbols = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get('/api/trading/ict/scan-all');

      if (response.data?.success && response.data?.data) {
        const { latestSignal, totalScanned, signalsFound } = response.data.data;

        if (latestSignal) {
          setSymbol(latestSignal.symbol);
          setAnalysis(latestSignal.analysis);
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

  const renderSignal = (signal: ICTSignal | null, timeframe: string) => {
    if (!signal) {
      return (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-2">{timeframe}</h3>
          <p className="text-gray-500">No signal</p>
        </Card>
      );
    }

    return (
      <Card className={`p-4 border-2 ${signal.direction === 'LONG' ? 'border-green-500' : 'border-red-500'}`}>
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold">{timeframe}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            signal.direction === 'LONG' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {signal.direction}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Signal Type:</span>
            <span className="font-medium">{signal.signalType}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-bold text-blue-600">{signal.confidence.toFixed(1)}%</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry:</span>
            <span className="font-medium">${signal.entryPrice.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Stop Loss:</span>
            <span className="font-medium text-red-600">${signal.stopLoss.toFixed(2)}</span>
          </div>

          <div className="space-y-1 mt-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP1:</span>
              <span className="font-medium text-green-600">${signal.takeProfit1.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP2:</span>
              <span className="font-medium text-green-600">${signal.takeProfit2.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TP3:</span>
              <span className="font-medium text-green-600">${signal.takeProfit3.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between mt-2 pt-2 border-t">
            <span className="text-muted-foreground">R:R Ratio:</span>
            <span className="font-bold text-purple-600">{signal.riskRewardRatio.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Trend:</span>
            <span className={`font-medium ${
              signal.trend === 'bullish' ? 'text-green-600' : signal.trend === 'bearish' ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {signal.trend.toUpperCase()}
            </span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">ICT & Price Action Bot</h1>
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
                  ? 'bg-neon-cyan text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              🔍 Scan All
            </button>
            <button
              onClick={() => setScanMode('single')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                scanMode === 'single'
                  ? 'bg-neon-cyan text-background'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              📊 Single Symbol
            </button>
          </div>
          {scanMode === 'single' && (
            <>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="Symbol (e.g., BTC-USDT)"
                className="px-4 py-2 border rounded-lg bg-background text-foreground"
              />
              <Button onClick={analyzeSymbol} disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze'}
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

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {analysis && (
        <>
          <Card className="p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-neon-cyan/30">
            <h2 className="text-2xl font-bold mb-4 text-neon-cyan">Best Signal: {analysis.symbol}</h2>
            {analysis.bestSignal ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground">Timeframe</p>
                  <p className="text-2xl font-bold">{analysis.bestSignal.timeframe}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Direction</p>
                  <p className={`text-2xl font-bold ${
                    analysis.bestSignal.direction === 'LONG' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analysis.bestSignal.direction}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confluence Score</p>
                  <p className="text-2xl font-bold text-blue-600">{analysis.confluenceScore.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Confidence</p>
                  <p className="text-2xl font-bold text-purple-600">{analysis.bestSignal.confidence.toFixed(1)}%</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-lg">No high-confidence signal detected</p>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {renderSignal(analysis['15m'], '15 Minutes')}
            {renderSignal(analysis['1h'], '1 Hour')}
            {renderSignal(analysis['4h'], '4 Hours')}
            {renderSignal(analysis['1d'], '1 Day')}
          </div>
        </>
      )}
    </div>
  );
}
