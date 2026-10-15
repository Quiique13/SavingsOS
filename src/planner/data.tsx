import { useEffect, useRef, useState, type ReactNode } from "react";
import { FinanceContext } from "./context";
import { createInitialData, loadExistingPlanner } from "./users/initialData";
import { UsersContext } from "./users/context";
import { UserVault, type User, type UserSession } from "./users/vault";
import { withoutSamples, type Data } from "./model";
const message = (error: unknown) => error instanceof Error ? error.message : "The browser could not complete this change. Your saved records have not been replaced.";
export function UsersProvider({ children }: {
    children: ReactNode;
}) {
    const vaultRef = useRef<UserVault | null>(null);
    const sessionRef = useRef<UserSession | null>(null);
    const dataRef = useRef(createInitialData());
    const queue = useRef<Promise<unknown>>(Promise.resolve());
    const working = useRef(false);
    const [data, setData] = useState(dataRef.current);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pendingSaves, setPendingSaves] = useState(0);
    const [error, setError] = useState("");
    const [bootError, setBootError] = useState("");
    function install(session: UserSession) {
        sessionRef.current = session;
        dataRef.current = session.data;
        setData(session.data);
        setCurrentUser(session.user);
        setUsers(vaultRef.current!.list());
        setError("");
    }
    function persist(snapshot: Data): Promise<void> {
        const id = sessionRef.current?.user.id;
        if (!id)
            return Promise.resolve();
        setPendingSaves(n => n + 1);
        const task = queue.current.catch(() => { }).then(async () => {
            const session = sessionRef.current;
            if (!session || session.user.id !== id)
                throw new Error("The active user changed before these records could be saved.");
            const saved = await vaultRef.current!.save(session, snapshot);
            if (sessionRef.current?.user.id === id) {
                sessionRef.current = saved;
                setError("");
            }
        });
        queue.current = task;
        return task.catch(e => { setError(message(e)); throw e; }).finally(() => setPendingSaves(n => n - 1));
    }
    async function flush() {
        if (sessionRef.current)
            await persist(dataRef.current);
        else
            await queue.current.catch(() => { });
    }
    async function perform(action: () => Promise<void>) {
        if (working.current)
            throw new Error("Please wait for the current user change to finish.");
        working.current = true;
        setBusy(true);
        try {
            await action();
        }
        finally {
            working.current = false;
            setBusy(false);
        }
    }
    useEffect(() => {
        let active = true;
        async function initialize() {
            try {
                const vault = new UserVault(window.localStorage);
                vaultRef.current = vault;
                let list = vault.list();
                if (!list.length) {
                    const previous = await loadExistingPlanner();
                    if (!active)
                        return;
                    // Recheck after the asynchronous legacy read, including Strict Mode remounts.
                    list = vault.list();
                    if (!list.length) {
                        const first = await vault.create("Personal", previous);
                        if (!active)
                            return;
                        install(first);
                        // The imported planner is now durably stored in its own profile.
                        try {
                            localStorage.removeItem("savings-os-planner-v1");
                        }
                        catch {
                            setError("The previous unprotected planner copy could not be removed from browser storage. Export a backup before clearing old browser data.");
                        }
                    }
                }
                list = vault.list();
                if (!active)
                    return;
                setUsers(list);
                if (!sessionRef.current && list.length === 1 && !list[0].hasPassword)
                    install(await vault.open(list[0].id));
            }
            catch (e) {
                if (active)
                    setBootError(message(e));
            }
            if (active)
                setReady(true);
        }
        void initialize();
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (ready && currentUser)
            void persist(data).catch(() => { });
    }, [data, ready, currentUser?.id]);
    const update = (fn: (previous: Data) => Data) => {
        if (!sessionRef.current)
            return;
        const next = fn(dataRef.current);
        dataRef.current = next;
        setData(next);
    };
    const signIn = (id: string, password = "") => perform(async () => {
        await flush();
        install(await vaultRef.current!.open(id, password));
    });
    const createUser = (name: string, password = "") => perform(async () => {
        await flush();
        install(await vaultRef.current!.create(name, createInitialData(), password));
    });
    const signOut = () => perform(async () => {
        await flush();
        sessionRef.current = null;
        dataRef.current = createInitialData();
        setData(dataRef.current);
        setCurrentUser(null);
        setUsers(vaultRef.current!.list());
        setError("");
    });
    const configureUser = (name: string, password: string | null, currentPassword = "") => perform(async () => {
        await flush();
        if (!sessionRef.current)
            throw new Error("Sign in before changing user settings.");
        install(await vaultRef.current!.configure(sessionRef.current, name, password, currentPassword));
    });
    return <UsersContext.Provider value={{ users, currentUser, busy, saving: pendingSaves > 0, error: bootError, signIn, createUser, signOut, configureUser }}>
    <FinanceContext.Provider value={{ data, update, ready, error, clearDemo: () => update(withoutSamples) }}>{children}</FinanceContext.Provider>
  </UsersContext.Provider>;
}
