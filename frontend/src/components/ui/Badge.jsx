import React from 'react';

export default function Badge({
  children,
  variant = 'emerald',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) {
  const variants = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    success: 'bg-emerald-100/70 text-emerald-900 border-emerald-300',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/80',
    error: 'bg-rose-50 text-rose-800 border-rose-200/80',
    info: 'bg-blue-50 text-blue-800 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-800 border-purple-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors = {
    emerald: 'bg-emerald-500',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
    neutral: 'bg-slate-400',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium select-none ${
        variants[variant] || variants.emerald
      } ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || dotColors.emerald} ${
            pulse ? 'animate-pulse' : ''
          }`}
        />
      )}
      {children}
    </span>
  );
}
