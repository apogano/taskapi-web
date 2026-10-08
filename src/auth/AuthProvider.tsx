import { useEffect, useState, type ReactNode } from "react";
import * as auth from "../api/auth";
import { api } from "../api/client";
import { AuthContext, type AuthState, type User } from "./AuthContext";
import { useQueryClient } from "@tanstack/react-query";

async function fetchCurrentUser(): Promise<User | null> {
  const { data } = await api.GET("/users/me");
  return data ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let ignore = false;

    // On page load the in-memory access token is gone, but the refresh
    // cookie may still be there: try to restore the session silently.
    async function restoreSession() {
      let user: User | null = null;
      try {
        if (await auth.refreshAccessToken()) {
          user = await fetchCurrentUser();
        }
      } catch {
        // Network failure: treat as signed out rather than hanging on "loading"
      }
      if (!ignore) {
        setState(user ? { status: "authenticated", user } : { status: "anonymous" });
      }
    }
    restoreSession();

    // Failed refresh mid-session, or a logout in another tab
   const unsubscribe = auth.onSessionExpired(() => {
      // Cached data belongs to the user who just signed out
      queryClient.clear();
      setState({ status: "anonymous" });
    });

    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [queryClient]);

  async function login(email: string, password: string) {
    const result = await auth.login(email, password);
    if (result.ok) {
      const user = await fetchCurrentUser();
      if (user) setState({ status: "authenticated", user });
    }
    return result;
  }

  async function register(email: string, password: string): Promise<auth.LoginResult> {
    const { response } = await api.POST("/auth/register", { body: { email, password } });
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    return login(email, password);
  }

  async function logout() {
    // auth.logout() notifies onSessionExpired listeners, which resets the state
    await auth.logout();
  }

  return <AuthContext value={{ state, login, register, logout }}>{children}</AuthContext>;
}