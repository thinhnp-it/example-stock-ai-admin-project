import { create } from "zustand";
import type { AuthState, User } from "@/lib/auth/types";
import { clearAccessToken, getAccessToken, setAccessToken } from "@/lib/auth/token";

type AuthActions = {
  hydrate: (payload: { token: string | null; user: User | null }) => void;
  setSession: (payload: { token: string; user: User }) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  token: null,
  user: null,

  hydrate: ({ token, user }) => set({ token, user }),
  setSession: ({ token, user }) => {
    setAccessToken(token);
    set({ token, user });
  },
  logout: () => {
    clearAccessToken();
    set({ token: null, user: null });
  }
}));

export function initAuthFromStorage() {
  const token = getAccessToken();
  if (!token) return { token: null, user: null };

  // The session is validated with the auth service before protected UI is shown.
  return { token, user: null };
}
