import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // In-flight promise ref to prevent redundant concurrent calls to /api/auth/me
  const inFlightCheckRef = useRef(null);

  // Check existing session on mount
  const checkAuth = useCallback(async () => {
    // If a session check is already pending, return the existing promise
    if (inFlightCheckRef.current) {
      return inFlightCheckRef.current;
    }

    const checkPromise = (async () => {
      setLoading(true);
      setAuthError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Send HTTP-only session cookie
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
            return { success: true, user: data.user };
          }
        }

        // 401 or any non-200 response is a normal unauthenticated state
        setUser(null);
        return { success: false, user: null };
      } catch (err) {
        // Network or server unreachable — log diagnostic, don't crash
        console.warn('Session check failed or unauthenticated:', err.message);
        setUser(null);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        inFlightCheckRef.current = null;
      }
    })();

    inFlightCheckRef.current = checkPromise;
    return checkPromise;
  }, []);

  useEffect(() => {
    let isMounted = true;
    checkAuth().then(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [checkAuth]);

  // Register user
  const register = useCallback(async ({ name, email, password }) => {
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Registration failed. Please try again.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // Login user
  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Invalid email or password.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // Logout user
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout request warning:', err.message);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  }, []);

  // Google OAuth login — credential is the ID token from Google Identity Services
  const loginWithGoogle = useCallback(async (credential) => {
    setAuthError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Google login failed. Please try again.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setAuthError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      register,
      login,
      loginWithGoogle,
      logout,
      checkAuth,
    }),
    [user, loading, authError, register, login, loginWithGoogle, logout, checkAuth]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
