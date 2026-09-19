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
import MeetingsPage from '../pages/MeetingsPage';
import KnowledgePage from '../pages/KnowledgePage';
import RisksPage from '../pages/RisksPage';
import AnnouncementsPage from '../pages/AnnouncementsPage';
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
            <MeetingsPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/knowledge"
        element={
          <DashboardShell>
            <KnowledgePage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/risks"
        element={
          <DashboardShell>
            <RisksPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/announcements"
        element={
          <DashboardShell>
            <AnnouncementsPage />
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
