import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="text-center max-w-6xl">
        {/* Hero Section */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6 neon-text-cyan tracking-wider">
          FLAXU
        </h1>
        <p className="text-2xl md:text-3xl text-foreground mb-4 font-semibold">
          Ultimate Crypto Super App & Trading Terminal
        </p>
        <p className="text-lg text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          Professional-grade trading platform with multi-exchange integration, advanced ICT price action analysis,
          real-time market intelligence, and automated trading capabilities.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center mb-16">
          <Link
            href="/login"
            className="px-10 py-4 bg-neon-cyan text-background rounded-lg hover:shadow-[0_0_20px_rgba(0,212,255,0.6)] transition-all font-bold text-lg neon-glow-cyan"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-10 py-4 bg-neon-magenta text-foreground rounded-lg hover:shadow-[0_0_20px_rgba(192,38,211,0.6)] transition-all font-bold text-lg neon-glow-magenta"
          >
            Get Started
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="p-6 bg-card/50 rounded-lg border border-neon-cyan/30 hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all backdrop-blur-sm">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-semibold text-neon-cyan mb-2">ICT & PA Bot</h3>
            <p className="text-muted-foreground text-sm">Fair Value Gaps, Order Blocks, Liquidity Zones with 75%+ confidence signals</p>
          </div>

          <div className="p-6 bg-card/50 rounded-lg border border-neon-magenta/30 hover:border-neon-magenta hover:shadow-[0_0_15px_rgba(192,38,211,0.3)] transition-all backdrop-blur-sm">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-xl font-semibold text-neon-magenta mb-2">Sniper Scalp</h3>
            <p className="text-muted-foreground text-sm">Pump/dump detection, liquidation cascades, and extreme volatility opportunities</p>
          </div>

          <div className="p-6 bg-card/50 rounded-lg border border-neon-purple/30 hover:border-neon-purple hover:shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all backdrop-blur-sm">
            <div className="text-4xl mb-3">💱</div>
            <h3 className="text-xl font-semibold text-neon-purple mb-2">Arbitrage Scanner</h3>
            <p className="text-muted-foreground text-sm">Cross-exchange opportunities across Binance, Bybit, OKX, Gate.io, KuCoin</p>
          </div>

          <div className="p-6 bg-card/50 rounded-lg border border-neon-cyan/30 hover:border-neon-cyan hover:shadow-[0_0_15px_rgba(0,212,255,0.3)] transition-all backdrop-blur-sm">
            <div className="text-4xl mb-3">💧</div>
            <h3 className="text-xl font-semibold text-neon-cyan mb-2">Liquidity Heatmap</h3>
            <p className="text-muted-foreground text-sm">Real-time order book aggregation and liquidity cluster detection</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          <div className="p-4 bg-card/30 rounded-lg border border-border">
            <div className="text-3xl font-bold text-neon-cyan">5</div>
            <div className="text-sm text-muted-foreground">Exchanges</div>
          </div>
          <div className="p-4 bg-card/30 rounded-lg border border-border">
            <div className="text-3xl font-bold text-neon-magenta">4</div>
            <div className="text-sm text-muted-foreground">Trading Bots</div>
          </div>
          <div className="p-4 bg-card/30 rounded-lg border border-border">
            <div className="text-3xl font-bold text-neon-purple">24/7</div>
            <div className="text-sm text-muted-foreground">Monitoring</div>
          </div>
          <div className="p-4 bg-card/30 rounded-lg border border-border">
            <div className="text-3xl font-bold text-neon-cyan">Real-time</div>
            <div className="text-sm text-muted-foreground">Data Feed</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-block px-6 py-3 bg-neon-green/10 border border-neon-green/50 rounded-full">
          <p className="text-neon-green font-semibold">🚀 Platform Live & Ready</p>
        </div>
      </div>
    </main>
  );
}
