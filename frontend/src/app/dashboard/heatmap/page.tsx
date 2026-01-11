'use client';

import React, { useEffect, useState } from 'react';

// Mock Heatmap Data for Visualization if API fails
const MOCK_HEATMAP = Array.from({ length: 50 }).map((_, i) => ({
    symbol: `COIN${i}`,
    value: Math.random() * 100, // Liquidation 
    change: (Math.random() * 20) - 10, // Price Change %
}));

export default function HeatmapPage() {
    const [data, setData] = useState(MOCK_HEATMAP);

    // Todo: Fetch real data from /api/market/heatmap

    const getColor = (change: number) => {
        if (change > 5) return 'bg-green-600';
        if (change > 0) return 'bg-green-500';
        if (change > -5) return 'bg-red-500';
        return 'bg-red-600';
    };

    return (
        <div className="space-y-6 h-[calc(100vh-100px)]">
            <h1 className="text-3xl font-bold tracking-tight">Liquidation Heatmap</h1>

            <div className="w-full h-full border rounded-lg overflow-hidden bg-card p-4">
                {/* Simple Treemap-like Grid */}
                <div className="flex flex-wrap h-full w-full content-start">
                    {data.map((item, idx) => (
                        <div
                            key={idx}
                            className={`${getColor(item.change)} border-white border m-0 flex-grow relative hover:opacity-80 cursor-pointer transition-all`}
                            style={{
                                width: `${Math.max(50, Math.random() * 200)}px`,
                                height: `${Math.max(50, Math.random() * 150)}px`
                            }}
                            title={`${item.symbol}: ${item.change.toFixed(2)}%`}
                        >
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                                <span className="font-bold text-sm truncate w-full text-center">{item.symbol}</span>
                                <span className="text-xs">{item.change.toFixed(2)}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
