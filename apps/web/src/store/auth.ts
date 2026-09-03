import { create } from "zustand";
import type { User } from "@workspace/api-client-react";
import { apiFetch, getStoredRefreshToken, getStoredToken, clearStoredToken, setStoredToken, setStoredRefreshToken } from "@/lib/api";

export type AuthUser = User & {
  role?: string;
  postsCount?: number;
  followingCount?: number;
  headline?: string | null;
  identityType?: string | null;
};

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  setUser: (user: AuthUser | null) => void;
  setInitializing: (v: boolean) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  token: getStoredToken(),

  setAuth: (user, token) => {
    set({ user, token, isAuthenticated: true });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setInitializing: (v) => set({ isInitializing: v }),

  logout: () => {
    clearStoredToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    const token = get().token ?? getStoredToken();
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    try {
      const res = await apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          const refreshRes = await apiFetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshed = await refreshRes.json();
            setStoredToken(refreshed.token);
            setStoredRefreshToken(refreshed.refreshToken);
            set({ token: refreshed.token });
            const retry = await apiFetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${refreshed.token}` },
            });
            if (retry.ok) {
              const user: AuthUser = await retry.json();
              set({ user, isAuthenticated: true, token: refreshed.token });
              return;
            }
          }
        }
        clearStoredToken();
        set({ user: null, token: null, isAuthenticated: false });
        return;
      }
      const user: AuthUser = await res.json();
      set({ user, isAuthenticated: true, token });
    } catch (error) {
      console.warn("[auth] Session check unavailable; keeping the stored session", error);
      set({ user: null, isAuthenticated: true, token });
    }
  },
}));
