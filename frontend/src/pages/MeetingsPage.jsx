import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  CheckSquare,
  Clock,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClubMeetings, createMeeting, convertActionItems } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Textarea, Input } from '../components/ui/Input';

export default function MeetingsPage() {
  const { activeClub, activeRole } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [converting, setConverting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const isManagement = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  const fetchMeetings = async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getClubMeetings(activeClub.id);
      if (res.success) {
        setMeetings(res.data || []);
        if (res.data?.length > 0 && !selectedMeeting) {
          setSelectedMeeting(res.data[0]);
        }
      }
    } catch (err) {
      setError('Failed to load meeting records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, [activeClub?.id]);

  const handleProcessTranscript = async (e) => {
    e.preventDefault();
    if (!transcript.trim()) return;

    setProcessing(true);
    setError(null);
    try {
      const res = await createMeeting(activeClub.id, {
        title: title.trim() || `Standup Notes (${new Date().toLocaleDateString()})`,
        transcript_text: transcript.trim(),
      });
      if (res.success) {
        setTitle('');
        setTranscript('');
        setSelectedMeeting(res.data);
        setSuccessMsg(`Extracted ${res.data.action_items?.length || 0} action items!`);
        fetchMeetings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extract meeting action items.');
    } finally {
      setProcessing(false);
    }
  };

  const handleConvertItems = async () => {
    if (!selectedMeeting) return;
    const unconverted = (selectedMeeting.action_items || []).filter(
      (it) => it.status !== 'CONVERTED'
    );
    if (unconverted.length === 0) return;

    setConverting(true);
    try {
      const ids = unconverted.map((it) => it.id);
      const res = await convertActionItems(selectedMeeting.id, ids);
      if (res.success) {
        setSuccessMsg(`Successfully converted ${res.data.converted_task_count} items to Kanban tasks!`);
        fetchMeetings();
      }
    } catch (err) {
      setError('Failed to convert action items to tasks.');
    } finally {
      setConverting(false);
    }
  };

  const sampleTranscript = () => {
    setTitle('Core Committee Sync #2');
    setTranscript(
      "Rahul will prepare the Power BI dataset by Friday.\n" +
      "Priya will confirm the venue tomorrow.\n" +
      "Arjun will prepare social media creatives by Thursday."
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              AI Intelligence
            </span>
            <span className="text-xs text-slate-500">Autonomous Extraction Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Meeting Intelligence & Action Item Parser
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Paste raw standup notes or audio transcripts. AI resolves owners, deadlines, and generates 1-click Kanban deliverables.
          </p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transcript Intake */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Process New Meeting Notes
                </span>
                <button
                  onClick={sampleTranscript}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline"
                >
                  Load Demo Notes
                </button>
              </div>

              <form onSubmit={handleProcessTranscript} className="space-y-4">
                <Input
                  label="Meeting Title"
                  placeholder="e.g. Power BI Workshop Standup #1"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Transcript / Raw Standup Notes
                  </label>
                  <Textarea
                    rows={6}
                    placeholder="Paste conversational notes or minutes. Example:
Rahul will prepare the Power BI dataset by Friday.
Priya will confirm the venue tomorrow.
Arjun will prepare social media creatives by Thursday."
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-slate-400">
                    AI automatically extracts owners, relative dates, and confidence scores.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  disabled={processing || !transcript.trim()}
                  leftIcon={processing ? Loader2 : Sparkles}
                >
                  {processing ? 'Extracting Action Deliverables...' : 'Extract Action Items with AI'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Past Meetings List */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Previous Meetings ({meetings.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {meetings.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMeeting(m)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedMeeting?.id === m.id
                      ? 'bg-emerald-50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 truncate">{m.title}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(m.meeting_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                    <span>{m.action_items?.length || 0} action items</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">
                      {(m.action_items || []).filter((i) => i.status === 'CONVERTED').length} in Kanban
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Parsed Action Items */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200 shadow-sm h-full flex flex-col">
            <CardContent className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h2 className="font-bold text-sm text-slate-900">
                    {selectedMeeting ? selectedMeeting.title : 'Select a Meeting'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedMeeting?.action_items?.length || 0} Extracted Deliverables
                  </p>
                </div>

                {isManagement && selectedMeeting && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleConvertItems}
                    disabled={converting || (selectedMeeting.action_items || []).every((it) => it.status === 'CONVERTED')}
                    leftIcon={converting ? Loader2 : CheckSquare}
                  >
                    {converting ? 'Converting...' : 'Convert to Tasks'}
                  </Button>
                )}
              </div>

              {/* Items Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {selectedMeeting && selectedMeeting.action_items?.length > 0 ? (
                  selectedMeeting.action_items.map((it) => (
                    <div
                      key={it.id}
                      className={`p-4 rounded-xl border transition-all ${
                        it.status === 'CONVERTED'
                          ? 'bg-slate-50 border-slate-200 opacity-80'
                          : 'bg-white border-emerald-200 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{it.title}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                it.status === 'CONVERTED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {it.status}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              {Math.round(it.confidence_score * 100)}% Confidence
                            </span>
                          </div>

                          {it.description && (
                            <p className="text-xs text-slate-600">{it.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Owner: <strong className="text-slate-800">{it.suggested_owner || 'Unassigned'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Due: <strong className="text-slate-800">{it.suggested_deadline ? new Date(it.suggested_deadline).toLocaleDateString() : 'TBD'}</strong></span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                    <FileText className="w-8 h-8 text-slate-300 mb-2" />
                    <span>No action items in this meeting. Process notes on the left to extract deliverables!</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
