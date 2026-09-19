import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clubops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token expiry / invalidation
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentToken = localStorage.getItem('clubops_token');
      if (currentToken) {
        localStorage.removeItem('clubops_token');
        if (window.location.pathname.startsWith('/app')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// System Health
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Authentication
export const loginUser = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const signupUser = async (userData) => {
  const response = await api.post('/auth/signup', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await api.put('/auth/me', profileData);
  return response.data;
};

// Club Management
export const getPublicClubs = async () => {
  const response = await api.get('/clubs/public');
  return response.data;
};

export const getUserClubs = async () => {
  const response = await api.get('/clubs');
  return response.data;
};

export const createClub = async (clubData) => {
  const response = await api.post('/clubs', clubData);
  return response.data;
};

export const getClubDetails = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}`);
  return response.data;
};

// Member Management
export const getClubMembers = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/members`, { params });
  return response.data;
};

export const addClubMember = async (clubId, memberData) => {
  const response = await api.post(`/clubs/${clubId}/members`, memberData);
  return response.data;
};

export const updateMemberRole = async (clubId, membershipId, updateData) => {
  const response = await api.put(`/clubs/${clubId}/members/${membershipId}`, updateData);
  return response.data;
};

export const removeClubMember = async (clubId, membershipId) => {
  const response = await api.delete(`/clubs/${clubId}/members/${membershipId}`);
  return response.data;
};

export const assignClubHead = async (clubId, userId) => {
  const response = await api.post(`/clubs/${clubId}/assign-club-head`, { user_id: userId });
  return response.data;
};

// Volunteer Join & Application Requests
export const getClubJoinRequests = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/join-requests`, { params });
  return response.data;
};

export const reviewJoinRequest = async (clubId, requestId, status) => {
  const response = await api.patch(`/clubs/${clubId}/join-requests/${requestId}`, { status });
  return response.data;
};

// Event Management
export const getClubEvents = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/events`, { params });
  return response.data;
};

export const createEvent = async (clubId, eventData) => {
  const response = await api.post(`/clubs/${clubId}/events`, eventData);
  return response.data;
};

export const getEventDetails = async (clubId, eventId) => {
  const response = await api.get(`/clubs/${clubId}/events/${eventId}`);
  return response.data;
};

export const updateEvent = async (clubId, eventId, updateData) => {
  const response = await api.put(`/clubs/${clubId}/events/${eventId}`, updateData);
  return response.data;
};

export const toggleMilestone = async (clubId, eventId, milestoneId, completed) => {
  const response = await api.patch(`/clubs/${clubId}/events/${eventId}/milestones`, {
    milestone_id: milestoneId,
    completed,
  });
  return response.data;
};

export const deleteEvent = async (clubId, eventId) => {
  const response = await api.delete(`/clubs/${clubId}/events/${eventId}`);
  return response.data;
};

export const planEventWithAI = async (clubId, planData) => {
  const response = await api.post(`/clubs/${clubId}/events/plan-ai`, planData);
  return response.data;
};

// Task & Kanban Management
export const getClubTasks = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/tasks`, { params });
  return response.data;
};

export const createTask = async (clubId, taskData) => {
  const response = await api.post(`/clubs/${clubId}/tasks`, taskData);
  return response.data;
};

export const getTaskDetails = async (clubId, taskId) => {
  const response = await api.get(`/clubs/${clubId}/tasks/${taskId}`);
  return response.data;
};

export const updateTask = async (clubId, taskId, updateData) => {
  const response = await api.put(`/clubs/${clubId}/tasks/${taskId}`, updateData);
  return response.data;
};

export const updateTaskStatus = async (clubId, taskId, status) => {
  const response = await api.patch(`/clubs/${clubId}/tasks/${taskId}/status`, { status });
  return response.data;
};

export const deleteTask = async (clubId, taskId) => {
  const response = await api.delete(`/clubs/${clubId}/tasks/${taskId}`);
  return response.data;
};

export const suggestTasksWithAI = async (clubId, suggestData) => {
  const response = await api.post(`/clubs/${clubId}/tasks/ai-suggest`, suggestData);
  return response.data;
};

// Volunteer Management (Phase 6)
export const getClubVolunteers = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/volunteers`, { params });
  return response.data;
};

export const getVolunteerDetails = async (clubId, volunteerId) => {
  const response = await api.get(`/clubs/${clubId}/volunteers/${volunteerId}`);
  return response.data;
};

export const createVolunteerProfile = async (clubId, volunteerData) => {
  const response = await api.post(`/clubs/${clubId}/volunteers`, volunteerData);
  return response.data;
};

export const updateVolunteerProfile = async (clubId, volunteerId, updateData) => {
  const response = await api.put(`/clubs/${clubId}/volunteers/${volunteerId}`, updateData);
  return response.data;
};

export const updateVolunteerAvailability = async (clubId, volunteerId, availabilityData) => {
  const response = await api.patch(`/clubs/${clubId}/volunteers/${volunteerId}/availability`, availabilityData);
  return response.data;
};

export const toggleVolunteerCheckIn = async (clubId, volunteerId, checkInData) => {
  const response = await api.patch(`/clubs/${clubId}/volunteers/${volunteerId}/check-in`, checkInData);
  return response.data;
};

export const matchVolunteersWithAI = async (clubId, matchData) => {
  const response = await api.post(`/clubs/${clubId}/volunteers/ai-match`, matchData);
  return response.data;
};

