import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';
import DashboardShell from '../layouts/DashboardShell';
import LandingPage from '../pages/LandingPage';
import LoginPage from '../pages/LoginPage';
import SignupPage from '../pages/SignupPage';
import DashboardOverview from '../pages/DashboardOverview';
import ClubMembersPage from '../pages/ClubMembersPage';
import ClubSettingsPage from '../pages/ClubSettingsPage';
import EventsPage from '../pages/EventsPage';
import EventDetailsPage from '../pages/EventDetailsPage';
import TasksPage from '../pages/TasksPage';
import VolunteersPage from '../pages/VolunteersPage';
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

      {/* Authentication Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

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
        path="/app/members"
        element={
          <DashboardShell>
            <ClubMembersPage />
          </DashboardShell>
        }
      />


      <Route
        path="/app/events"
        element={
          <DashboardShell>
            <EventsPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/events/:eventId"
        element={
          <DashboardShell>
            <EventDetailsPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/tasks"
        element={
          <DashboardShell>
            <TasksPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/volunteers"
        element={
          <DashboardShell>
            <VolunteersPage />
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
            <ClubSettingsPage />
          </DashboardShell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
