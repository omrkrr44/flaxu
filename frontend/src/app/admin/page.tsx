'use client';

import React, { useEffect, useState } from 'react';

// Mock Admin Data
const MOCK_USERS = [
    { id: '1', email: 'user1@example.com', accessLevel: 'FULL', walletBalance: 2500, status: 'Active' },
    { id: '2', email: 'user2@example.com', accessLevel: 'LIMITED', walletBalance: 50, status: 'Warning' },
    { id: '3', email: 'admin@flaxu.io', accessLevel: 'FULL', walletBalance: 10000, status: 'Active' },
];

export default function AdminPage() {
    const [users, setUsers] = useState(MOCK_USERS);
    const [stats, setStats] = useState({ totalUsers: 154, activeUsers: 89, totalVolume: '$1.2M' });

    // Todo: Fetch real data from /api/admin/users and /api/admin/stats

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Admin Console</h1>
                <div className="flex gap-4">
                    <div className="bg-card px-4 py-2 rounded border">
                        <span className="text-sm text-muted-foreground block">Total Users</span>
                        <span className="text-xl font-bold">{stats.totalUsers}</span>
                    </div>
                    <div className="bg-card px-4 py-2 rounded border">
                        <span className="text-sm text-muted-foreground block">Active Users</span>
                        <span className="text-xl font-bold text-green-500">{stats.activeUsers}</span>
                    </div>
                    <div className="bg-card px-4 py-2 rounded border">
                        <span className="text-sm text-muted-foreground block">Total Volume</span>
                        <span className="text-xl font-bold text-blue-500">{stats.totalVolume}</span>
                    </div>
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">User Management</h2>
                    <div className="w-full overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b">
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Email</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Access</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Wallet Balance</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Status</th>
                                    <th className="h-12 px-4 font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id} className="border-b hover:bg-muted/50">
                                        <td className="p-4 align-middle">{user.email}</td>
                                        <td className="p-4 align-middle">
                                            <span className={`px-2 py-1 rounded-full text-xs ${user.accessLevel === 'FULL' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                {user.accessLevel}
                                            </span>
                                        </td>
                                        <td className="p-4 align-middle">${user.walletBalance}</td>
                                        <td className="p-4 align-middle">{user.status}</td>
                                        <td className="p-4 align-middle">
                                            <button className="text-blue-500 hover:underline mr-3">Edit</button>
                                            <button className="text-red-500 hover:underline">Suspend</button>
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
