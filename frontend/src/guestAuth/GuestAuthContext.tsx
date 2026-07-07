import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { guestAuthApi, type GuestProfile } from "../api/guestEndpoints";
import { setGuestAccessToken, setGuestUnauthorizedHandler } from "../api/guestClient";

interface GuestAuthContextValue {
  guest: GuestProfile | null;
  isLoading: boolean;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const GuestAuthContext = createContext<GuestAuthContextValue | null>(null);

export function GuestAuthProvider({ children }: { children: ReactNode }) {
  const [guest, setGuest] = useState<GuestProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setGuestUnauthorizedHandler(() => setGuest(null));
    (async () => {
      try {
        const res = await fetch("/api/guest-auth/refresh", { method: "POST", credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setGuestAccessToken(data.accessToken);
          const me = await guestAuthApi.me();
          setGuest(me.data.guest);
        }
      } catch {
        // No valid session; guest needs to log in.
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const value = useMemo<GuestAuthContextValue>(
    () => ({
      guest,
      isLoading,
      register: async (fullName, email, password) => {
        const res = await guestAuthApi.register(fullName, email, password);
        setGuestAccessToken(res.data.accessToken);
        setGuest(res.data.guest);
      },
      login: async (email, password) => {
        const res = await guestAuthApi.login(email, password);
        setGuestAccessToken(res.data.accessToken);
        setGuest(res.data.guest);
      },
      logout: async () => {
        await guestAuthApi.logout();
        setGuestAccessToken(null);
        setGuest(null);
      }
    }),
    [guest, isLoading]
  );

  return <GuestAuthContext.Provider value={value}>{children}</GuestAuthContext.Provider>;
}

export function useGuestAuth() {
  const ctx = useContext(GuestAuthContext);
  if (!ctx) throw new Error("useGuestAuth must be used within a GuestAuthProvider");
  return ctx;
}