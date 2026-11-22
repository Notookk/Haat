import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  type UserRole,
  type SellerOnboardingInput,
  type SellerStatus,
  SOCKET_EVENTS,
  type SellerStatusChangedPayload,
} from '@haat/shared-contracts';
import { api, setAccessToken, getAccessToken, createSocketClient, showToast } from '@haat/shared-frontend';

export interface SellerUser {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  role: UserRole;
}

export interface SellerStoreProfile {
  id: string;
  storeName: string;
  storeSlug: string;
  storeAddress?: string | null;
  status: SellerStatus;
  statusReason?: string | null;
  blockedReason?: string | null;
  approvalNotes?: string | null;
  approvedAt?: string | null;
  isVerified: boolean;
  isActive: boolean;
  description?: string | null;
  gstin?: string;
  panNumber?: string;
  bankAccountName?: string;
  bankAccountNo?: string | null;
  bankIfscCode?: string;
  servicePincodes?: string[];
  createdAt?: string;
}

interface SellerAuthContextValue {
  user: SellerUser | null;
  seller: SellerStoreProfile | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  login: (credentials: { identifier: string; password: string }) => Promise<void>;
  register: (data: { fullName: string; phoneNumber: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  onboardStore: (input: SellerOnboardingInput) => Promise<void>;
  resubmitApplication: (input: SellerOnboardingInput) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const SellerAuthContext = createContext<SellerAuthContextValue | null>(null);

export function SellerAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SellerUser | null>(null);
  const [seller, setSeller] = useState<SellerStoreProfile | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const reloadProfile = async () => {
    try {
      const response = await api.get<{ user: SellerUser; seller: SellerStoreProfile | null }>('/api/v1/seller/auth/me');
      if (response.data) {
        setUser(response.data.user);
        setSeller(response.data.seller);
      }
    } catch {
      // ignore
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_seller_refresh_token') : null;
      const response = await api.post<{
        user: SellerUser;
        seller: SellerStoreProfile | null;
        accessToken: string;
        refreshToken?: string;
      }>('/api/v1/seller/auth/refresh', storedToken ? { refreshToken: storedToken } : {}, true);
      if (response.data && response.data.accessToken) {
        setAccessToken(response.data.accessToken);
        setUser(response.data.user);
        setSeller(response.data.seller);
        if (response.data.refreshToken) {
          localStorage.setItem('haat_seller_refresh_token', response.data.refreshToken);
        }
        setStatus('authenticated');
        return true;
      }
      setAccessToken(null);
      setUser(null);
      setSeller(null);
      localStorage.removeItem('haat_seller_refresh_token');
      setStatus('unauthenticated');
      return false;
    } catch {
      setAccessToken(null);
      setUser(null);
      setSeller(null);
      localStorage.removeItem('haat_seller_refresh_token');
      setStatus('unauthenticated');
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_seller_refresh_token') : null;
        const response = await api.post<{
          user: SellerUser;
          seller: SellerStoreProfile | null;
          accessToken: string;
          refreshToken?: string;
        }>('/api/v1/seller/auth/refresh', storedToken ? { refreshToken: storedToken } : {}, true);
        if (mounted && response.data && response.data.accessToken) {
          setAccessToken(response.data.accessToken);
          setUser(response.data.user);
          setSeller(response.data.seller);
          if (response.data.refreshToken) {
            localStorage.setItem('haat_seller_refresh_token', response.data.refreshToken);
          }
          setStatus('authenticated');
        } else if (mounted) {
          setAccessToken(null);
          setUser(null);
          setSeller(null);
          localStorage.removeItem('haat_seller_refresh_token');
          setStatus('unauthenticated');
        }
      } catch {
        if (mounted) {
          setAccessToken(null);
          setUser(null);
          setSeller(null);
          localStorage.removeItem('haat_seller_refresh_token');
          setStatus('unauthenticated');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: { identifier: string; password: string }) => {
    const response = await api.post<{
      user: SellerUser;
      seller: SellerStoreProfile | null;
      accessToken: string;
      refreshToken?: string;
    }>('/api/v1/seller/auth/login', credentials);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    setSeller(response.data.seller);
    if (response.data.refreshToken) {
      localStorage.setItem('haat_seller_refresh_token', response.data.refreshToken);
    }
    setStatus('authenticated');
  };

  const register = async (data: { fullName: string; phoneNumber: string; email: string; password: string }) => {
    const response = await api.post<{
      user: SellerUser;
      seller: SellerStoreProfile | null;
      accessToken: string;
      refreshToken?: string;
    }>('/api/v1/seller/auth/register', data);
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
    setSeller(response.data.seller);
    if (response.data.refreshToken) {
      localStorage.setItem('haat_seller_refresh_token', response.data.refreshToken);
    }
    setStatus('authenticated');
  };

  const logout = async () => {
    try {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('haat_seller_refresh_token') : null;
      await api.post('/api/v1/seller/auth/logout', storedToken ? { refreshToken: storedToken } : {});
    } finally {
      setAccessToken(null);
      setUser(null);
      setSeller(null);
      localStorage.removeItem('haat_seller_refresh_token');
      setStatus('unauthenticated');
    }
  };

  const onboardStore = async (input: SellerOnboardingInput) => {
    const response = await api.post<{ seller: SellerStoreProfile }>('/api/v1/seller/profile/onboard', input);
    setSeller(response.data.seller);
  };

  const resubmitApplication = async (input: SellerOnboardingInput) => {
    const response = await api.post<{ seller: SellerStoreProfile }>('/api/v1/seller/profile/resubmit', input);
    setSeller(response.data.seller);
    showToast.success('Application Resubmitted', 'Your store application has been sent for administrative review.');
  };

  // Real-time status propagation via authenticated Socket.IO channel
  useEffect(() => {
    if (status !== 'authenticated' || !seller) return;

    const token = getAccessToken();
    const socket = createSocketClient({
      token,
      onConnect: () => {
        // Authenticated connection established to private seller channel
      },
      onReconnect: () => {
        // Authoritative reconciliation after connection restoration
        void reloadProfile();
      },
    });

    // 1. Direct Approval Event
    socket.on(SOCKET_EVENTS.SELLER_APPROVED, () => {
      setSeller((prev) => (prev ? { ...prev, status: 'ACTIVE', isActive: true, isVerified: true } : null));
      showToast.success('Store Approved!', 'Your store has been approved for active operations.');
      void reloadProfile();
    });

    // 2. Direct Blocking Event
    socket.on(SOCKET_EVENTS.SELLER_BLOCKED, (data: SellerStatusChangedPayload) => {
      setSeller((prev) => (prev ? { ...prev, status: 'BLOCKED', isActive: false, blockedReason: data.reason } : null));
      showToast.error('Store Suspended', data.reason || 'Your seller account has been blocked by administration.');
    });

    // 3. General Status Transition Event
    socket.on(SOCKET_EVENTS.SELLER_STATUS_CHANGED, (data: SellerStatusChangedPayload) => {
      setSeller((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: data.newStatus,
          isActive: data.newStatus === 'ACTIVE',
          isVerified: data.newStatus === 'ACTIVE' ? true : prev.isVerified,
          statusReason: data.reason || prev.statusReason,
          blockedReason: data.newStatus === 'BLOCKED' ? data.reason || prev.blockedReason : null,
        };
      });

      if (data.newStatus === 'ACTIVE') {
        showToast.success('Account Activated', 'Your seller account has been activated.');
        void reloadProfile();
      } else if (data.newStatus === 'BLOCKED') {
        showToast.error('Account Suspended', data.reason || 'Your seller account has been blocked.');
      } else if (data.newStatus === 'REJECTED') {
        showToast.error('Application Rejected', data.reason || 'Your seller application was not approved.');
      }
    });

    // Real-time catalog & category sync for seller console
    socket.on(SOCKET_EVENTS.CATEGORY_CREATED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'categories'] });
    });
    socket.on(SOCKET_EVENTS.CATEGORY_UPDATED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'categories'] });
    });
    socket.on(SOCKET_EVENTS.CATEGORY_DELETED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'categories'] });
    });
    socket.on(SOCKET_EVENTS.PRODUCT_CREATED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard'] });
    });
    socket.on(SOCKET_EVENTS.PRODUCT_UPDATED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard'] });
    });
    socket.on(SOCKET_EVENTS.PRODUCT_DELETED, () => {
      void queryClient.invalidateQueries({ queryKey: ['seller', 'products'] });
      void queryClient.invalidateQueries({ queryKey: ['seller', 'dashboard'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [status, seller?.id, queryClient]);

  return (
    <SellerAuthContext.Provider
      value={{
        user,
        seller,
        status,
        login,
        register,
        logout,
        refreshSession,
        onboardStore,
        resubmitApplication,
        reloadProfile,
      }}
    >
      {children}
    </SellerAuthContext.Provider>
  );
}

export function useSellerAuth() {
  const context = useContext(SellerAuthContext);
  if (!context) {
    return {
      user: null,
      seller: null,
      status: 'loading' as const,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      refreshSession: async () => false,
      onboardStore: async () => {},
      resubmitApplication: async () => {},
      reloadProfile: async () => {},
    };
  }
  return context;
}
