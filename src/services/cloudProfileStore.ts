import type { AppSession, AppState } from "./appApi";
import type { User } from "./profileVault";
import type { Data } from "../types/finance";
import { createInitialData } from "../utils/initialData";
import { isValidBackup } from "../utils/finance";

export type CloudRecord = { version: 1; revision: number; dataJson: string };
export type ProfileBackend = {
  request: <T = AppState>(path: string, input?: object) => Promise<T>;
  subscribe?: (next: (state: AppState) => void, error: (error: unknown) => void) => () => void;
};
export type CloudDisk = {
  read: () => Promise<unknown>;
  write: (expectedRevision: number, data: CloudRecord) => Promise<void>;
  subscribe: (next: (record: unknown) => void, error: (error: unknown) => void) => () => void;
  rename: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
  remove?: (revision: number, password: string) => Promise<void>;
};

export function parseCloudRecord(value: unknown): CloudRecord {
  const record = value as Partial<CloudRecord> | null;
  if (!record || record.version !== 1 || !Number.isSafeInteger(record.revision) || record.revision! < 1 ||
      typeof record.dataJson !== "string" || new TextEncoder().encode(record.dataJson).length > 900000)
    throw new Error("Your cloud planner could not be read. No saved data was replaced.");
  let data: unknown;
  try { data = JSON.parse(record.dataJson); } catch { throw new Error("Your cloud planner could not be read. No saved data was replaced."); }
  if (!isValidBackup(data)) throw new Error("Your cloud planner could not be read. No saved data was replaced.");
  return record as CloudRecord;
}

export function cloudRecord(data: Data, revision: number): CloudRecord {
  if (!isValidBackup(data)) throw new Error("The finance records are invalid. No cloud data was changed.");
  const record: CloudRecord = { version: 1, revision, dataJson: JSON.stringify(data) };
  if (new TextEncoder().encode(record.dataJson).length > 900000)
    throw new Error("This planner is too large for cloud storage. Export a backup before reducing its size.");
  return parseCloudRecord(record);
}

export function cloudState(user: User, value: unknown): AppState {
  const record = parseCloudRecord(value);
  const session: AppSession = { user: { ...user, role: "user", hasPassword: false, authProvider: "firebase" }, revision: record.revision, data: JSON.parse(record.dataJson) as Data };
  return { users: [{ ...session.user, revision: session.revision }], session };
}

export function createCloudProfileBackend(identity: () => User, disk: CloudDisk): ProfileBackend {
  const load = async (create = false) => {
    let record = await disk.read();
    if (record == null) {
      if (!create) throw new Error("Your cloud planner was removed. Export any unsaved records and sign in again.");
      // A concurrent first sign-in may create the document on another device.
      // Re-read on conflict; never overwrite a planner with an empty one.
      const initial = cloudRecord(createInitialData(), 1);
      try { await disk.write(0, initial); record = initial; }
      catch (error) { record = await disk.read(); if (record == null) throw error; }
    }
    return cloudState(identity(), record);
  };
  return {
    async request<T = AppState>(path: string, input?: object): Promise<T> {
      if (path === "state") return await load(true) as T;
      if (path === "save") {
        const { revision, data } = input as { revision: number; data: Data };
        if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Reload your cloud planner before saving.");
        const record = cloudRecord(data, revision + 1);
        await disk.write(revision, record);
        return cloudState(identity(), record) as T;
      }
      if (path === "sign-out") { await disk.signOut(); return { users: [], session: null } as T; }
      if (path === "delete-account" && disk.remove) {
        const { revision, password } = input as { revision: number; password: string };
        await disk.remove(revision, password);
        return { users: [], session: null } as T;
      }
      if (path === "configure") {
        const { name, password } = input as { name: string; password: string | null };
        if (password !== null) throw new Error("Manage your online password from your account settings.");
        if (!name.trim() || name.trim().length > 50) throw new Error("Use a name with 1 to 50 characters.");
        await disk.rename(name.trim());
        return await load() as T;
      }
      if (path === "profile-export") {
        const state = await load();
        return { format: "savingsos-portable-profile", version: 1, exportedAt: new Date().toISOString(), profile: {
          origin: "created", user: { id: state.session!.user.id, name: state.session!.user.name, role: "user", hasPassword: false, createdAt: state.session!.user.createdAt },
          revision: state.session!.revision, payload: { kind: "plain", data: state.session!.data },
        } } as T;
      }
      throw new Error("This action is only available for local profiles.");
    },
    subscribe(next, error) {
      return disk.subscribe(record => {
        try {
          if (record == null) throw new Error("Your cloud planner was removed. Export any unsaved records and sign in again.");
          next(cloudState(identity(), record));
        } catch (cause) { error(cause); }
      }, error);
    },
  };
}
