import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CheckSquare,
  Users,
  FileText,
  AlertTriangle,
  Bell,
  ShieldCheck,
  ChevronRight,
  Layers,
  Zap,
  Clock,
  BookOpen,
  Radio,
  BarChart3,
  HeartHandshake,
  MessageSquare,
  Lock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { APP_NAME } from '../utils/constants';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [activeRolePerspective, setActiveRolePerspective] = useState('PRESIDENT');
  const [activeTab, setActiveTab] = useState('overview');

  const workflowSteps = [
    {
      id: 0,
      title: '1. Create Event Plan',
      badge: 'Event Init',
      desc: 'Club leadership initializes an event with title, dates, budget limits, and expected attendees.',
      simulation: {
        input: 'Event: "HackOut 2026: 36-hour Inter-College Hackathon"',
        state: 'Event initialized with status "Active" in Coders Club.',
        highlight: 'Event dashboard, timeline milestones, and budget tracker generated automatically.',
      },
    },
    {
      id: 1,
      title: '2. Meeting Ingestion',
      badge: 'Input',
      desc: 'Paste unstructured standup notes or meeting minutes directly into the Meeting Intelligence console.',
      simulation: {
        input: '"Rahul books main auditorium before Friday. Priya finishes sponsor deck. Kabir handles mentor outreach."',
        state: 'Unstructured notes parsed into structured committee action items.',
        highlight: 'Instant NLP extraction without tedious manual copying across spreadsheets.',
      },
    },
    {
      id: 2,
      title: '3. Task Decomposition',
      badge: 'Decomposition',
      desc: 'Discussion points are automatically converted into atomic task cards tagged with milestones and skills.',
      simulation: {
        input: '3 distinct tasks generated: [Book Auditorium], [Finalize Sponsor Deck], [Contact Hackathon Judges].',
        state: 'Tasks linked to Milestones (T-14 Days, T-7 Days) with clear dependencies.',
        highlight: 'Tasks are categorized with priorities, required skills, and milestone progress tracking.',
      },
    },
    {
      id: 3,
      title: '4. Volunteer Matchmaking',
      badge: 'Assignment',
      desc: 'The roster is cross-referenced by skills and availability to intelligently assign tasks to volunteers.',
      simulation: {
        input: 'Rahul Sharma (Logistics) -> Auditorium | Priya Patel (Design) -> Deck | Kabir (Technical) -> Judges',
        state: 'Team members assigned with instant Kanban updates and direct notifications.',
        highlight: 'Volunteers receive immediate duty visibility on their personal mobile dash.',
      },
    },
    {
      id: 4,
      title: '5. Proactive Risk Radar',
      badge: 'Risk Radar',
      desc: 'Continuously monitors deadlines, blocked task chains, and volunteer shortages in real-time.',
      simulation: {
        input: 'ALERT: "Main Auditorium booking is blocked — deadline in 36 hours."',
        state: 'Risk level elevated to HIGH. Immediate intervention alert dispatched to Club Head.',
        highlight: 'Detects blockers before they derail the campus event schedule.',
      },
    },
    {
      id: 5,
      title: '6. Synchronized Execution',
      badge: 'Live Hub',
      desc: 'On event day, leads and volunteers coordinate via WebSockets war rooms, shift check-ins, and telemetry.',
      simulation: {
        input: 'Milestone 2 Completed -> 3/3 tasks marked DONE -> Milestone automatically checked.',
        state: 'Live telemetry broadcasted to Team Live Hub in real-time.',
        highlight: 'Single synchronized command center for the entire student organization.',
      },
    },
  ];

  const roles = [
    {
      id: 'PRESIDENT',
      title: 'Club President',
      badge: 'Executive Oversight',
      desc: 'Strategic visibility across all campus clubs, budget approvals, and critical path risk prevention.',
      features: [
        'Multi-club executive command overview & approvals',
        'Institutional health score index (0-100 telemetry)',
        'Strategic advisor recommendations and risk mitigation',
        'Compliance, audit log oversight, and leadership settings',
      ],
    },
    {
      id: 'CLUB_HEAD',
      title: 'Club Head / Organizer',
      badge: 'Operations Lead',
      desc: 'Operational command over events, Kanban task boards, meeting minutes, and volunteer rosters.',
      features: [
        'AI-driven event milestone decomposition & task breakdown',
        'Automated meeting transcript parsing to atomic tasks',
        'Volunteer pool management with AI matchmaking',
        'Multi-channel announcement drafting and campus broadcast',
      ],
    },
    {
      id: 'VOLUNTEER',
      title: 'Volunteer Squad',
      badge: 'Execution & Duties',
      desc: 'Clear personal duty assignments, shift check-ins, milestone handovers, and war room collaboration.',
      features: [
        'Personal task queue filtered to assigned deliverables',
        '1-click event check-in and attendance verification',
        'Milestone task status updates triggering auto-completion',
        'Direct communication in #volunteer-pool live room',
      ],
    },
    {
      id: 'MEMBER',
      title: 'Club Member',
      badge: 'Campus Community',
      desc: 'Stay informed on upcoming events, workshops, announcements, and volunteer opportunities.',
      features: [
        'Campus event calendar and verified registration badges',
        'Official club announcements and venue updates',
        'Volunteer opportunity applications and skill tagging',
        'Knowledge base access to past workshops and recordings',
      ],
    },
  ];

  return (
    <div className="space-y-24 pb-20 overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative pt-12 pb-8 sm:pt-20 sm:pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-5 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>The AI Operations Engine for Collegiate Organizations</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-slate-900 tracking-tight leading-[1.08]">
            Run Your Campus Club’s Events <span className="text-emerald-600">Smarter.</span>
          </h1>

          <p className="text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Plan milestones, decompose meeting minutes, coordinate volunteer squads, detect critical risks,
            and monitor live event telemetry from one intelligent command center.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Button
              size="lg"
              variant="primary"
              rightIcon={ArrowRight}
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto shadow-md shadow-emerald-600/20"
            >
              Launch Club Console
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto"
            >
              Explore Architecture
            </Button>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium flex-wrap">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Role-Based Access
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Real-time WebSockets Live Hub
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Automated Milestone Tracking
            </span>
          </div>
        </div>

        {/* Product UI Preview Showcase */}
        <div className="mt-12 sm:mt-16 max-w-6xl mx-auto">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-2.5 sm:p-4 shadow-xl shadow-slate-200/50">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between pb-3 px-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-slate-400 ml-2">clubops.ai/app/command-center</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                    activeTab === 'overview' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Overview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                    activeTab === 'tasks' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Kanban & Milestones
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('livehub')}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${
                    activeTab === 'livehub' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Team Live Hub
                </button>
              </div>
            </div>

            {/* Dynamic Preview Canvas */}
            <div className="pt-4 bg-slate-50/60 rounded-2xl p-4 sm:p-6 min-h-[380px] flex flex-col justify-between">
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/80">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Organization</div>
                      <div className="text-base font-extrabold text-slate-900">Google Developer Student Club • HackOut 2026</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="success" size="sm" dot>Live Operations</Badge>
                      <Badge variant="neutral" size="sm">34 Volunteers</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Tasks Progress</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">18 / 24</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">75% Completed</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Milestones</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">4 of 6</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Auto-synchronized</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Volunteer Staffing</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">100%</div>
                      <div className="text-[11px] text-slate-500 font-medium mt-0.5">All tracks matched</div>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/70">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Active Risks</div>
                      <div className="text-xl font-extrabold text-slate-900 mt-1">0 Critical</div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Radar clear</div>
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        T-3
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Current Milestone: Technical & Venue Dry-Run</div>
                        <div className="text-[11px] text-slate-400">2 of 2 tasks completed • Auto-completing milestone</div>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">On Track</Badge>
                  </div>
                </div>
              )}

              {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs font-bold text-slate-600">
                      <span>To Do (3)</span>
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">Audio/Visual Soundcheck</div>
                      <div className="text-[10px] text-slate-400">Milestone: T-1 Day • Audio Squad</div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs font-bold text-amber-700">
                      <span>In Progress (4)</span>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">Check-in Badge Lanyards</div>
                      <div className="text-[10px] text-slate-500">Milestone: T-3 Days • 2 Volunteers</div>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-xs font-bold text-emerald-700">
                      <span>Completed (17)</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                      <div className="font-semibold text-slate-900 line-through text-slate-500">Book Main Auditorium</div>
                      <div className="text-[10px] text-emerald-700 font-semibold">Ticked Milestone 1 Automatically</div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'livehub' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 sm:col-span-1">
                    <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-100">Operations Rooms</div>
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold"># HackOut 2026 War Room</div>
                    <div className="p-1.5 rounded-lg text-slate-600 text-xs hover:bg-slate-50"># Volunteer Pool</div>
                    <div className="p-1.5 rounded-lg text-slate-600 text-xs hover:bg-slate-50"># Urgent & Emergencies</div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2 sm:col-span-2">
                    <div className="text-xs font-bold text-slate-800 pb-1 border-b border-slate-100 flex items-center justify-between">
                      <span>Live WebSocket Telemetry</span>
                      <span className="text-[10px] text-emerald-600 font-mono">100% Connected</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 text-slate-700">
                        <span className="font-bold text-slate-900">Arjun (Lead):</span> &quot;Projectors tested in Audi 1. All resolutions verified.&quot;
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200">
                        <span className="font-bold">SYSTEM TELEMETRY:</span> &quot;Task [AV Setup] marked DONE &rarr; Milestone 2 complete.&quot;
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Operational Telemetry Active
                </span>
                <span className="font-semibold text-emerald-700">Enterprise Ready</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. NUMBER / IMPACT SECTION */}
      <section className="bg-white border-y border-slate-200/90 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">10x</div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Faster Task Decomposition</p>
              <p className="text-[11px] text-slate-400">Meeting minutes converted to tasks in seconds</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">100%</div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Volunteer Skill Matching</p>
              <p className="text-[11px] text-slate-400">Direct track alignment without manual spreadsheets</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-emerald-600 tracking-tight">&lt; 36h</div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Risk Radar Warning Window</p>
              <p className="text-[11px] text-slate-400">Identifies bottlenecks before deadlines lapse</p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">0</div>
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Lost Operational Deliverables</p>
              <p className="text-[11px] text-slate-400">Audit logs and synchronized milestone tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE CHALLENGE (PROBLEM SECTION) */}
      <section id="problem" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            The Campus Operational Chaos
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Campus Clubs Currently Run on Fragmented Tools
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            When campus organizations depend on disparate chat apps, spreadsheets, and sticky notes,
            essential details slip through the cracks.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 space-y-3 border-rose-100 bg-rose-50/20">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm">
              01
            </div>
            <h3 className="text-base font-bold text-slate-900">Buried in WhatsApp & Group Chats</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Crucial logistics, auditorium approvals, and speaker coordinates get drowned beneath hundreds of casual messages.
              Nobody knows who is accountable.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-amber-100 bg-amber-50/20">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
              02
            </div>
            <h3 className="text-base font-bold text-slate-900">Outdated Spreadsheets & Rosters</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Volunteer spreadsheets become obsolete within 48 hours. Leads have no real-time way to know if shifts are covered
              or if volunteers have arrived.
            </p>
          </Card>

          <Card className="p-6 space-y-3 border-slate-200 bg-slate-50/40">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm">
              03
            </div>
            <h3 className="text-base font-bold text-slate-900">Invisible Blockers & Late Panics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Dependencies like banner printing or projector sanctioning stall without warning. Club presidents only discover
              the blocker the day before the event.
            </p>
          </Card>
        </div>
      </section>

      {/* 4. THE SOLUTION (PIPELINE) */}
      <section id="solution" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-14 text-white space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              The ClubOps Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              A Unified Intelligent Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              From raw discussion notes to synchronized execution on event day.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="text-xs font-bold text-emerald-400 uppercase">Stage 1: Input & Ingestion</div>
              <h3 className="text-base font-bold text-white">Unstructured Notes & Ideas</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Paste meeting transcripts, standup bullet points, or high-level event concepts. No formatting required.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-emerald-950/70 border border-emerald-700/80 space-y-3 relative overflow-hidden">
              <div className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Stage 2: AI Intelligence Tier
              </div>
              <h3 className="text-base font-bold text-white">Decomposition & Matchmaking</h3>
              <p className="text-xs text-slate-200 leading-relaxed">
                Extracts atomic deliverables, binds them to event milestones, assesses required skills, and matches volunteers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3">
              <div className="text-xs font-bold text-emerald-400 uppercase">Stage 3: Live Execution</div>
              <h3 className="text-base font-bold text-white">Real-Time Telemetry & Radar</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Kanban boards, auto-ticking milestone steppers, proactive risk radar, and WebSockets team war room.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CORE CAPABILITIES (FEATURES) */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            Feature Suite
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Everything Required to Command Campus Events
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Eight integrated operational pillars engineered specifically for university student organizations.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Event Milestone Hub</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Auto-calculating milestones (T-21 to T-0 days) with task progress bars and auto-completion.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Smart Kanban Tasks</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Role-tagged cards, priority chips, dependency links, and milestone associations.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Volunteer Matchmaker</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automated skill matching, workload distribution, and instant shift check-ins.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Meeting Intelligence</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste meeting minutes or transcripts to automatically extract committee deliverables.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Risk & Deadlines Radar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Proactive alerts for overdue tasks, blocked dependencies, and staffing shortages.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Team Live Hub</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              WebSockets event war rooms, real-time presence indicators, and telemetry stream.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Institutional RAG</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Semantic document query system so next year’s leaders preserve past knowledge.
            </p>
          </Card>

          <Card className="p-5 space-y-3" hover>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Operations Analytics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Club health index gauge (0-100), task velocity metrics, and volunteer leaderboard.
            </p>
          </Card>
        </div>
      </section>

      {/* 6. HOW IT WORKS STEPPER */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Step-by-Step Lifecycle
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How ClubOps AI Orchestrates Your Event
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Click through each operational phase to see the system in action.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Stepper Buttons (5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            {workflowSteps.map((step) => {
              const isActive = activeWorkflowStep === step.id;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveWorkflowStep(step.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                      : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-extrabold ${isActive ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {step.title}
                    </span>
                    <Badge variant={isActive ? 'emerald' : 'neutral'} size="sm">
                      {step.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{step.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Interactive Simulation Output (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-900">
                  {workflowSteps[activeWorkflowStep].title} — Live State
                </span>
              </div>
              <Badge variant="success" size="sm">Step {activeWorkflowStep + 1} of 6</Badge>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Input / Trigger
                </label>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                  {workflowSteps[activeWorkflowStep].simulation.input}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Automated System State
                </label>
                <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs font-semibold text-emerald-900">
                  {workflowSteps[activeWorkflowStep].simulation.state}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{workflowSteps[activeWorkflowStep].simulation.highlight}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. ROLE PERSPECTIVES */}
      <section id="roles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            Tailored Perspectives
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Stakeholder
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The user interface adapts based on active club role so each person only sees what they need.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="mt-10 flex items-center justify-center gap-2 flex-wrap">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setActiveRolePerspective(r.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                activeRolePerspective === r.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {r.title}
            </button>
          ))}
        </div>

        {/* Active Role Content Card */}
        {(() => {
          const r = roles.find((item) => item.id === activeRolePerspective) || roles[0];
          return (
            <div className="mt-6 max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <Badge variant="emerald" size="sm">{r.badge}</Badge>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">{r.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">{r.desc}</p>
                </div>
                <Button size="sm" variant="primary" onClick={() => navigate('/login')}>
                  Experience View
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {r.features.map((feat, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* 8. CAMPUS SECURITY & GOVERNANCE */}
      <section id="security" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-2xs space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
              <Lock className="w-3 h-3 text-slate-600" />
              Governance & Integrity
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Governance for University Clubs
            </h2>
            <p className="text-xs text-slate-500">
              Built with strict security guardrails ensuring privacy across clubs and executive committee approvals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Role-Based Access Control</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tokens and club memberships are cryptographically authenticated via JWT with automated permission barriers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Tamper-Proof Audit Logging</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Every task assignment, milestone approval, and financial expense is written to an immutable audit trail.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <Zap className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900">Deterministic AI Fallbacks</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero crash vulnerability: if external LLM APIs face rate limits, local deterministic heuristics guarantee continuous uptime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-8 sm:p-14 text-white text-center space-y-6 shadow-xl shadow-emerald-900/20">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to Professionalize Your Campus Club?
          </h2>
          <p className="text-xs sm:text-base text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Join Google Developer Student Club, ACM, Robotics, and Coders Club in unifying event operations, tasks, and volunteer coordination.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              variant="secondary"
              rightIcon={ArrowRight}
              onClick={() => navigate('/login')}
              className="bg-white text-emerald-900 hover:bg-emerald-50 border-white shadow-md font-bold"
            >
              Sign In to Your Club
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/signup')}
              className="text-white border-white/40 hover:bg-white/10"
            >
              Create Account
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
