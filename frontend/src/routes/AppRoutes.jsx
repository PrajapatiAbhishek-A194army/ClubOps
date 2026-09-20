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
import CollaborationPage from '../pages/CollaborationPage';
import AnalyticsPage from '../pages/AnalyticsPage';
import AuditPage from '../pages/AuditPage';
import PlaceholderFeature from '../pages/PlaceholderFeature';
import { useAuth } from '../context/AuthContext';

function LeadershipRoute({ children }) {
  const { activeRole, user, loading } = useAuth();
  if (loading) return null;
  const isLeadership =
    user?.is_superuser ||
    user?.email === 'president@clubops.ai' ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole) ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(user?.active_role) ||
    ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(user?.role);

  if (!isLeadership) {
    return <Navigate to="/app" replace />;
  }
  return children;
}

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
            <LeadershipRoute>
              <VolunteersPage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route
        path="/app/meetings"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <MeetingsPage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route
        path="/app/knowledge"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <KnowledgePage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route
        path="/app/risks"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <RisksPage />
            </LeadershipRoute>
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
        path="/app/collaboration"
        element={
          <DashboardShell>
            <CollaborationPage />
          </DashboardShell>
        }
      />

      <Route
        path="/app/analytics"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <AnalyticsPage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route
        path="/app/audit"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <AuditPage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route
        path="/app/settings"
        element={
          <DashboardShell>
            <LeadershipRoute>
              <ClubSettingsPage />
            </LeadershipRoute>
          </DashboardShell>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
