import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export type AuthenticationState = {
  enabled: boolean;
  user: User | null;
  busy: boolean;
  error: string;
  google: () => Promise<void>;
  email: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyEmail: () => Promise<void>;
  leave: () => Promise<void>;
};
export const AuthenticationContext = createContext<AuthenticationState | null>(null);
export const useAuthentication = () => useContext(AuthenticationContext);
