import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, getUserClubs, loginUser, signupUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [activeClub, setActiveClub] = useState(null);
  const [activeRole, setActiveRole] = useState('PRESIDENT');
  const [token, setToken] = useState(() => localStorage.getItem('clubops_token'));
  const [loading, setLoading] = useState(true);

  // Refresh profile & clubs whenever token changes
  const fetchProfile = async () => {
    const currentToken = localStorage.getItem('clubops_token');
    if (!currentToken) {
      setUser(null);
      setClubs([]);
      setActiveClub(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userRes = await getCurrentUser();
      const userData = userRes.data;
      setUser(userData);

      const clubsRes = await getUserClubs();
      const userClubs = clubsRes.data || [];
      setClubs(userClubs);

      const normalizeRole = (r) => {
        if (!r) return 'CLUB_HEAD';
        const up = r.toUpperCase();
        return up === 'ORGANIZER' ? 'CLUB_HEAD' : up;
      };

      if (userClubs.length > 0) {
        // Keep active club or default to first
        const currentActive = await new Promise(resolve => {
          setActiveClub((prev) => {
            const kept = prev && userClubs.some((c) => c.id === prev.id) ? prev : userClubs[0];
            resolve(kept);
            return kept;
          });
        });
        // Set role from the actual active club
        const activeClubData = userClubs.find(c => c.id === currentActive?.id) || userClubs[0];
        setActiveRole(normalizeRole(activeClubData.user_role));
      } else {
        setActiveRole(normalizeRole(userData.active_role));
      }
    } catch (err) {
      console.warn('Session expired or error fetching profile:', err);
      localStorage.removeItem('clubops_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const login = async (email, password) => {
    const res = await loginUser(email, password);
    const accessToken = res.data.access_token;
    localStorage.setItem('clubops_token', accessToken);
    setToken(accessToken);
    await fetchProfile();
    return res.data;
  };

  const signup = async (userData) => {
    const res = await signupUser(userData);
    const accessToken = res.data.access_token;
    localStorage.setItem('clubops_token', accessToken);
    setToken(accessToken);
    await fetchProfile();
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('clubops_token');
    setToken(null);
    setUser(null);
    setClubs([]);
    setActiveClub(null);
    setActiveRole('PRESIDENT');
  };

  const switchClub = (club) => {
    setActiveClub(club);
    if (club.user_role) {
      const up = club.user_role.toUpperCase();
      setActiveRole(up === 'ORGANIZER' ? 'CLUB_HEAD' : up);
    }
  };

  const switchRole = (role) => {
    setActiveRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        clubs,
        activeClub,
        activeRole,
        loading,
        login,
        signup,
        logout,
        switchClub,
        switchRole,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
