import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { api, setRefreshAccessToken } from '../api/client';

interface SessionUser {
  userId: string;
  email: string;
  role: 'Researcher' | 'Reviewer' | 'Admin';
}

interface AuthContextValue {
  user: SessionUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let refreshInFlight: Promise<string> | null = null;

function decodeJwtPayload(token: string): { sub: string; email: string; role: SessionUser['role'] } | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyAccessToken = (token: string) => {
    const payload = decodeJwtPayload(token);
    if (!payload?.sub || !payload.email || !payload.role) throw new Error('Invalid access token');
    setAccessToken(token);
    setUser({ userId: payload.sub, email: payload.email, role: payload.role });
  };

  useEffect(() => {
    let active = true;

    const renew = async () => {
      if (refreshInFlight) {
        return refreshInFlight.then((token) => {
          if (active) applyAccessToken(token);
          return token;
        });
      }
      refreshInFlight = api.refresh().then((tokens) => {
        if (!active) return tokens.accessToken;
        applyAccessToken(tokens.accessToken);
        return tokens.accessToken;
      }).catch((error) => {
        if (active) {
          setAccessToken(null);
          setUser(null);
        }
        throw error;
      }).finally(() => { refreshInFlight = null; });
      return refreshInFlight;
    };

    setRefreshAccessToken(renew);
    renew().finally(() => { if (active) setIsLoading(false); });
    return () => {
      active = false;
      setRefreshAccessToken(null);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const tokens = await api.login(email, password);
    applyAccessToken(tokens.accessToken);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // best-effort; still clear local state
    }
    setAccessToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, accessToken, isLoading, login, logout }), [user, accessToken, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
