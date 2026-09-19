import React from 'react';
import { Sparkles, ArrowRight, Construction, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export default function PlaceholderFeature({ title, phase, description, capabilities = [] }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="emerald" size="md">
            {phase} Planned Module
          </Badge>
          <Badge variant="neutral" size="sm">
            Architecture Ready
          </Badge>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Engineered Capabilities for this Phase:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            {capabilities.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app')}
          >
            ← Return to Dashboard Overview
          </Button>
        </div>
      </div>
    </div>
  );
}
