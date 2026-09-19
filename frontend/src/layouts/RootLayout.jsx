import React from 'react';
import Navbar from '../components/Navbar';
import { useHealth } from '../hooks/useHealth';

export default function RootLayout({ children }) {
  const { health, loading, error, refetch } = useHealth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar health={health} loading={loading} error={error} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {React.cloneElement(children, { health, loading, error, refetch })}
      </main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© 2026 ClubOps AI • Centralized Campus Event Operations Platform</p>
          <p className="text-emerald-700 font-medium">Empowering Student Leaders & Campus Organizations</p>
        </div>
      </footer>

    </div>
  );
}
