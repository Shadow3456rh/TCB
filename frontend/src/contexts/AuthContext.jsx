/**
 * AuthContext — Manages authentication state.
 * Optimized: uses cached profile, non-blocking backend sync.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// Simple local cache to avoid re-fetching profile every page load
const PROFILE_KEY = 'rbu_user_profile';
const getCachedProfile = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; }
};
const setCachedProfile = (profile) => {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
};
const clearCachedProfile = () => {
  try { localStorage.removeItem(PROFILE_KEY); } catch {}
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Use cached profile first for instant UI
        const cached = getCachedProfile();
        if (cached && cached.uid === fbUser.uid) {
          setUser(cached);
          setLoading(false);

          // Background sync with backend (don't block UI)
          authAPI.getProfile().then(({ data }) => {
            const fresh = {
              uid: fbUser.uid, email: fbUser.email,
              name: data.name || fbUser.displayName || 'User',
              role: data.role || cached.role || 'student',
              institution: data.institution || '',
            };
            setUser(fresh);
            setCachedProfile(fresh);
          }).catch(() => { /* keep using cached */ });

        } else {
          // No cache — fetch from backend
          try {
            const { data } = await authAPI.getProfile();
            const profile = {
              uid: fbUser.uid, email: fbUser.email,
              name: data.name || fbUser.displayName || 'User',
              role: data.role || 'student',
              institution: data.institution || '',
            };
            setUser(profile);
            setCachedProfile(profile);
          } catch {
            const fallback = {
              uid: fbUser.uid, email: fbUser.email,
              name: fbUser.displayName || 'User',
              role: 'student', institution: '',
            };
            setUser(fallback);
            setCachedProfile(fallback);
          }
          setLoading(false);
        }
      } else {
        setUser(null);
        clearCachedProfile();
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    try {
      const { data } = await authAPI.getProfile();
      const profile = {
        uid: cred.user.uid, email: cred.user.email,
        name: data.name || cred.user.displayName || 'User',
        role: data.role || 'student',
        institution: data.institution || '',
      };
      setUser(profile);
      setCachedProfile(profile);
    } catch {
      const fallback = {
        uid: cred.user.uid, email: cred.user.email,
        name: cred.user.displayName || 'User',
        role: 'student', institution: '',
      };
      setUser(fallback);
      setCachedProfile(fallback);
    }

    return cred.user;
  }, []);

  const register = useCallback(async (email, password, name, role, institution) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Register with backend (don't block on failure)
    try { await authAPI.register({ email, password, name, role, institution }); }
    catch { /* backend might not be available */ }

    const profile = { uid: cred.user.uid, email, name, role, institution: institution || '' };
    setUser(profile);
    setCachedProfile(profile);

    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    clearCachedProfile();
  }, []);

  const value = {
    user, firebaseUser, loading,
    login, register, logout,
    isAuthenticated: !!user,
    isEducator: user?.role === 'educator',
    isStudent: user?.role === 'student',
    isAdmin: user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export default AuthContext;
