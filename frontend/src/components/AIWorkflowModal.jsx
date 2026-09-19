import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Play,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  CheckSquare,
  AlertCircle,
  Code2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { executeAIWorkflow } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AIWorkflowModal({ isOpen, onClose }) {
  const { activeClub } = useAuth();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState('');
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [showAudit, setShowAudit] = useState(false);

  const quickPrompts = [
    'Rahul Sharma handles projector setup and audio checks before Friday for HackOut.',
    'Priya Patel reserves seminar hall and coordinates refreshment tokens before next Tuesday.',
    'Order 50 volunteer t-shirts and arrange attendee kit distribution before Thursday.',
  ];

  const handleExecute = async (overridePrompt) => {
    const textToRun = overridePrompt || prompt;
    if (!textToRun.trim() || !activeClub?.id) return;

    try {
      setExecuting(true);
      setError(null);
      setResult(null);

      const res = await executeAIWorkflow(activeClub.id, {
        prompt: textToRun.trim(),
      });

      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.message || 'Workflow execution completed with warnings.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to execute AI workflow.');
    } finally {
      setExecuting(false);
    }
  };

  const stages = [
    { key: 'NEW', label: 'Directive' },
    { key: 'AI_PROCESSED', label: 'AI Planning' },
    { key: 'TASKS_CREATED', label: 'Tasks Created' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'COMPLETED', label: 'Completed' },
  ];

  const currentStageIndex = result
    ? stages.findIndex((s) => s.key === result.current_stage)
    : executing
    ? 1
    : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="AI Operations Copilot"
      description="LangGraph state machine executing secure backend tool calls with zero direct SQL access"
    >
      <div className="space-y-5">
        {/* Architecture Badge */}
        <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3.5 py-2 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-medium">
            <Cpu className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>LangGraph ReAct Engine &bull; Groq Llama 3.3 70B &bull; Allowlisted Tools</span>
          </div>
          <Badge variant="emerald" size="sm">
            Autonomous Actions
          </Badge>
        </div>

        {/* Prompt Input Form */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Operational Directive or Meeting Excerpt
          </label>
          <textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Rahul Sharma handles projector setup and attendee badges before Friday for HackOut..."
            className="w-full text-sm rounded-xl border border-slate-300 p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />

          {/* Quick Prompts */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Presets:</span>
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(p);
                  handleExecute(p);
                }}
                disabled={executing}
                className="text-[11px] bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-all cursor-pointer truncate max-w-[280px]"
                title={p}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Execution Button */}
        <div className="flex items-center justify-between pt-1">
          {(result || prompt) ? (
            <button
              type="button"
              onClick={() => {
                setPrompt('');
                setResult(null);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors cursor-pointer"
            >
              Clear & New Directive
            </button>
          ) : <div />}

          <Button
            variant="primary"
            leftIcon={Sparkles}
            loading={executing}
            disabled={!prompt.trim()}
            onClick={() => handleExecute()}
            className="w-full sm:w-auto shadow-sm"
          >
            {executing ? 'Executing Autonomous Workflow...' : 'Execute Operations Workflow'}
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LangGraph Visual State Machine Stepper */}
        {(executing || result) && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                LangGraph State Machine
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                Stage: {result?.current_stage || (executing ? 'PROCESSING' : 'NEW')}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1 text-center">
              {stages.map((st, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = currentStageIndex === idx;
                return (
                  <div key={st.key} className="flex flex-col items-center space-y-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : isCurrent
                          ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-600 animate-pulse'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 truncate max-w-full">
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Result Breakdown */}
        {result && (
          <div className="space-y-4 pt-1">
            {/* Executive Summary */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-slate-800 leading-relaxed">
              <div className="font-bold text-emerald-900 mb-2 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Workflow Executive Summary
              </div>
              <div className="space-y-1.5 text-slate-700">
                {result.final_summary?.split('\n').map((line, lIdx) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={lIdx} className="h-1" />;
                  const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ');
                  const textContent = isBullet ? trimmed.slice(2) : trimmed;

                  const parts = textContent.split(/(\*\*.*?\*\*)/g);
                  const parsed = parts.map((part, pIdx) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return (
                        <strong key={pIdx} className="font-semibold text-slate-900">
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    return part;
                  });

                  if (isBullet) {
                    return (
                      <div key={lIdx} className="flex items-start gap-2 pl-2">
                        <span className="text-emerald-600 font-bold leading-tight">&bull;</span>
                        <div className="flex-1">{parsed}</div>
                      </div>
                    );
                  }

                  return (
                    <p key={lIdx} className="leading-relaxed">
                      {parsed}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Created Tasks */}
            {result.extracted_tasks && result.extracted_tasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                    Tasks Created on Kanban Board ({result.extracted_tasks.length})
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      navigate('/app/tasks');
                    }}
                    className="text-emerald-700 hover:text-emerald-800 text-[11px] font-semibold flex items-center gap-0.5 cursor-pointer"
                  >
                    Open Kanban <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {result.extracted_tasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{t.title}</p>
                        {t.due_date && (
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" /> Due: {t.due_date}
                          </p>
                        )}
                      </div>
                      <Badge variant={t.priority === 'HIGH' ? 'danger' : 'info'} size="sm">
                        {t.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Volunteers */}
            {result.assigned_volunteers && result.assigned_volunteers.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Volunteers Mapped & Notified ({result.assigned_volunteers.length})
                </div>
                <div className="space-y-1.5">
                  {result.assigned_volunteers.map((v, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{v.assigned_to}</p>
                        <p className="text-[11px] text-slate-500">{v.volunteer_email}</p>
                      </div>
                      <Badge variant="emerald" size="sm">
                        Assigned & Notified
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expandable Audit Trail */}
            {result.audit_trail && result.audit_trail.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAudit(!showAudit)}
                  className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Immutable Backend Tool Execution Trace ({result.audit_trail.length} calls)
                  </span>
                  {showAudit ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAudit && (
                  <div className="p-3 bg-slate-900 text-slate-100 text-[11px] font-mono space-y-2 max-h-56 overflow-y-auto">
                    {result.audit_trail.map((item, idx) => (
                      <div key={idx} className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1">
                        <div className="flex items-center justify-between text-emerald-400 font-bold">
                          <span>&bull; Tool: {item.tool}()</span>
                          <span className="text-[10px] text-slate-400">{item.timestamp?.slice(11, 19)}</span>
                        </div>
                        <div className="text-slate-300">
                          Args: <span className="text-amber-300">{JSON.stringify(item.args)}</span>
                        </div>
                        <div className="text-slate-400 text-[10px] truncate">
                          Result: {item.result_summary}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
