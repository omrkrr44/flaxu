'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from './ui/Button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'ICT Bot', href: '/dashboard/ict-bot', icon: '🎯' },
    { name: 'Sniper Scalp', href: '/dashboard/sniper', icon: '⚡' },
    { name: 'Arbitrage', href: '/dashboard/arbitrage', icon: '💱' },
    { name: 'Liquidity', href: '/dashboard/liquidity', icon: '💧' },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: '🔑' },
  ];

  // Add admin link if user is admin
  const adminNavigation = user?.accessLevel === 'ADMIN'
    ? [{ name: 'Admin Panel', href: '/dashboard/admin', icon: '🛡️' }]
    : [];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center">
                <h1 className="text-2xl font-bold neon-text-cyan tracking-wider">
                  FLAXU
                </h1>
              </Link>
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                {[...navigation, ...adminNavigation].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-all ${
                      pathname === item.href
                        ? 'text-neon-cyan border-b-2 border-neon-cyan shadow-[0_2px_10px_rgba(0,212,255,0.5)]'
                        : 'text-muted-foreground hover:text-neon-magenta hover:border-b-2 hover:border-neon-magenta/50'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-foreground">{user.email}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  user.accessLevel === 'ADMIN'
                    ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/50'
                    : user.accessLevel === 'FULL'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/50'
                    : 'bg-neon-yellow/20 text-neon-yellow border border-neon-yellow/50'
                }`}>
                  {user.accessLevel}
                </span>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
