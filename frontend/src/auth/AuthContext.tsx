import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { authApi } from "../api/endpoints";
import { setAccessToken, setUnauthorizedHandler } from "../api/client";
import type { AuthUser } from "../api/types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);


  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,

      login: async (email, password) => {
        setIsLoading(true);
        try {
          const res = await authApi.login(email, password);
          setAccessToken(res.data.accessToken);
          setUser(res.data.staff);
        } finally {
          setIsLoading(false);
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          setUser(null);
        }
      }
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}