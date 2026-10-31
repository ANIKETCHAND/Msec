/**
 * Authentication and RBAC Domain Hook.
 * Encapsulates authentication state, role switching, login and logout business logic.
 */

import { useState, useCallback } from 'react';
import { authApi } from '../api';
import { STORAGE_KEYS, USER_ROLES } from '../constants/appConstants';

export const DEMO_USERS = {
  admin: {
    name: "Dr. Marcus Vance",
    email: "admin@medishield.local",
    role: USER_ROLES.ADMIN,
    title: "Chief IoMT Security Officer",
    avatar: "MV",
    password: "adminpassword123"
  },
  analyst: {
    name: "Sarah Chen",
    email: "analyst@medishield.local",
    role: USER_ROLES.ANALYST,
    title: "Lead SOC Cyber Analyst",
    avatar: "SC",
    password: "analystpassword123"
  },
  doctor: {
    name: "Dr. Elena Rostova",
    email: "doctor@medishield.local",
    role: USER_ROLES.DOCTOR,
    title: "Attending ICU Physician",
    avatar: "ER",
    password: "doctorpassword123"
  }
};

export function useAuth() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEMO_USERS.analyst;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email, password);
      // Determine user profile
      const foundDemo = Object.values(DEMO_USERS).find(u => u.email === email);
      const userObj = foundDemo || {
        name: email.split('@')[0],
        email,
        role: res.role || USER_ROLES.ANALYST,
        title: 'SOC Security Analyst',
        avatar: email.slice(0, 2).toUpperCase()
      };
      setCurrentUser(userObj);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(userObj));
      return userObj;
    } catch (err) {
      setError(err.message || 'Login failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.warn('[useAuth] Logout notice:', err.message);
    } finally {
      setCurrentUser(null);
      localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
  }, []);

  const switchUserRole = useCallback(async (roleKey) => {
    const demo = DEMO_USERS[roleKey];
    if (!demo) return;
    try {
      await authApi.login(demo.email, demo.password || 'analystpassword123');
      setCurrentUser(demo);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(demo));
    } catch (err) {
      console.warn('[useAuth] Role switch login notice, setting locally:', err.message);
      setCurrentUser(demo);
      localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(demo));
    }
  }, []);

  return {
    currentUser,
    setCurrentUser,
    login,
    logout,
    switchUserRole,
    loading,
    error,
    isAuthenticated: Boolean(currentUser)
  };
}

export default useAuth;
