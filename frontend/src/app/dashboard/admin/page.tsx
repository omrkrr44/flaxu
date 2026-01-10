'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface AnalyticsOverview {
  users: {
    total: number;
    verified: number;
    active: number;
    suspended: number;
  };
  trades: {
    total: number;
    open: number;
    closed: number;
    totalVolume: number;
  };
  profitLoss: {
    totalPnL: number;
    avgPnL: number;
  };
}

interface User {
  id: string;
  email: string;
  accessLevel: string;
  isVerified: boolean;
  walletBalance: number | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [analyticsRes, usersRes] = await Promise.all([
        apiClient.get('/api/admin/analytics/overview'),
        apiClient.get('/api/admin/users?limit=10'),
      ]);

      // Backend returns { success: true, data: {...} }
      const analyticsData = analyticsRes.data?.success ? analyticsRes.data.data : analyticsRes.data;
      const usersData = usersRes.data?.success ? usersRes.data.data : usersRes.data;

      setAnalytics(analyticsData);
      setUsers(usersData.users || usersData);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError('Failed to load admin data');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateAccessLevel = async (userId: string, newLevel: string) => {
    try {
      await apiClient.put(`/api/admin/users/${userId}/access-level`, {
        accessLevel: newLevel,
        reason: `Updated by admin via dashboard`,
      });

      // Reload users
      const usersRes = await apiClient.get('/api/admin/users?limit=10');
      const usersData = usersRes.data?.success ? usersRes.data.data : usersRes.data;
      setUsers(usersData.users || usersData);
    } catch (err) {
      alert('Failed to update access level');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-xl">Loading admin panel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-600 text-xl">{error}</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🛡️ Admin Panel</h1>
        <Button onClick={loadData}>🔄 Refresh</Button>
      </div>

      {analytics && (
        <>
          <div>
            <h2 className="text-xl font-semibold mb-3">User Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-gray-600 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.users.total}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Verified</p>
                <p className="text-3xl font-bold text-green-600">{analytics.users.verified}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Active (FULL)</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.users.active}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Suspended</p>
                <p className="text-3xl font-bold text-red-600">{analytics.users.suspended}</p>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Trading Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <p className="text-gray-600 text-sm">Total Trades</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.trades.total}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Open Positions</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.trades.open}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Closed Trades</p>
                <p className="text-3xl font-bold text-green-600">{analytics.trades.closed}</p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Total Volume</p>
                <p className="text-3xl font-bold text-purple-600">
                  ${Number(analytics.trades.totalVolume).toLocaleString()}
                </p>
              </Card>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">P&L Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <p className="text-gray-600 text-sm">Total P&L</p>
                <p className={`text-3xl font-bold ${
                  Number(analytics.profitLoss.totalPnL) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Number(analytics.profitLoss.totalPnL).toFixed(2)}
                </p>
              </Card>

              <Card className="p-4">
                <p className="text-gray-600 text-sm">Average P&L per Trade</p>
                <p className={`text-3xl font-bold ${
                  Number(analytics.profitLoss.avgPnL) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${Number(analytics.profitLoss.avgPnL).toFixed(2)}
                </p>
              </Card>
            </div>
          </div>
        </>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Users</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="pb-2">Email</th>
                <th className="pb-2">Access Level</th>
                <th className="pb-2">Verified</th>
                <th className="pb-2">Balance</th>
                <th className="pb-2">Created</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="py-3">{user.email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.accessLevel === 'FULL' ? 'bg-green-100 text-green-800' :
                      user.accessLevel === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                      user.accessLevel === 'SUSPENDED' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {user.accessLevel}
                    </span>
                  </td>
                  <td className="py-3">
                    {user.isVerified ? '✅' : '❌'}
                  </td>
                  <td className="py-3">
                    ${user.walletBalance ? Number(user.walletBalance).toFixed(2) : '0.00'}
                  </td>
                  <td className="py-3">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <select
                      value={user.accessLevel}
                      onChange={(e) => updateAccessLevel(user.id, e.target.value)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      <option value="LIMITED">LIMITED</option>
                      <option value="FULL">FULL</option>
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
