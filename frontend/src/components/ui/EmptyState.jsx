import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'Get started by creating your first entry or adjust your filters.',
  actionLabel,
  onAction,
  actionIcon,
  className = '',
  children,
}) {
  return (
    <div className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center rounded-2xl bg-white border border-slate-200/90 shadow-2xs ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-slate-100/80 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" leftIcon={actionIcon} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}
