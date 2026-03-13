import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { apiPost, apiGet, type User, type UserRole } from '@/lib/api';
import { FRONTEND_PERMISSIONS } from '@/lib/permissions';

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
  hasPermission: (permission: string) => boolean;
  isRole: (...roles: UserRole[]) => boolean;
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
    if (t === 'demo-token') {
      const fakeUser: User = {
        id: 'demo-user-id',
        email: 'demo@example.com',
        role: 'admin',
        nameAr: 'عرض تجريبي',
        nameEn: 'Demo User',
        phone: null,
        isActive: true,
      };
      setState((s) => ({ ...s, user: fakeUser, token: t, ready: true }));
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
    const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';
    if (isDemo) {
      const fakeToken = 'demo-token';
      const fakeUser: User = {
        id: 'demo-user-id',
        email: email || 'demo@example.com',
        role: 'admin',
        nameAr: 'عرض تجريبي',
        nameEn: 'Demo User',
        phone: null,
        isActive: true,
      };
      localStorage.setItem('token', fakeToken);
      setState({ user: fakeUser, token: fakeToken, ready: true });
      return;
    }
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

  const hasPermission = useCallback(
    (permission: string): boolean => {
      const role = state.user?.role;
      if (!role) return false;
      return FRONTEND_PERMISSIONS[permission]?.includes(role) ?? false;
    },
    [state.user?.role]
  );

  const isRole = useCallback(
    (...roles: UserRole[]): boolean => {
      const role = state.user?.role;
      if (!role) return false;
      return roles.includes(role);
    },
    [state.user?.role]
  );

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        ready: state.ready,
        login,
        logout,
        refreshUser,
        hasPermission,
        isRole,
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
