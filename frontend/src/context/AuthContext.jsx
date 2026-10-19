import { useState, useEffect } from 'react';
import { AuthContext } from './auth-context-base';
import { authApi } from '../services/authApi';

export function AuthProvider({ children }) {
  // In-memory state only - no tokens or passwords stored in localStorage/sessionStorage
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Attempt to verify any existing cookie session on initial mount
   */
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const response = await authApi.getProfile(token);
        if (isMounted && response && response.user) {
          setUser(prev => ({
            ...prev,
            id: response.user.id,
            role: response.user.role,
          }));
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [token]);

  /**
   * Log in user
   */
  const login = async (email, password) => {
    const data = await authApi.login({ email, password });
    if (data.token) {
      setToken(data.token);
    }
    if (data.user) {
      setUser(data.user);
    }
    return data;
  };

  /**
   * Register user
   */
  const signup = async ({ name, email, password, role }) => {
    return authApi.signup({ name, email, password, role });
  };

  /**
   * Log out user
   */
  const logout = async () => {
    try {
      if (token) {
        await authApi.logout(token);
      }
    } catch (err) {
      console.warn('[AuthContext] Server logout failed or token already invalid:', err.message);
    } finally {
      // Always clear client-side state
      setToken(null);
      setUser(null);
    }
  };

  /**
   * Refresh profile data from backend
   */
  const refreshProfile = async () => {
    if (!token) return null;
    try {
      const response = await authApi.getProfile(token);
      if (response && response.user) {
        setUser(prev => ({
          ...prev,
          id: response.user.id,
          role: response.user.role,
        }));
      }
      return response;
    } catch (err) {
      if (err.status === 401) {
        setToken(null);
        setUser(null);
      }
      throw err;
    }
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    isLoading,
    login,
    signup,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
