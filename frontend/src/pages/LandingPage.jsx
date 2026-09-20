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
  Play,
  Layers,
  Zap,
  Terminal,
  Clock,
  ArrowUpRight,
  Award,
  BookOpen,
  Cpu,
  Workflow
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import Tabs from '../components/ui/Tabs';
import { APP_NAME } from '../utils/constants';

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const [activeRolePerspective, setActiveRolePerspective] = useState('PRESIDENT');

  const workflowSteps = [
    {
      id: 0,
      title: '1. Create Event',
      badge: 'Event Init',
      desc: 'Club heads initialize an event with title, tentative dates, venue preferences, and preliminary budget.',
      simulation: {
        input: 'Event: "HackOut 2026: 36-hour Inter-College Hackathon"',
        state: 'Event initialized with status "Active" in Google Developer Student Club.',
        highlight: 'Event dashboard, timeline, and budget tracker generated automatically.',
      },
    },
    {
      id: 1,
      title: '2. Meeting Minutes',
      badge: 'Input',
      desc: 'Club heads and volunteers conduct a kickoff meeting and paste unstructured meeting minutes or bullet notes.',
      simulation: {
        input: '"Rahul books main auditorium before Friday. Priya finishes sponsor deck. Kabir handles judge outreach."',
        state: 'Unstructured notes parsed into structured committee action items.',
        highlight: 'Instant analysis without manual copy-pasting across spreadsheets.',
      },
    },
    {
      id: 2,
      title: '3. AI Extracts Tasks',
      badge: 'Extraction',
      desc: 'Discussion points are automatically converted into atomic task cards with priorities and dependencies.',
      simulation: {
        input: '3 distinct tasks generated: [Book Auditorium], [Finalize Sponsor Deck], [Contact Hackathon Judges].',
        state: 'Tasks organized by category (Logistics, Sponsorship, Technical).',
        highlight: 'Every task is categorized with clear deliverable milestones.',
      },
    },
    {
      id: 3,
      title: '4. Assign Owners',
      badge: 'Assignment',
      desc: 'Club roster is cross-referenced to automatically link tasks to qualified club leads and volunteers.',
      simulation: {
        input: 'Rahul Sharma \u2192 Auditorium Booking | Priya Patel \u2192 Sponsor Deck | Kabir Das \u2192 Judges',
        state: 'Team members assigned with instant dashboard alerts.',
        highlight: 'Team members receive direct task assignments and notifications.',
      },
    },
    {
      id: 4,
      title: '5. Detect Deadlines',
      badge: 'Smart Deadlines',
      desc: 'Relative dates ("before Friday", "in 2 weeks") are resolved into absolute dates with reminders.',
      simulation: {
        input: '"Before Friday" \u2192 Resolved to Friday, 5:00 PM (April 17, 2026).',
        state: 'Deadlines attached to Kanban cards with automated alerts.',
        highlight: 'Automated calendar countdowns and reminder alerts.',
      },
    },
    {
      id: 5,
      title: '6. Risk Guardrails',
      badge: 'Risk Radar',
      desc: 'Proactively identifies dependency bottlenecks and resource shortages before they jeopardize the event.',
      simulation: {
        input: 'WARNING: "Banner printing is blocked by Sponsor payment confirmation delay."',
        state: 'Risk score elevated to HIGH. Mitigation suggested to President.',
        highlight: 'Identifies blockers before they delay your event schedule.',
      },
    },
    {
      id: 6,
      title: '7. AI Announcement',
      badge: 'Communication',
      desc: 'Drafts targeted announcements for college broadcast via email and social channels.',
      simulation: {
        input: 'Subject: "HackOut 2026 Registration Open! \uD83D\uDE80 $5,000 in Prizes"',
        state: 'Email template generated and staged for President review.',
        highlight: 'President reviews and sends polished broadcast emails in 1 click.',
      },
    },
    {
      id: 7,
      title: '8. Dashboard Sync',
      badge: 'Live Sync',
      desc: 'Kanban boards, committee progress, and volunteer rosters update synchronously in real-time.',
      simulation: {
        input: 'Dashboard metrics refreshed: Completion +12%, 3 Tasks active, 0 unassigned items.',
        state: 'All committee leads stay aligned on a single live Kanban board.',
        highlight: 'Centralized single source of truth for the entire club.',
      },
    },
  ];

  const rolePerspectives = {
    PRESIDENT: {
      role: 'Club President',
      tagline: 'High-level operational oversight and risk governance.',
      features: [
        'Approve high-budget expenditures and critical event phases',
        'Real-time proactive risk radar across all sub-committees',
        'Access immutable audit logs of all club operations',
        'Generate executive summary reports for faculty advisors',
      ],
      previewStats: [
        { label: 'Managed Events', val: '4 Active' },
        { label: 'Pending Approvals', val: '2' },
        { label: 'Risk Score', val: 'Low (94%)' },
      ],
    },
    CLUB_HEAD: {
      role: 'Club Head',
      tagline: 'End-to-end event execution, meeting intelligence, and tasks.',
      features: [
        'Generate end-to-end event checklists with Groq AI Planner',
        'Convert meeting minutes into Kanban tasks in seconds',
        'Automate Brevo email announcements with one click',
        'Track multi-tier task dependencies with block warnings',
      ],
      previewStats: [
        { label: 'Tasks in Progress', val: '18' },
        { label: 'Meetings Processed', val: '7 Notes' },
        { label: 'Deadlines Today', val: '3' },
      ],
    },
    VOLUNTEER: {
      role: 'Student Volunteer & Squad Lead',
      tagline: 'Clear responsibilities, squad coordination, task execution, and check-ins.',
      features: [
        'Dedicated task inbox with deadline notifications',
        'Match open tasks and squad duties based on declared skills',
        'One-tap event check-in via web and mobile',
        'Coordinate shift handovers and resolve blocked dependencies',
        'Access event brief, emergency contacts, and maps',
        'Earn automated volunteer certificates and recognition',
      ],
      previewStats: [
        { label: 'My Tasks', val: '3 Active' },
        { label: 'Squad Velocity', val: '94%' },
        { label: 'Next Shift', val: 'Tomorrow 9 AM' },
        { label: 'Badges Earned', val: '5' },
      ],
    },
  };

  const featureCards = [
    {
      title: 'AI Event Planning',
      desc: 'Prompt: "Organize a Hackathon". Groq Llama 3.3 automatically generates a multi-phase timeline, sponsor checklist, judge roster, and volunteer requirements.',
      icon: Sparkles,
      tag: 'Generative AI',
    },
    {
      title: 'Kanban Task Management',
      desc: 'Interactive boards with Todo, In Progress, and Done. Built-in dependency tracking alerts you when a task is blocked by another uncompleted item.',
      icon: CheckSquare,
      tag: 'Core Operations',
    },
    {
      title: 'Meeting Intelligence',
      desc: 'Paste raw, informal meeting minutes. The AI extracts action items, identifies task owners, resolves relative deadlines, and creates real tasks.',
      icon: FileText,
      tag: 'NLP Extraction',
    },
    {
      title: 'Volunteer Matchmaking',
      desc: 'Volunteer profiles store skills, availability calendars, and experience. AI suggests ideal assignments to eliminate team burnout.',
      icon: Users,
      tag: 'Resource Engine',
    },
    {
      title: 'Proactive Risk Detection',
      desc: 'Identifies understaffed shifts, overdue tasks, and sponsor payment delays with human-readable explanations and suggested mitigations.',
      icon: AlertTriangle,
      tag: 'Decision Support',
    },
    {
      title: 'Institutional Knowledge (RAG)',
      desc: 'Upload past budgets, sponsor decks, and faculty permissions. Ask questions like "What was last year\'s catering cost?" and get grounded answers.',
      icon: BookOpen,
      tag: 'Knowledge Base',
    },
  ];

  return (
    <div className="space-y-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 sm:pb-16 text-center space-y-8">
        {/* Subtle decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-100/60 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-xs font-semibold text-emerald-800 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Intelligent Operations for Student Organizations</span>
        </div>

        <div className="max-w-4xl mx-auto space-y-4 px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            The Centralized AI Operating System for <span className="text-emerald-600 underline decoration-emerald-300 decoration-wavy underline-offset-8">Campus Events</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Eliminate lost WhatsApp messages, scattered spreadsheets, and missed deadlines. ClubOps AI unites planning, meeting intelligence, volunteer matchmaking, and automated risk prevention in one enterprise platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Button
            size="lg"
            variant="primary"
            rightIcon={ArrowRight}
            onClick={() => navigate('/app')}
            className="shadow-sm shadow-emerald-600/20"
          >
            Enter Operations Dashboard
          </Button>
          <a
            href="#workflow"
            className="inline-flex items-center justify-center font-medium rounded-xl transition-all text-sm px-5 py-2.5 gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs cursor-pointer"
          >
            <Workflow className="w-4 h-4 text-emerald-600" />
            Explore 8-Step Workflow
          </a>
        </div>

        {/* Live Event Operations Simulation Card */}
        <div className="max-w-4xl mx-auto pt-6 px-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden text-left">
            {/* Window chrome header */}
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-slate-500 ml-2">
                  clubops-ai // live-event-operations
                </span>
              </div>
              <Badge variant="emerald" size="sm" dot pulse>
                AI Assistant Active
              </Badge>
            </div>

            {/* Mockup Body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/30">
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  1. Natural Input
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-mono text-slate-700 shadow-2xs">
                  &quot;Organize HackOut 2026. Rahul handles auditorium. Sponsor payment is delayed.&quot;
                </div>
                <div className="text-[11px] text-slate-500">
                  Input captured via notes, web app, or meeting transcripts.
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> 2. AI Workflow Engine
                </div>
                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 space-y-1 shadow-2xs">
                  <div>✓ Extracted 4 tasks</div>
                  <div>✓ Assigned: Rahul Sharma</div>
                  <div>✓ Deadline: Friday 5:00 PM</div>
                  <div className="text-amber-700 font-bold">⚠ Risk: Banner blocked</div>
                </div>
                <div className="text-[11px] text-slate-500">
                  Automated coordination across committees and leads.
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  3. Application Action
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-800 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Kanban Updated</span>
                    <Badge variant="success" size="sm">Synced</Badge>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Tasks created on live board. Direct notification dispatched to Rahul.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  rightIcon={ArrowUpRight}
                  onClick={() => navigate('/app')}
                >
                  Inspect in Live Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Workflow Stepper (8-Step Product Vision) */}
      <section id="workflow" className="scroll-mt-20 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto px-4">
          <Badge variant="emerald" size="md">
            Product Vision in Action
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            The Autonomous Event Operations Pipeline
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            From initial meeting notes to real application actions. Click through the 8 stages to see how ClubOps AI automates club execution.
          </p>
        </div>

        {/* Stepper Horizontal Tracker */}
        <div className="max-w-5xl mx-auto px-4 overflow-x-auto pb-4 scrollbar-thin">
          <div className="flex items-center min-w-[700px] justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />

            {workflowSteps.map((step, idx) => {
              const isCurrent = activeWorkflowStep === idx;
              const isPast = activeWorkflowStep > idx;

              return (
                <button
                  key={step.id}
                  onClick={() => setActiveWorkflowStep(idx)}
                  className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isCurrent
                        ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110 shadow-sm'
                        : isPast
                        ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                        : 'bg-white text-slate-500 border-2 border-slate-300 group-hover:border-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-semibold max-w-[80px] text-center truncate ${
                      isCurrent ? 'text-emerald-700 font-bold' : 'text-slate-500'
                    }`}
                  >
                    {step.title.split('. ')[1]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stepper Detail Card */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  Stage {activeWorkflowStep + 1} of 8
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {workflowSteps[activeWorkflowStep].title}
                </h3>
              </div>
              <Badge variant="emerald" size="md">
                {workflowSteps[activeWorkflowStep].badge}
              </Badge>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {workflowSteps[activeWorkflowStep].desc}
            </p>

            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-3 font-mono text-xs">
              <div className="text-slate-500 font-bold uppercase tracking-wider">Simulation Payload:</div>
              <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800">
                {workflowSteps[activeWorkflowStep].simulation.input}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 text-emerald-900">
                  <span className="font-bold block mb-1">Workflow State:</span>
                  {workflowSteps[activeWorkflowStep].simulation.state}
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-700">
                  <span className="font-bold block mb-1">Architecture Guarantee:</span>
                  {workflowSteps[activeWorkflowStep].simulation.highlight}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={activeWorkflowStep === 0}
                onClick={() => setActiveWorkflowStep((prev) => Math.max(0, prev - 1))}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                &larr; Previous Stage
              </button>
              <button
                type="button"
                disabled={activeWorkflowStep === workflowSteps.length - 1}
                onClick={() => setActiveWorkflowStep((prev) => Math.min(workflowSteps.length - 1, prev + 1))}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                Next Stage &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Experience Explorer */}
      <section className="space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto px-4">
          <Badge variant="purple" size="md">
            Role-Based Access & Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed for Every Club Member
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Tailored interfaces with deny-by-default permissions ensure presidents, club heads, and volunteers see exactly what they need.
          </p>
        </div>

        {/* Role Segmented Tabs */}
        <div className="flex justify-center px-4">
          <Tabs
            tabs={[
              { id: 'PRESIDENT', label: 'Club President' },
              { id: 'CLUB_HEAD', label: 'Club Head' },
              { id: 'VOLUNTEER', label: 'Volunteer' },
            ]}
            activeTab={activeRolePerspective}
            onChange={setActiveRolePerspective}
          />
        </div>

        {/* Active Role Content Card */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {rolePerspectives[activeRolePerspective].role}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rolePerspectives[activeRolePerspective].tagline}
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => navigate('/app')}
              >
                Launch Role Dashboard
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rolePerspectives[activeRolePerspective].previewStats.map((st, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                  <div className="text-xs text-slate-500">{st.label}</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">{st.val}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Core Role Capabilities:
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rolePerspectives[activeRolePerspective].features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="scroll-mt-20 space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto px-4">
          <Badge variant="emerald" size="md">
            All-In-One Platform
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built for Campus Club Success
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Every tool student leaders need to plan, coordinate, and execute flawless campus events.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
          {featureCards.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 hover:border-emerald-300 shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {feat.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{feat.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-emerald-900 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden text-center space-y-6 shadow-xl">
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ready to upgrade your college club operations?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Experience the complete AI-powered event operations platform. Built for university student councils, technical societies, and cultural clubs.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            variant="secondary"
            rightIcon={ArrowRight}
            onClick={() => navigate('/app')}
            className="bg-white text-emerald-900 hover:bg-emerald-50 border-white font-bold"
          >
            Launch ClubOps Command Center
          </Button>
          <a
            href="#workflow"
            className="inline-flex items-center justify-center font-medium rounded-xl transition-all text-sm px-5 py-2.5 gap-2 bg-emerald-800/80 hover:bg-emerald-800 text-white border border-emerald-700 cursor-pointer"
          >
            <Workflow className="w-4 h-4" />
            See How It Works
          </a>
        </div>
      </section>
    </div>
  );
}
