import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  refreshAccessToken,
  registerRequest,
} from '../../lib/api-client';
import type { PublicUser, SellerProfile } from '../../lib/types';

type Status = 'booting' | 'authenticated' | 'anonymous';

interface AuthState {
  status: Status;
  user: PublicUser | null;
  seller: SellerProfile | null;
}

interface AuthContextValue extends AuthState {
  isSeller: boolean;
  login: (identifier: string, password: string) => Promise<PublicUser>;
  register: (input: {
    fullName: string;
    phoneNumber: string;
    email?: string;
    password: string;
    role: 'BUYER' | 'SELLER';
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  /** Re-reads /auth/me — used after onboarding upgrades a buyer to a seller. */
  reloadMe: () => Promise<void>;
  /** Rotates the refresh cookie and re-reads the session, picking up a new role. */
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ANONYMOUS: AuthState = { status: 'anonymous', user: null, seller: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'booting', user: null, seller: null });

  const loadMe = useCallback(async (): Promise<boolean> => {
    try {
      const me = await fetchMe();
      setState({ status: 'authenticated', user: me.user, seller: me.seller });
      return true;
    } catch {
      setState(ANONYMOUS);
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await refreshAccessToken();
      if (cancelled) return;
      if (!session) {
        setState(ANONYMOUS);
        return;
      }
      await loadMe();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const payload = await loginRequest(identifier, password);
      setState({ status: 'authenticated', user: payload.user, seller: null });
      await loadMe();
      return payload.user;
    },
    [loadMe],
  );

  const register = useCallback(
    async (input: { fullName: string; phoneNumber: string; email?: string; password: string; role: 'BUYER' | 'SELLER' }) => {
      const payload = await registerRequest(input);
      setState({ status: 'authenticated', user: payload.user, seller: null });
      await loadMe();
      return payload.user;
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setState(ANONYMOUS);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await refreshAccessToken();
    if (!session) {
      setState(ANONYMOUS);
      return false;
    }
    return loadMe();
  }, [loadMe]);

  const reloadMe = useCallback(async () => {
    await loadMe();
  }, [loadMe]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isSeller: Boolean(state.seller),
      login,
      register,
      logout,
      reloadMe,
      refreshSession,
    }),
    [state, login, register, logout, reloadMe, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