export const assignVolunteerToTask = async (clubId, assignData) => {
  const response = await api.post(`/clubs/${clubId}/volunteers/assign`, assignData);
  return response.data;
};

// AI Staffing & Event Planning
export const getEventStaffingPlan = async (clubId, eventId) => {
  const response = await api.post(`/clubs/${clubId}/events/${eventId}/staffing-plan`);
  return response.data;
};

export const approveEventStaffingPlan = async (clubId, eventId, planData) => {
  const response = await api.post(`/clubs/${clubId}/events/${eventId}/approve-plan`, planData);
  return response.data;
};

// Kanban Board
export const getKanbanBoard = async (clubId, eventId = null) => {
  const params = eventId ? { event_id: eventId } : {};
  const response = await api.get(`/clubs/${clubId}/tasks/board`, { params });
  return response.data;
};

// Risk Radar
export const getEventRisks = async (eventId) => {
  const response = await api.get(`/risks`, { params: { event_id: eventId } });
  return response.data;
};

export const scanEventRisks = async (eventId) => {
  const response = await api.post(`/risks/scan`, null, { params: { event_id: eventId } });
  return response.data;
};

export const resolveRisk = async (riskId) => {
  const response = await api.patch(`/risks/${riskId}/resolve`, { status: 'RESOLVED' });
  return response.data;
};

// Meetings
export const getClubMeetings = async (clubId) => {
  const response = await api.get(`/meetings`, { params: { club_id: clubId } });
  return response.data;
};

export const createMeeting = async (clubId, meetingData) => {
  const response = await api.post(`/meetings`, meetingData, { params: { club_id: clubId } });
  return response.data;
};

export const convertActionItems = async (meetingId, actionItemIds) => {
  const response = await api.post(`/meetings/${meetingId}/convert-items`, { action_item_ids: actionItemIds });
  return response.data;
};

// Knowledge Base RAG
export const searchKnowledge = async (clubId, query) => {
  const response = await api.post(`/knowledge/search`, { query }, { params: { club_id: clubId } });
  return response.data;
};

export const uploadDocument = async (clubId, docData) => {
  const response = await api.post(`/knowledge/upload`, docData, { params: { club_id: clubId } });
  return response.data;
};

export const getClubDocuments = async (clubId) => {
  const response = await api.get(`/knowledge/documents`, { params: { club_id: clubId } });
  return response.data;
};

// AI Workflow Engine (LangGraph Orchestration)
export const executeAIWorkflow = async (clubId, workflowData) => {
  const response = await api.post(`/clubs/${clubId}/workflows/execute`, workflowData);
  return response.data;
};

// Announcements & Multi-Channel Broadcast
export const getClubAnnouncements = async (clubId, params = {}) => {
  const response = await api.get(`/clubs/${clubId}/announcements`, { params });
  return response.data;
};

export const generateAIAnnouncement = async (clubId, payload) => {
  const response = await api.post(`/clubs/${clubId}/announcements/generate-ai`, payload);
  return response.data;
};

export const createAnnouncement = async (clubId, payload) => {
  const response = await api.post(`/clubs/${clubId}/announcements`, payload);
  return response.data;
};

export const updateAnnouncement = async (clubId, announcementId, payload) => {
  const response = await api.put(`/clubs/${clubId}/announcements/${announcementId}`, payload);
  return response.data;
};

export const publishAnnouncement = async (clubId, announcementId, payload) => {
  const response = await api.post(`/clubs/${clubId}/announcements/${announcementId}/publish`, payload);
  return response.data;
};

export const deleteAnnouncement = async (clubId, announcementId) => {
  const response = await api.delete(`/clubs/${clubId}/announcements/${announcementId}`);
  return response.data;
};

// Role-Based Dashboards Suite
export const getDashboardMetrics = async (clubId, perspective = 'PRESIDENT') => {
  const response = await api.get(`/clubs/${clubId}/dashboard`, {
    params: { perspective },
  });
  return response.data;
};

export const volunteerCheckIn = async (clubId, status = 'CHECKED_IN', eventId = null) => {
  const response = await api.post(`/clubs/${clubId}/dashboard/check-in`, {
    status,
    event_id: eventId,
  });
  return response.data;
};

// Real-Time Collaboration Suite
export const getCollaborationChannels = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}/collaboration/channels`);
  return response.data;
};

export const getCollaborationMessages = async (clubId, channel = 'general', limit = 50) => {
  const response = await api.get(`/clubs/${clubId}/collaboration/messages`, {
    params: { channel, limit },
  });
  return response.data;
};

export const sendCollaborationMessage = async (clubId, payload) => {
  const response = await api.post(`/clubs/${clubId}/collaboration/messages`, payload);
  return response.data;
};

export const getCollaborationPresence = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}/collaboration/presence`);
  return response.data;
};

export const broadcastSystemActivity = async (clubId, payload) => {
  const response = await api.post(`/clubs/${clubId}/collaboration/broadcast-activity`, payload);
  return response.data;
};

// Operations Analytics & Insights Suite
export const getAnalyticsOverview = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}/analytics/overview`);
  return response.data;
};

export const getAIExecutiveInsights = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}/analytics/ai-insights`);
  return response.data;
};

export const downloadAnalyticsReport = async (clubId) => {
  const response = await api.get(`/clubs/${clubId}/analytics/export`, {
    responseType: 'blob',
  });
  return response.data;
};

export default api;



