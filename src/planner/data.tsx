import { useEffect, useRef, useState, type ReactNode } from "react";
import { FinanceContext } from "./context";
import { createInitialData } from "./initialData";
import { UsersContext } from "./users/context";
import { USERS_KEY, type ListedUser, type User } from "./users/vault";
import { appRequest, type AppSession, type AppState } from "./api";
import { today, withoutSamples, type AdminSettings, type Data } from "./model";
const message = (error: unknown) => error instanceof Error ? error.message : "The app could not complete this change. Saved records have not been replaced.";

export function UsersProvider({ children }: { children: ReactNode }) {
  const sessionRef = useRef<AppSession | null>(null);
  const dataRef = useRef(createInitialData());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const working = useRef(false);
  const [data, setData] = useState(dataRef.current);
  const [users, setUsers] = useState<ListedUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingSaves, setPendingSaves] = useState(0);
  const [error, setError] = useState("");
  const [bootError, setBootError] = useState("");
  const [notice, setNotice] = useState("");
  function install(state: AppState) {
    sessionRef.current = state.session;
    dataRef.current = state.session?.data ?? createInitialData();
    setData(dataRef.current); setCurrentUser(state.session?.user ?? null); setUsers(state.users); setError("");
  }
  function persist(snapshot: Data): Promise<void> {
    const id = sessionRef.current?.user.id;
    if (!id) return Promise.resolve();
    setPendingSaves(n => n + 1);
    const task = queue.current.catch(() => {}).then(async () => {
      const session = sessionRef.current;
      if (!session || session.user.id !== id) throw new Error("The active user changed before these records could be saved.");
      const state = await appRequest("save", { revision: session.revision, data: snapshot });
      if (sessionRef.current?.user.id === id) { sessionRef.current = state.session; setUsers(state.users); setError(""); }
    });
    queue.current = task;
    return task.catch(e => { setError(message(e)); throw e; }).finally(() => setPendingSaves(n => n - 1));
  }
  async function flush() { if (sessionRef.current) await persist(dataRef.current); else await queue.current.catch(() => {}); }
  async function perform(action: () => Promise<void>) {
    if (working.current) throw new Error("Please wait for the current user change to finish.");
    working.current = true; setBusy(true);
    try { await action(); } finally { working.current = false; setBusy(false); }
  }
  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        let state = await appRequest("state");
        let legacy: string | null = null;
        try { legacy = window.localStorage.getItem(USERS_KEY); } catch { /* App files work even when browser storage is blocked. */ }
        if (legacy) {
          try {
            state = await appRequest("migrate", { registry: legacy });
            try { if (window.localStorage.getItem(USERS_KEY) === legacy) window.localStorage.removeItem(USERS_KEY); }
            catch { if (active) setNotice("Your profiles are saved in the app, but the old browser copy could not be removed."); }
          } catch (e) { if (active) setNotice("Browser migration needs attention: " + message(e)); }
        }
        if (active) install(state);
      } catch (e) { if (active) setBootError(message(e)); }
      if (active) setReady(true);
    }
    void initialize(); return () => { active = false; };
  }, []);
  const update = (fn: (previous: Data) => Data) => {
    if (!sessionRef.current) return;
    const next = fn(dataRef.current); dataRef.current = next; setData(next);
    void persist(next).catch(() => {});
  };
  const save = async (fn: (previous: Data) => Data): Promise<void> => {
    const userId = sessionRef.current?.user.id;
    if (!userId) throw new Error("Sign in before saving finance records.");
    const previous = dataRef.current;
    const next = fn(previous);
    // Later queued changes must include this change while the server confirms it.
    dataRef.current = next; setData(next);
    try {
      await persist(next);
      if (sessionRef.current?.user.id !== userId) throw new Error("The active user changed before the save completed.");
    } catch (error) {
      if (sessionRef.current?.user.id === userId && dataRef.current === next) {
        dataRef.current = previous; setData(previous);
      }
      throw error;
    }
  };
  const signIn = (id: string, password = "") => perform(async () => { await flush(); install(await appRequest("sign-in", { id, password })); });
  const createUser = (name: string, password = "") => perform(async () => {
    await flush();
    install(await appRequest(sessionRef.current ? "admin/create-user" : "register", { name, password, revision: sessionRef.current?.revision }));
  });
  const createAdmin = (name: string, password: string) => perform(async () => { await flush(); install(await appRequest("setup-admin", { name, password })); });
  const renameUser = (id: string, revision: number, name: string) => perform(async () => { await flush(); install(await appRequest("admin/rename-user", { id, targetRevision: revision, name, revision: sessionRef.current?.revision })); });
  const deleteUser = (id: string, revision: number) => perform(async () => { await flush(); install(await appRequest("admin/delete-user", { id, targetRevision: revision, revision: sessionRef.current?.revision })); });
  const refreshUsers = () => perform(async () => { await flush(); install(await appRequest("admin/refresh-users", { revision: sessionRef.current?.revision })); });
  const saveAdminSettings = (settings: AdminSettings) => perform(async () => { await flush(); install(await appRequest("admin/settings", { settings, revision: sessionRef.current?.revision })); });
  const signOut = () => perform(async () => { await flush(); install(await appRequest("sign-out", {})); });
  const configureUser = (name: string, password: string | null, currentPassword = "") => perform(async () => { await flush(); install(await appRequest("configure", { name, password, currentPassword, revision: sessionRef.current?.revision })); });
  const exportProfiles = () => perform(async () => {
    await flush(); const backup = await appRequest<object>("profiles-backup");
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "savingsos-profiles-backup-" + today() + ".json"; link.click(); URL.revokeObjectURL(url);
  });
  return <UsersContext.Provider value={{ users, currentUser, busy, saving: pendingSaves > 0, error: bootError, notice, signIn, createUser, renameUser, deleteUser, refreshUsers, createAdmin, saveAdminSettings, signOut, configureUser, exportProfiles }}>
    <FinanceContext.Provider value={{ data, update, save, ready, error: error || notice, clearDemo: () => update(withoutSamples) }}>{children}</FinanceContext.Provider>
  </UsersContext.Provider>;
}
