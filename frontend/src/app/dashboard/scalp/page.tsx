'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ScalpSniperPage() {
    const [isActive, setIsActive] = useState(false);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Scalp Sniper 🎯</h2>
                    <p className="text-gray-400">Automated pump/dump detection and rapid execution</p>
                </div>
                <Button
                    onClick={() => setIsActive(!isActive)}
                    variant={isActive ? "destructive" : "default"}
                    className={isActive ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
                >
                    {isActive ? 'STOP SNIPER' : 'ACTIVATE SNIPER'}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Live Status */}
                <Card className="border-indigo-500/30 bg-indigo-500/5">
                    <CardHeader>
                        <CardTitle>Sniper Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                            <span className="text-xl font-bold text-white">{isActive ? 'SCANNING MARKETS...' : 'IDLE'}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Volatility Threshold</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">5% / 1m</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Active Pairs Scanned</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-white">24</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Detected Opportunities</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-10 text-gray-500">
                        {isActive ? (
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
                                <p>Scanning for opportunities...</p>
                            </div>
                        ) : (
                            <p>Activate the sniper to start scanning.</p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
