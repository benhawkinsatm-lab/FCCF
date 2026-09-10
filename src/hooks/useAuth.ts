import { useCallback, useEffect, useState } from 'react';

export type UserRole = 'admin' | 'readonly';

interface AuthState {
  loading: boolean;
  // Whether the server has ADMIN_PASSWORD / READONLY_PASSWORD configured at
  // all. When false, auth is inert (legacy/local deployments keep working
  // exactly as before, unauthenticated) and the app renders normally.
  authConfigured: boolean;
  role: UserRole | null;
}

// Session-cookie auth against the minimal server-side implementation in
// server.ts (/api/auth/login, /api/auth/logout, /api/auth/session). Polls
// nothing -- the cookie is httpOnly and the session is re-checked on mount
// and after every login/logout action.
export function useAuth() {
  const [state, setState] = useState<AuthState>({ loading: true, authConfigured: false, role: null });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
      const data = await res.json();
      setState({
        loading: false,
        authConfigured: Boolean(data.authConfigured),
        role: data.role || null,
      });
    } catch (err) {
      console.warn('Failed to check auth session:', err);
      // Fail open: if the session check itself is unreachable, treat auth as
      // unconfigured rather than locking the user out of an app that may
      // simply not have this feature deployed yet.
      setState({ loading: false, authConfigured: false, role: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Incorrect password.');
        setIsLoggingIn(false);
        return false;
      }
      setState({ loading: false, authConfigured: true, role: data.role });
      setIsLoggingIn(false);
      return true;
    } catch (err) {
      console.warn('Login request failed:', err);
      setLoginError('Could not reach the server. Please try again.');
      setIsLoggingIn(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (err) {
      console.warn('Logout request failed:', err);
    }
    setState(prev => ({ ...prev, role: null }));
  }, []);

  return { ...state, loginError, isLoggingIn, login, logout };
}
