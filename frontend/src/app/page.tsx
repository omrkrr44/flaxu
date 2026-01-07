import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          FLAXU
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          Ultimate Crypto Super App & Trading Terminal
        </p>
        <p className="text-lg text-gray-400 mb-12 max-w-2xl">
          Professional-grade trading platform with BingX integration, advanced market analytics,
          and automated trading capabilities.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium"
          >
            Get Started
          </Link>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">🤖 Automated Trading</h3>
            <p className="text-gray-400 text-sm">ICT & PA bots with 75%+ confidence signals</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">⚡ Sniper Scalp</h3>
            <p className="text-gray-400 text-sm">Catch extreme volatility opportunities</p>
          </div>
          <div className="p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-2">📊 Market Intel</h3>
            <p className="text-gray-400 text-sm">Real-time arbitrage, liquidations, funding rates</p>
          </div>
        </div>
        <div className="mt-12 text-gray-500 text-sm">
          <p>🚀 Phase 1: Foundation & Authentication Complete</p>
        </div>
      </div>
    </main>
  );
}
