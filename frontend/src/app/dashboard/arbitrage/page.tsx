'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface ArbitrageOpp {
    symbol: string;
    buyExchange: string;
    sellExchange: string;
    spread: string;
    potentialProfit: string;
}

export default function ArbitragePage() {
    const [opportunities, setOpportunities] = useState<ArbitrageOpp[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app, use SWR or React Query
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:3001/api/market/arbitrage', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data?.data?.opportunities) {
                    setOpportunities(res.data.data.opportunities);
                }
            } catch (err) {
                console.error('Failed to fetch arbitrage data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Refresh every 15s
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Arbitrage Scanner</h1>
                <div className="text-sm text-muted-foreground">
                    Auto-refreshing every 15s
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {opportunities.map((opp, idx) => (
                    <div key={idx} className="rounded-xl border bg-card text-card-foreground shadow">
                        <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                            <h3 className="tracking-tight text-sm font-medium">{opp.symbol} Opportunity</h3>
                            <span className="text-2xl font-bold text-green-500">{opp.potentialProfit}</span>
                        </div>
                        <div className="p-6 pt-0">
                            <div className="mt-4 flex justify-between items-center">
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Buy From</p>
                                    <p className="text-lg font-bold">{opp.buyExchange}</p>
                                </div>
                                <div className="text-2xl text-muted-foreground">→</div>
                                <div className="text-center">
                                    <p className="text-xs text-muted-foreground">Sell At</p>
                                    <p className="text-lg font-bold">{opp.sellExchange}</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-4">
                                Estimated spread: {opp.spread}%
                            </p>
                        </div>
                    </div>
                ))}

                {!loading && opportunities.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        No arbitrage opportunities found &gt; 0.5% at the moment.
                    </div>
                )}
            </div>
        </div>
    );
}
