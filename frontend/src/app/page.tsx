export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-gray-900 to-gray-800">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          FLAXU
        </h1>
        <p className="text-2xl text-gray-300 mb-8">
          Ultimate Crypto Super App & Trading Terminal
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Login
          </a>
          <a
            href="/register"
            className="px-8 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
          >
            Register
          </a>
        </div>
        <div className="mt-12 text-gray-400 text-sm">
          <p>Phase 1: Foundation & MVP - In Development</p>
        </div>
      </div>
    </main>
  );
}
