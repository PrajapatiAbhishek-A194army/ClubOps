import React from 'react';

export default function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
  helperText,
  disabled = false,
  className = '',
  id,
  ...props
}) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-bold text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3.5 py-2 text-xs bg-slate-50/50 hover:bg-slate-100/40 focus:bg-white border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
          error
            ? 'border-rose-300 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
            : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
}
