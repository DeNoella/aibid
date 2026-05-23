'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst';
  subscriptionStatus: 'free_trial' | 'premium';
  avatarUrl?: string | null;
  profileSetupCompleted?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, organization?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
  setSession: (token: string) => Promise<User | null>;
  updateUser: (partial: Partial<User>) => void;
}

function setAuthCookie(token: string) {
  document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

function clearAuthCookie() {
  document.cookie = 'auth_token=; path=/; max-age=0';
}

function getAuthCookieToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function mapUser(userData: {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst';
  subscriptionStatus?: 'free_trial' | 'premium';
  avatarUrl?: string | null;
  profileSetupCompleted?: boolean;
}): User {
  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    subscriptionStatus: userData.subscriptionStatus ?? 'free_trial',
    avatarUrl: userData.avatarUrl ?? null,
    profileSetupCompleted: userData.profileSetupCompleted ?? false,
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = useCallback(async (): Promise<User | null> => {
    try {
      const userData = await api.get<{
        id: string;
        name: string;
        email: string;
        role: 'admin' | 'analyst';
        subscriptionStatus?: 'free_trial' | 'premium';
        avatarUrl?: string | null;
        profileSetupCompleted?: boolean;
      }>('/auth/me');
      const mapped = mapUser(userData);
      setUser(mapped);
      return mapped;
    } catch {
      localStorage.removeItem('auth_token');
      clearAuthCookie();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('auth_token') ?? getAuthCookieToken();
    if (token) {
      void loadUser();
    } else {
      setLoading(false);
    }
  }, [loadUser]);

  const refreshUser = async () => {
    setLoading(true);
    await loadUser();
  };

  const setSession = async (token: string): Promise<User | null> => {
    localStorage.setItem('auth_token', token);
    setAuthCookie(token);
    setLoading(true);
    return loadUser();
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...partial } : current));
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await api.post<{ token?: string; user?: User; mfaRequired?: boolean; attemptId?: string }>('/auth/login', { email, password });
      if (result?.token && result?.user) {
        await setSession(result.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const register = async (name: string, email: string, password: string, organization?: string): Promise<void> => {
    const result = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password, organization });
    localStorage.setItem('auth_token', result.token);
    setAuthCookie(result.token);
    setUser(mapUser(result.user));
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    clearAuthCookie();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      loading,
      refreshUser,
      setSession,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
