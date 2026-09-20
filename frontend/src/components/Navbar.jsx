import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, Menu, X, Sparkles } from 'lucide-react';
import { APP_NAME } from '../utils/constants';
import Button from './ui/Button';

export default function Navbar() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('clubops_token');

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <img 
            src="/clubops-logo.png" 
            alt={APP_NAME} 
            className="h-10 w-auto object-contain transition-transform group-hover:scale-102"
          />
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 hidden sm:inline">
            v1.0
          </span>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-slate-600">
          <a href="#problem" className="hover:text-emerald-700 transition-colors">
            The Challenge
          </a>
          <a href="#features" className="hover:text-emerald-700 transition-colors">
            Core Capabilities
          </a>
          <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">
            How It Works
          </a>
          <a href="#roles" className="hover:text-emerald-700 transition-colors">
            Roles
          </a>
          <a href="#security" className="hover:text-emerald-700 transition-colors">
            Governance
          </a>
        </nav>

        {/* Action Buttons: Sign In & Sign Up */}
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            leftIcon={LogIn}
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </Button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-2 shadow-lg">
          <a
            href="#problem"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            The Challenge
          </a>
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Core Capabilities
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            How It Works
          </a>
          <a
            href="#roles"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Roles & Permissions
          </a>
          <a
            href="#security"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Campus Security
          </a>
        </div>
      )}
    </header>
  );
}
