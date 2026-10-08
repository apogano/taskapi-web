import { createContext, useContext } from "react";
import type { LoginResult } from "../api/auth";
import type { components } from "../api/schema";

export type User = components["schemas"]["UserRead"];

// A user only exists when authenticated: TypeScript won't let a component
// read state.user without first checking state.status.
export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

export type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}