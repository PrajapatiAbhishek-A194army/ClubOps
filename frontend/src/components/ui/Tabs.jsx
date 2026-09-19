import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  size = 'md',
}) {
  const sizes = {
    sm: 'text-xs py-1 px-2.5',
    md: 'text-xs sm:text-sm py-1.5 px-3.5',
  };

  return (
    <div
      className={`inline-flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg font-medium transition-all duration-150 cursor-pointer select-none ${
              sizes[size] || sizes.md
            } ${
              isActive
                ? 'bg-white text-emerald-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {Icon && (
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-emerald-600' : 'text-slate-400'
                }`}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
