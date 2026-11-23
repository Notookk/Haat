import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserRole } from '@haat/shared-contracts';
import { api, setAccessToken } from '@haat/shared-frontend';

export interface AdminUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const refreshSession = async (): Promise<boolean> => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_admin_refresh_token') : null;
      const response = await api.post<{ user: AdminUser; accessToken: string; refreshToken?: string }>(
        '/api/v1/admin/auth/refresh',
        storedToken ? { refreshToken: storedToken } : {},
        true,
      );
      if (response.data && response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        if (response.data.refreshToken) {
          localStorage.setItem('haat_admin_refresh_token', response.data.refreshToken);
        }
        setStatus('authenticated');
        return true;
      }
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('haat_admin_refresh_token');
      setStatus('unauthenticated');
      return false;
    } catch {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('haat_admin_refresh_token');
      setStatus('unauthenticated');
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      // Attempt session restoration via HttpOnly rotating refresh cookie or localStorage fallback
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_admin_refresh_token') : null;
        const response = await api.post<{ user: AdminUser; accessToken: string; refreshToken?: string }>(
          '/api/v1/admin/auth/refresh',
          storedToken ? { refreshToken: storedToken } : {},
          true,
        );
        if (mounted && response.data && response.data.accessToken) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user);
          if (response.data.refreshToken) {
            localStorage.setItem('haat_admin_refresh_token', response.data.refreshToken);
          }
          setStatus('authenticated');
        } else if (mounted) {
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem('haat_admin_refresh_token');
          setStatus('unauthenticated');
        }
      } catch {
        if (mounted) {
          setAccessToken(null);
          setUser(null);
          localStorage.removeItem('haat_admin_refresh_token');
          setStatus('unauthenticated');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: { identifier: string; password: string }) => {
    const response = await api.post<{ user: AdminUser; accessToken: string; refreshToken?: string }>(
      '/api/v1/admin/auth/login',
      credentials,
      true,
    );
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    if (response.data.refreshToken) {
      localStorage.setItem('haat_admin_refresh_token', response.data.refreshToken);
    }
    setStatus('authenticated');
  };

  const logout = async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_admin_refresh_token') : null;
      await api.post('/api/v1/admin/auth/logout', storedToken ? { refreshToken: storedToken } : {}, true);
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem('haat_admin_refresh_token');
      setStatus('unauthenticated');
    }
  };

  return (
    <AdminAuthContext.Provider value={{ user, status, login, logout, refreshSession }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    return {
      user: null,
      status: 'loading' as const,
      login: async () => {},
      logout: async () => {},
      refreshSession: async () => false,
    };
  }
  return context;
}
