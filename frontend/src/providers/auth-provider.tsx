'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadSession, saveSession, clearSession } from '@/lib/auth';
import type { User } from '@/lib/types';
import { me } from '@/lib/auth';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider is missing');
  return v;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ user, ready }, setState] = useState<{ user: User | null; ready: boolean }>({
    user: null,
    ready: false,
  });

  useEffect(() => {
    const { user } = loadSession();
    setState({ user, ready: true });
  }, []);

  const setSession = useCallback ((token: string, user: User) => {
    saveSession(token, user);
    setState({ user, ready: true });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setState({ user: null, ready: true });
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const u = await me();
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token) saveSession(token, u);
      setState({ user: u, ready: true });
    } catch {
      logout();
    }
  }, [logout]);

  const value = useMemo(() => ({ user, ready, setSession, logout, refreshMe }), [user, ready, setSession, logout, refreshMe]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
