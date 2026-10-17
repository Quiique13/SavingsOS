import { createContext, useContext } from "react";
import type { AdminSettings } from "../model";
import type { ListedUser, User } from "./vault";
export type UsersState = {
    users: ListedUser[];
    currentUser: User | null;
    busy: boolean;
    saving: boolean;
    error: string;
    notice?: string;
    exportProfiles: () => Promise<void>;
    signIn: (id: string, password?: string) => Promise<void>;
    createUser: (name: string, password?: string) => Promise<void>;
    renameUser: (id: string, revision: number, name: string) => Promise<void>;
    deleteUser: (id: string, revision: number) => Promise<void>;
    refreshUsers: () => Promise<void>;
    createAdmin: (name: string, password: string) => Promise<void>;
    saveAdminSettings: (settings: AdminSettings) => Promise<void>;
    signOut: () => Promise<void>;
    configureUser: (name: string, password: string | null, currentPassword?: string) => Promise<void>;
};
export const UsersContext = createContext<UsersState | null>(null);
export function useUsers(): UsersState {
    const context = useContext(UsersContext);
    if (!context)
        throw new Error("User controls must be wrapped in UsersProvider.");
    return context;
}
