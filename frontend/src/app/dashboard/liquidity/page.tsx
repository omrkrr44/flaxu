'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LiquidityLevel {
  price: number;
  totalVolume: number;
  exchanges: {
    [exchange: string]: number;
  };
  type: 'bid' | 'ask';
  strength: number; // 0-100
}

interface LiquidityHeatmap {
  symbol: string;
  timestamp: number;
  currentPrice: number;
  levels: LiquidityLevel[];
  clusters: {
    price: number;
    strength: number;
    type: 'support' | 'resistance';
    volume: number;
  }[];
  exchanges: string[];
}

export default function LiquidityHeatmapPage() {
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [heatmap, setHeatmap] = useState<LiquidityHeatmap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHeatmap = async () => {
    setLoading(true);
    setError(null);

    try {
      // Encode symbol to handle slashes in URLs
      const encodedSymbol = encodeURIComponent(symbol);
      const response = await apiClient.get(`/api/trading/liquidity/heatmap/${encodedSymbol}`);
      // Backend returns { success: true, data: {...} }
      if (response.data?.success && response.data?.data) {
        setHeatmap(response.data.data);
      } else {
        setHeatmap(response.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.error || err.message || 'Failed to fetch liquidity heatmap';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      console.error('Liquidity heatmap error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch available symbols from backend
    const fetchSymbols = async () => {
      try {
        const response = await apiClient.get('/api/trading/symbols');
        if (response.data?.success && response.data?.data) {
          setAvailableSymbols(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch symbols:', err);
        // Fallback to popular symbols
        setAvailableSymbols([
          'BTC-USDT', 'ETH-USDT', 'BNB-USDT', 'XRP-USDT', 'ADA-USDT',
          'SOL-USDT', 'DOGE-USDT', 'DOT-USDT', 'MATIC-USDT', 'LTC-USDT',
          'AVAX-USDT', 'LINK-USDT', 'UNI-USDT', 'ATOM-USDT', 'ETC-USDT',
        ]);
      }
    };

    fetchSymbols();
    fetchHeatmap();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHeatmap();
    }, 15000); // Refresh every 15 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, symbol]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDropdown && !target.closest('.relative')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return 'bg-red-600';
    if (strength >= 60) return 'bg-orange-500';
    if (strength >= 40) return 'bg-yellow-500';
    if (strength >= 20) return 'bg-green-500';
    return 'bg-blue-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength >= 80) return 'Very Strong';
    if (strength >= 60) return 'Strong';
    if (strength >= 40) return 'Moderate';
    if (strength >= 20) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Liquidity Heatmap</h1>
        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Auto-refresh (15s)</span>
          </label>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-4 py-2 border rounded-lg bg-background text-foreground flex items-center gap-2 min-w-[180px] justify-between"
            >
              <span>{symbol}</span>
              <span>{showDropdown ? '▲' : '▼'}</span>
            </button>
            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full min-w-[200px] bg-card border border-border rounded-lg shadow-lg">
                <div className="p-2 border-b border-border sticky top-0 bg-card">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search symbol..."
                    className="w-full px-3 py-2 bg-background border border-border rounded text-sm"
                    autoFocus
                  />
                </div>
                <div className="max-h-60 overflow-auto">
                  {availableSymbols
                    .filter(sym => sym.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((sym) => (
                      <button
                        key={sym}
                        onClick={() => {
                          setSymbol(sym);
                          setShowDropdown(false);
                          setSearchQuery('');
                          fetchHeatmap();
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-neon-cyan/20 transition-colors ${
                          sym === symbol ? 'bg-neon-cyan/30 text-neon-cyan' : 'text-foreground'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  {availableSymbols.filter(sym => sym.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="px-4 py-3 text-center text-muted-foreground text-sm">
                      No symbols found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button onClick={fetchHeatmap} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-neon-cyan/30">
        <h2 className="text-xl font-bold mb-2 text-neon-cyan">Order Book Aggregation</h2>
        <p className="text-muted-foreground">
          Real-time liquidity analysis aggregated from multiple major cryptocurrency exchanges
        </p>
      </Card>

      {error && (
        <Card className="p-4 bg-red-900/20 border-red-500">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {heatmap && (
        <>
          {/* Current Price Card */}
          <Card className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-white/80">Symbol</div>
                <div className="text-2xl font-bold">{heatmap.symbol}</div>
              </div>
              <div>
                <div className="text-sm text-white/80">Current Price</div>
                <div className="text-2xl font-bold">${heatmap.currentPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-white/80">Exchanges</div>
                <div className="text-2xl font-bold">{heatmap.exchanges?.length || 0}</div>
              </div>
              <div>
                <div className="text-sm text-white/80">Last Update</div>
                <div className="text-lg font-bold">
                  {new Date(heatmap.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </Card>

          {/* Liquidity Clusters */}
          {heatmap.clusters && heatmap.clusters.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4">Major Liquidity Clusters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {heatmap.clusters.map((cluster, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      cluster.type === 'support'
                        ? 'bg-green-900/20 border-green-500'
                        : 'bg-red-900/20 border-red-500'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {cluster.type === 'support' ? '🟢 Support' : '🔴 Resistance'}
                        </div>
                        <div className="text-2xl font-bold">${cluster.price.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Strength</div>
                        <div className={`text-xl font-bold ${cluster.type === 'support' ? 'text-green-600' : 'text-red-600'}`}>
                          {cluster.strength.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-sm text-muted-foreground">Total Volume</div>
                      <div className="font-bold">{cluster.volume.toFixed(2)} BTC</div>
                    </div>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${cluster.type === 'support' ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${cluster.strength}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Detailed Levels */}
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Liquidity Levels</h3>
            <div className="space-y-2">
              {/* Asks (Resistance) */}
              <div>
                <h4 className="text-sm font-bold text-red-600 mb-2">ASK SIDE (Resistance)</h4>
                {heatmap.levels
                  .filter((level) => level.type === 'ask')
                  .slice(0, 10)
                  .map((level, idx) => (
                    <div
                      key={`ask-${idx}`}
                      className="flex items-center gap-2 mb-1 p-2 rounded hover:bg-red-900/10"
                    >
                      <div className="w-20 text-right font-mono text-sm">
                        ${level.price.toFixed(2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${getStrengthColor(level.strength)} flex items-center px-2 text-white text-xs font-bold`}
                              style={{ width: `${level.strength}%` }}
                            >
                              {level.totalVolume.toFixed(2)} BTC
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground w-24">
                            {getStrengthText(level.strength)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Current Price Divider */}
              <div className="py-3 my-3 border-y-2 border-neon-purple bg-purple-900/20">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">CURRENT PRICE</div>
                  <div className="text-2xl font-bold text-neon-purple">
                    ${heatmap.currentPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Bids (Support) */}
              <div>
                <h4 className="text-sm font-bold text-green-600 mb-2">BID SIDE (Support)</h4>
                {heatmap.levels
                  .filter((level) => level.type === 'bid')
                  .slice(0, 10)
                  .map((level, idx) => (
                    <div
                      key={`bid-${idx}`}
                      className="flex items-center gap-2 mb-1 p-2 rounded hover:bg-green-900/10"
                    >
                      <div className="w-20 text-right font-mono text-sm">
                        ${level.price.toFixed(2)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                            <div
                              className={`h-full ${getStrengthColor(level.strength)} flex items-center px-2 text-white text-xs font-bold`}
                              style={{ width: `${level.strength}%` }}
                            >
                              {level.totalVolume.toFixed(2)} BTC
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground w-24">
                            {getStrengthText(level.strength)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {/* Exchange Breakdown */}
          <Card className="p-6 bg-indigo-900/20 border-neon-blue/30">
            <h3 className="text-lg font-bold text-neon-blue mb-2">📊 How to Use Liquidity Data</h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li>• <strong>Strong Support:</strong> High bid volume indicates strong buying interest at that level</li>
              <li>• <strong>Strong Resistance:</strong> High ask volume shows significant selling pressure</li>
              <li>• <strong>Liquidity Clusters:</strong> Large accumulations of orders often act as price magnets</li>
              <li>• <strong>Thin Zones:</strong> Areas with low liquidity are more likely to see rapid price movements</li>
              <li>• <strong>Strategy:</strong> Use liquidity clusters for entry/exit levels and stop-loss placement</li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
