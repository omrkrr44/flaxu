'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await apiClient.getProfile();
                setProfile(data.data);
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadProfile();
    }, []);

    if (isLoading) {
        return <div className="text-white">Loading profile...</div>;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-white">User Profile</h2>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Account Information</CardTitle>
                        <CardDescription>Your personal account details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Email</label>
                            <Input value={profile?.email || user?.email} disabled className="bg-gray-800 border-gray-700 text-white" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">Access Level</label>
                            <div className="p-2 bg-gray-800 rounded border border-gray-700 text-white">
                                {profile?.accessLevel || user?.accessLevel}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">User ID</label>
                            <Input value={profile?.id || user?.id} disabled className="bg-gray-800 border-gray-700 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Trading Stats</CardTitle>
                        <CardDescription>Performance overview</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-400">Total Profit</p>
                                <p className="text-2xl font-bold text-green-400">$0.00</p>
                            </div>
                            <div className="p-4 bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-400">Win Rate</p>
                                <p className="text-2xl font-bold text-blue-400">0%</p>
                            </div>
                        </div>
                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-500 text-sm">
                            NOTE: Trading statistics will appear here once you start executing trades with the bot.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
