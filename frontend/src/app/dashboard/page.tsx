'use client';

import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back! 👋</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your trading account
        </p>
      </div>

      {user?.accessLevel !== 'FULL' && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-yellow-500">⚠️ Limited Access</CardTitle>
            <CardDescription>
              Connect your BingX API keys to unlock full features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/api-keys">
              <Button>Connect BingX Account</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Access Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${user?.accessLevel === 'FULL' ? 'text-green-500' : 'text-yellow-500'
              }`}>
              {user?.accessLevel}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {user?.accessLevel === 'FULL'
                ? 'All features unlocked'
                : 'Connect API to upgrade'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Trades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              No active positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total P&L
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time performance
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🤖 Trading Bots</CardTitle>
            <CardDescription>Automated trading with ICT & PA signals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">ICT & PA Bot</p>
                  <p className="text-xs text-muted-foreground">75%+ confidence signals</p>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">Inactive</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Sniper Scalp</p>
                  <p className="text-xs text-muted-foreground">Volatility hunter</p>
                </div>
                <span className="text-xs px-2 py-1 bg-gray-700 rounded">Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Market Intelligence</CardTitle>
            <CardDescription>Real-time market data and analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/dashboard/market" className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition">
                <p className="font-medium">Arbitrage Scanner</p>
                <p className="text-xs text-muted-foreground">Cross-exchange opportunities</p>
              </Link>
              <Link href="/dashboard/market" className="block p-3 bg-muted rounded-lg hover:bg-muted/80 transition">
                <p className="font-medium">Liquidation Heatmap</p>
                <p className="text-xs text-muted-foreground">Real-time liquidations</p>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
