import React from 'react';

export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
      {...props}
    />
  );
}

export function CardSkeleton({ lines = 3, className = '' }) {
  return (
    <div className={`p-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-3.5 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-20" />
      <div className="pt-2 border-t border-slate-100 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'w-full' : i === 1 ? 'w-3/4' : 'w-1/2'}`} />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-2xs ${className}`}>
      <div className="bg-slate-50/80 border-b border-slate-200/80 p-4 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3.5 flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
