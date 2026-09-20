import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CalendarPlus, 
  FileText, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  Sparkles,
  Command,
  Radio,
  CheckSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { user, activeRole } = useAuth();

  const isLeadership =
    user?.is_superuser ||
    user?.email === 'president@clubops.ai' ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole) ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(user?.active_role) ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(user?.role);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open via custom event or external state
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'team-live',
      title: 'Team Live Hub & War Room',
      category: 'Operations',
      icon: Radio,
      shortcut: 'H',
      action: () => {
        navigate('/app/collaboration');
        onClose();
      },
    },
    {
      id: 'my-tasks',
      title: 'View Kanban Tasks',
      category: 'Tasks',
      icon: CheckSquare,
      shortcut: 'T',
      action: () => {
        navigate('/app/tasks');
        onClose();
      },
    },
    ...(isLeadership ? [
      {
        id: 'create-event',
        title: 'Create New Event',
        category: 'Events',
        icon: CalendarPlus,
        shortcut: 'C',
        action: () => {
          navigate('/app/events');
          onClose();
        },
      },
      {
        id: 'ai-plan',
        title: 'AI Event Planner (Prompt: "Organize Hackathon")',
        category: 'AI Workflows',
        icon: Sparkles,
        shortcut: 'P',
        action: () => {
          navigate('/app/events');
          onClose();
        },
      },
      {
        id: 'process-meeting',
        title: 'Process Meeting Minutes & Extract Tasks',
        category: 'Intelligence',
        icon: FileText,
        shortcut: 'M',
        action: () => {
          navigate('/app/meetings');
          onClose();
        },
      },
      {
        id: 'risk-scan',
        title: 'Run Real-time Risk & Dependency Radar',
        category: 'Risks',
        icon: AlertTriangle,
        shortcut: 'R',
        action: () => {
          navigate('/app/risks');
          onClose();
        },
      },
      {
        id: 'volunteer-match',
        title: 'Find Volunteers by Skills & Availability',
        category: 'Volunteers',
        icon: Users,
        shortcut: 'V',
        action: () => {
          navigate('/app/volunteers');
          onClose();
        },
      },
    ] : []),
  ];

  const filtered = actions.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Palette Container */}
      <div className="relative bg-white w-full max-w-xl rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-100">
        <div className="p-3 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 pl-1" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-none focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded-md">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-50">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              No matching commands found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50 text-left text-slate-700 hover:text-emerald-900 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-900 group-hover:text-emerald-950">
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {item.category}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Command className="w-3 h-3 text-slate-400" /> Navigate actions
          </span>
          <span>Press <strong>ESC</strong> to close</span>
        </div>
      </div>
    </div>
  );
}
