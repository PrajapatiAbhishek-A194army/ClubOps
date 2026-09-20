import React from 'react';
import Navbar from '../components/Navbar';
import { useHealth } from '../hooks/useHealth';

export default function RootLayout({ children }) {
  const { health, loading, error, refetch } = useHealth();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar health={health} loading={loading} error={error} />
      <main className="flex-1 w-full">
        {React.isValidElement(children)
          ? React.cloneElement(children, { health, loading, error, refetch })
          : children}
      </main>
      <footer className="border-t border-slate-200 bg-white py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/clubops-logo.png" alt="ClubOps" className="h-8 w-auto object-contain" />
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="hidden sm:inline">Centralized Campus Event Operations Platform</span>
          </div>
          <p className="text-emerald-700 font-semibold">Empowering Student Leaders & Campus Organizations</p>
        </div>
      </footer>
    </div>
  );
}
