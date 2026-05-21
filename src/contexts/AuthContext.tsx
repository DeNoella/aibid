'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst';
  subscriptionStatus: 'free_trial' | 'premium';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, organization?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadUser = async () => {
    try {
      const userData = await api.get<{ id: string; name: string; email: string; role: 'admin' | 'analyst'; subscriptionStatus: 'free_trial' | 'premium' }>('/auth/me');
      setUser({ id: userData.id, name: userData.name, email: userData.email, role: userData.role, subscriptionStatus: userData.subscriptionStatus ?? 'free_trial' });
    } catch {
      localStorage.removeItem('auth_token');
      clearAuthCookie();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token') ?? getAuthCookieToken();
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    await loadUser();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const result = await api.post<{ token?: string; user?: User; mfaRequired?: boolean; attemptId?: string }>('/auth/login', { email, password });
      if (result?.token && result?.user) {
        localStorage.setItem('auth_token', result.token);
        setAuthCookie(result.token);
        setUser(result.user);
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
    setUser({ ...result.user, subscriptionStatus: result.user.subscriptionStatus ?? 'free_trial' });
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
      refreshUser
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
