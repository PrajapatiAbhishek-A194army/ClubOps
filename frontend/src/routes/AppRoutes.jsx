import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import DashboardShell from '../layouts/DashboardShell';
import LandingPage from '../pages/LandingPage';
import DashboardOverview from '../pages/DashboardOverview';
import PlaceholderFeature from '../pages/PlaceholderFeature';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route
        path="/"
        element={
          <RootLayout>
            <LandingPage />
          </RootLayout>
        }
      />

      {/* Enterprise Dashboard Shell Routes */}
      <Route
        path="/app"
        element={
          <DashboardShell>
            <DashboardOverview />
          </DashboardShell>
        }
      />

      <Route
        path="/app/events"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Event Management & AI Planner"
              phase="Phase 4"
              description="Full lifecycle event creation, budget allocation, timelines, and automated checklist generation via Groq Llama 3.3."
              capabilities={[
                'Multi-phase event timeline generation',
                'Sponsor proposal checklist generator',
                'Event dashboard with budget tracking',
                'Faculty approval workflow integration',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/tasks"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Kanban Task Management & Dependencies"
              phase="Phase 5"
              description="Interactive Kanban board with drag-and-drop, strict dependency tracking, owner assignment, and deadline alarms."
              capabilities={[
                'Todo, In Progress, and Done lanes',
                'Multi-card dependency enforcement',
                'Priority tags (Low, Medium, High, Critical)',
                'Automated deadline detection and alerts',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/volunteers"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Volunteer Roster & AI Matchmaking"
              phase="Phase 6"
              description="Student volunteer profile management, skill tagging, availability calendars, and AI-recommended shift allocations."
              capabilities={[
                'Student skill tagging and preferences',
                'AI matchmaker recommendation engine',
                'Shift capacity and burnout prevention',
                'Attendance check-in tracker',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/meetings"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Meeting Intelligence & Action Extraction"
              phase="Phase 7"
              description="Paste raw meeting notes or audio transcripts to automatically extract atomic tasks, owners, and relative deadlines."
              capabilities={[
                'Natural language action item parser',
                'Owner detection and roster matching',
                'Relative deadline resolver ("before Friday")',
                '1-click auto task generation into Kanban',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/knowledge"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Club Knowledge Repository (RAG)"
              phase="Phase 8"
              description="Vectorized institutional memory. Upload PDFs, budgets, and reports to ask questions and retrieve historical club context."
              capabilities={[
                'PDF and DOCX document ingestion',
                'Vector embeddings and semantic retrieval',
                'Historical budget and sponsorship lookup',
                'Audit-logged document permissions',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/risks"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Proactive Risk & Deadlines Radar"
              phase="Phase 10"
              description="Background risk analysis engine detecting blocked task chains, overdue items, understaffed shifts, and sponsor payment delays."
              capabilities={[
                'Critical path dependency block detection',
                'Volunteer shift shortage warnings',
                'Explainable AI mitigation recommendations',
                'President escalation alerts',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/announcements"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="AI Announcements & Multi-Channel Communications"
              phase="Phase 11"
              description="Draft high-engagement club communications with AI and broadcast via Brevo transactional email API."
              capabilities={[
                'Targeted announcement template generator',
                'Brevo email API delivery pipeline',
                'Notification center and broadcast history',
                'President approval guardrail',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/audit"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Immutable Audit Logs & Governance"
              phase="Phase 15"
              description="Immutable security log recording actor, timestamp, event, action verb, and diff payload across all operations."
              capabilities={[
                'Tamper-resistant audit trail',
                'Security event filtering by actor and date',
                'Compliance export for university advisors',
                'Strict deny-by-default verification',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route
        path="/app/settings"
        element={
          <DashboardShell>
            <PlaceholderFeature
              title="Club & System Settings"
              phase="Phase 3"
              description="Manage club metadata, university affiliations, user roles, security tokens, and API integrations."
              capabilities={[
                'Club profile and branding preferences',
                'Role-based permission matrix',
                'Groq and Brevo API credentials test',
                'Active session management',
              ]}
            />
          </DashboardShell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
