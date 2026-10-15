import { createContext, useContext } from "react";
import type { User } from "./vault";
export type UsersState = {
    users: User[];
    currentUser: User | null;
    busy: boolean;
    saving: boolean;
    error: string;
    signIn: (id: string, password?: string) => Promise<void>;
    createUser: (name: string, password?: string) => Promise<void>;
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
