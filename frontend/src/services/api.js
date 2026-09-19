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

// Club Management
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

export default api;
