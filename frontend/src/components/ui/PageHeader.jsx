import React from 'react';
import Badge from './Badge';

export default function PageHeader({
  title,
  description,
  badge,
  badgeIcon: BadgeIcon,
  badgeVariant = 'emerald',
  breadcrumbs = [],
  actions,
  className = '',
  children,
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs ${className}`}>
      {breadcrumbs.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span>/</span>}
              {b.href ? (
                <a href={b.href} className="hover:text-slate-700 transition-colors">
                  {b.label}
                </a>
              ) : (
                <span className="text-slate-600 font-semibold">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          {badge && (
            <div className="mb-1.5">
              <Badge variant={badgeVariant} size="sm">
                {BadgeIcon && <BadgeIcon className="w-3 h-3 mr-1" />}
                {badge}
              </Badge>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-4 pt-4 border-t border-slate-100">{children}</div>}
    </div>
  );
}
