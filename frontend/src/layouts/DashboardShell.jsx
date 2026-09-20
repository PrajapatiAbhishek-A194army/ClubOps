import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  BookOpen,
  AlertTriangle,
  Bell,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Sparkles,
  ShieldCheck,
  Building2,
  ChevronDown,
  ArrowUpRight,
  LogOut,
  Radio,
  BarChart3,
} from 'lucide-react';

import { useHealth } from '../hooks/useHealth';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import CommandPalette from '../components/CommandPalette';
import NotificationCenter from '../components/NotificationCenter';
import UserProfileModal from '../components/UserProfileModal';
import AIWorkflowModal from '../components/AIWorkflowModal';
import { APP_NAME } from '../utils/constants';

export default function DashboardShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);

  const { health } = useHealth();
  const { user, clubs, activeClub, activeRole, switchClub, switchRole, logout, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('clubops_token');
    if (!loading && !user && !token) {
      navigate('/login');
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const handleOpenPalette = () => setPaletteOpen(true);
    window.addEventListener('open-command-palette', handleOpenPalette);
    return () => window.removeEventListener('open-command-palette', handleOpenPalette);
  }, []);

  const roles = [
    { id: 'PRESIDENT', label: 'Club President', badge: 'Admin' },
    { id: 'CLUB_HEAD', label: 'Club Head', badge: 'Lead' },
    { id: 'TEAM_LEAD', label: 'Team Lead', badge: 'Manager' },
    { id: 'VOLUNTEER', label: 'Volunteer', badge: 'Member' },
    { id: 'MEMBER', label: 'Club Member', badge: 'Student' },
  ];

  const navigationSections = [
    {
      title: 'Operations',
      items: [
        { path: '/app', label: 'Overview', icon: LayoutDashboard },
        { path: '/app/collaboration', label: 'Team Live Hub', icon: Radio, badge: 'Live' },
        { path: '/app/events', label: 'Events', icon: Calendar, badge: 'Active' },
        { path: '/app/tasks', label: 'Kanban Tasks', icon: CheckSquare },
        { path: '/app/members', label: 'Club Roster', icon: Users, badge: 'Members' },
        { path: '/app/volunteers', label: 'Volunteer Pool', icon: Users },
      ],
    },

    {
      title: 'AI Intelligence',
      items: [
        { path: '/app/meetings', label: 'Meeting Intelligence', icon: FileText, ai: true },
        { path: '/app/knowledge', label: 'Knowledge Base (RAG)', icon: BookOpen },
        { path: '/app/risks', label: 'Risk & Deadlines Radar', icon: AlertTriangle, badge: '2 Alerts', alert: true },
        { path: '/app/announcements', label: 'Announcements', icon: Bell },
        { path: '/app/analytics', label: 'Operations Analytics', icon: BarChart3, badge: 'Insights' },
      ],
    },

    {
      title: 'Governance',
      items: [
        { path: '/app/audit', label: 'Audit Trail', icon: History },
        { path: '/app/settings', label: 'Club Settings', icon: Settings },
      ],
    },
  ];


  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Command Palette */}
      <CommandPalette isOpen={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 z-40 h-screen bg-white border-r border-slate-200/90 flex flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-20' : 'lg:w-64'
        } ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div className={`h-16 border-b border-slate-100 flex items-center shrink-0 relative transition-all ${
          collapsed ? 'justify-center px-2' : 'justify-between px-4'
        }`}>
          <Link to="/app" className="flex items-center gap-2.5">
            <div 
              className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center shadow-sm shadow-emerald-600/20 shrink-0 hover:scale-105 transition-transform"
              title={APP_NAME}
            >
              CO
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 leading-tight">
                  {APP_NAME}
                </span>
                <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                  Enterprise v1.0
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`hidden lg:flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer ${
              collapsed
                ? 'absolute -right-3 top-5 w-6 h-6 bg-white border border-slate-200 shadow-xs rounded-full z-50 text-slate-600 hover:scale-110'
                : 'p-1.5'
            }`}
            aria-label="Toggle Sidebar"
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Club Switcher */}
        {!collapsed && (
          <div className="p-3 border-b border-slate-100 relative">
            <button
              onClick={() => setClubMenuOpen(!clubMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {activeClub?.name || 'My Campus Club'}
                  </div>
                  <div className="text-[10px] text-slate-500">Active Organization</div>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Club Dropdown */}
            {clubMenuOpen && (
              <div className="absolute left-3 right-3 top-16 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1.5 space-y-0.5">
                {clubs.length > 0 ? (
                  clubs.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        switchClub(c);
                        setClubMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                        activeClub?.id === c.id
                          ? 'bg-emerald-50 text-emerald-900 font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="truncate font-semibold">{c.name}</div>
                      <div className="text-[10px] text-slate-400">Role: {c.user_role}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-2 text-[11px] text-slate-500 text-center">
                    No other clubs joined.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-6">
          {navigationSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-xs shadow-emerald-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600'
                      }`}
                    />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && item.ai && (
                      <Sparkles className={`w-3 h-3 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`} />
                    )}
                    {!collapsed && item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                          item.alert
                            ? isActive ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                            : isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer with Role Switcher */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          {!collapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Role Perspective</span>
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                >
                  Switch
                </button>
              </div>

              {roleMenuOpen ? (
                <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-md space-y-1">
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRole(r.id);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg cursor-pointer ${
                        activeRole === r.id
                          ? 'bg-emerald-50 text-emerald-900 font-bold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span>{r.label}</span>
                      <span className="text-[10px] text-slate-400">{r.badge}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-semibold text-slate-800">
                      {roles.find((r) => r.id === activeRole)?.label}
                    </span>
                  </div>
                  <Badge variant="emerald" size="sm">
                    {roles.find((r) => r.id === activeRole)?.badge}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setProfileModalOpen(true)}
                className="w-8 h-8 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs cursor-pointer transition-colors"
                title="View & Edit Profile"
              >
                {activeRole ? activeRole[0] : 'U'}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-xs text-slate-500 transition-colors cursor-pointer w-64 md:w-80"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="flex-1 text-left truncate">Search events, tasks, or actions...</span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
                Ctrl K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* AI Operations Copilot Trigger */}
            <button
              onClick={() => setWorkflowModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 text-xs font-bold transition-all shadow-2xs hover:scale-102 cursor-pointer"
              title="Autonomous AI Operations Copilot (LangGraph State Machine)"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {/* User Profile avatar & logout */}
            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="w-8 h-8 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center cursor-pointer transition-transform hover:scale-105 shadow-2xs"
                  title="View & Edit Profile"
                >
                  {user.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'CO'}
                </button>
                <div 
                  onClick={() => setProfileModalOpen(true)}
                  className="hidden xl:block text-left cursor-pointer hover:opacity-80 transition-opacity"
                  title="View & Edit Profile"
                >
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize">
                    {activeRole.replace('_', ' ').toLowerCase()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Viewport content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* User Profile Settings Modal */}
      <UserProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />

      {/* Autonomous AI Operations Copilot Modal (LangGraph) */}
      <AIWorkflowModal
        isOpen={workflowModalOpen}
        onClose={() => setWorkflowModalOpen(false)}
      />
    </div>
  );
}
