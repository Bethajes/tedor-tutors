'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PublicUser, RegisterRequest, UserRole } from '@tedor/types';
import { api } from './api';
import { tokenStorage } from './token-storage';

export const ROLE_HOME: Record<UserRole, string> = {
  CLIENT: '/dashboard',
  TUTOR: '/dashboard',
  COORDINATOR: '/dashboard',
  ADMIN: '/admin',
  SUPER_ADMIN: '/admin',
};

interface AuthContextValue {
  user: PublicUser | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (input: RegisterRequest) => Promise<PublicUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.getAccessToken()) {
      setUser(null);
      return;
    }
    try {
      const current = await api.me();
      setUser(current);
    } catch {
      tokenStorage.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setInitializing(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string): Promise<PublicUser> => {
    const result = await api.login({ email, password });
    tokenStorage.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (input: RegisterRequest): Promise<PublicUser> => {
    const result = await api.register(input);
    tokenStorage.setTokens(result.tokens.accessToken, result.tokens.refreshToken);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      await api.logout(refreshToken).catch(() => undefined);
    }
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, initializing, login, register, logout, refreshUser }),
    [user, initializing, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}