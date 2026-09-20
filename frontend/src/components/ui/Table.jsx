import React from 'react';

export function Table({ children, className = '', ...props }) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-2xs scrollbar-thin">
      <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <thead className={`bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableRow({ children, className = '', hover = true, ...props }) {
  return (
    <tr
      className={`border-b border-slate-100 last:border-0 transition-colors ${
        hover ? 'hover:bg-slate-50/70' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHeader({ children, className = '', ...props }) {
  return (
    <th className={`px-4 py-3 font-bold text-slate-600 ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td className={`px-4 py-3.5 text-slate-700 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export function TableEmpty({ colSpan, message = 'No records found', children, className = '' }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`px-6 py-12 text-center text-slate-400 ${className}`}>
        {children || <p className="text-xs">{message}</p>}
      </td>
    </tr>
  );
}
