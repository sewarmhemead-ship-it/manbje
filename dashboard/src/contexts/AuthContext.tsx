import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { apiPost, apiGet, type User } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
}

const AuthContext = createContext<{
  user: User | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    ready: false,
  });

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem('token');
    if (!t) {
      setState((s) => ({ ...s, user: null, ready: true }));
      return;
    }
    try {
      const user = await apiGet<User>('/auth/me');
      setState((s) => ({ ...s, user, token: t, ready: true }));
    } catch {
      localStorage.removeItem('token');
      setState((s) => ({ ...s, user: null, token: null, ready: true }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user, accessToken } = await apiPost<{ user: User; accessToken: string }>(
      '/auth/login',
      { email, password }
    );
    localStorage.setItem('token', accessToken);
    setState({ user, token: accessToken, ready: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setState((s) => ({ ...s, user: null, token: null }));
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        ready: state.ready,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
