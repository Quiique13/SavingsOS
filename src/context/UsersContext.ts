import { createContext } from "react";
import { type ListedUser, type User } from "../services/profileVault";
import { type AdminSettings } from "../types/finance";
export type UsersState = {
  users: ListedUser[];
  currentUser: User | null;
  busy: boolean;
  saving: boolean;
  error: string;
  notice?: string;
  retryLoad?: () => void;
  exportProfiles: () => Promise<void>;
  exportProfile: () => Promise<boolean>;
  importProfile: (
    profile: unknown,
    password: string,
    name: string,
  ) => Promise<void>;
  signIn: (id: string, password?: string) => Promise<void>;
  createUser: (name: string, password?: string) => Promise<void>;
  renameUser: (id: string, revision: number, name: string) => Promise<void>;
  deleteUser: (id: string, revision: number) => Promise<void>;
  refreshUsers: () => Promise<void>;
  createAdmin: (name: string, password: string) => Promise<void>;
  saveAdminSettings: (settings: AdminSettings) => Promise<void>;
  signOut: () => Promise<void>;
  deleteOnlineAccount?: (password: string) => Promise<void>;
  configureUser: (
    name: string,
    password: string | null,
    currentPassword?: string,
  ) => Promise<void>;
};
export const UsersContext = createContext<UsersState | null>(null);
