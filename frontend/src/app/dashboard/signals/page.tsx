'use client';

import React, { useState, useEffect } from 'react';

// Mock data for initial render
const MOCK_SIGNALS = [
    { id: 1, symbol: 'BTCUSDT', type: 'LONG', entry: 42500, tp: 43500, sl: 42000, confidence: 85, time: '10:30' },
    { id: 2, symbol: 'ETHUSDT', type: 'SHORT', entry: 2250, tp: 2150, sl: 2300, confidence: 78, time: '11:15' },
];

// Mock data as fallback
// const [signals, setSignals] = useState(MOCK_SIGNALS);

useEffect(() => {
    const fetchSignals = async () => {
        try {
            // In a real scenario, this would call /api/market/signals or similar
            // For now, we'll simulate a fetch that might return new signals occasionally
            // to make the dashboard feel alive.
            const newSignal = {
                id: Date.now(),
                symbol: Math.random() > 0.5 ? 'SOL/USDT' : 'AVAX/USDT',
                type: Math.random() > 0.5 ? 'LONG' : 'SHORT',
                entry: (Math.random() * 100).toFixed(2),
                tp: (Math.random() * 110).toFixed(2),
                sl: (Math.random() * 90).toFixed(2),
                confidence: Math.floor(Math.random() * 20) + 80, // 80-99%
                time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
            };

            // Add new signal occasionally
            if (Math.random() > 0.7) {
                setSignals(prev => [newSignal, ...prev].slice(0, 10)); // Keep last 10
            }
        } catch (e) {
            console.error(e);
        }
    };

    const interval = setInterval(fetchSignals, 5000);
    return () => clearInterval(interval);
}, []);

return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">AI Trading Signals (ICT & PA)</h1>

        <div className="rounded-md border bg-card text-card-foreground shadow-sm">
            <div className="p-6">
                <div className="relative w-full overflow-auto">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Time</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Symbol</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Entry</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Take Profit</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Stop Loss</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Confidence</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Action</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {signals.map((signal) => (
                                <tr key={signal.id} className="border-b transition-colors hover:bg-muted/50">
                                    <td className="p-4 align-middle">{signal.time}</td>
                                    <td className="p-4 align-middle font-bold">{signal.symbol}</td>
                                    <td className={`p-4 align-middle ${signal.type === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                                        {signal.type}
                                    </td>
                                    <td className="p-4 align-middle">${signal.entry}</td>
                                    <td className="p-4 align-middle text-green-500">${signal.tp}</td>
                                    <td className="p-4 align-middle text-red-500">${signal.sl}</td>
                                    <td className="p-4 align-middle">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{signal.confidence}%</span>
                                            <div className="h-2 w-16 rounded bg-secondary">
                                                <div
                                                    className="h-full rounded bg-primary"
                                                    style={{ width: `${signal.confidence}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle">
                                        <button className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 rounded text-xs font-semibold">
                                            Copy Trade
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
);
}
