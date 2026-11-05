import type { AppState } from "./appApi";
import { UserVault, USERS_KEY, type Registry, type UserSession } from "./profileVault";
import type { AdminSettings } from "../types/finance";
import { isValidBackup } from "../utils/finance";
import { createInitialData } from "../utils/initialData";

export type ProfileDisk = {
  read: () => Promise<string | null>;
  write: (registry: string) => Promise<void>;
};

export function validateRegistry(raw: string): void {
  const vault = new UserVault({ getItem: () => raw, setItem() {}, removeItem() {} });
  vault.list();
  const registry = JSON.parse(raw) as Registry;
  for (const record of [...registry.records, ...(registry.archivedDefaultProfiles ?? [])]) {
    if (record.payload.kind === "plain" && !isValidBackup(record.payload.data))
      throw new Error("A saved profile contains invalid finance records. Its records have been kept.");
  }
}

const field = (value: unknown, name: string, optional = false): string => {
  if (optional && value === undefined) return "";
  if (typeof value !== "string") throw new Error("A valid " + name + " is required.");
  return value;
};
const revision = (value: unknown): number => {
  if (!Number.isInteger(value) || Number(value) < 1) throw new Error("A valid profile revision is required.");
  return Number(value);
};

// One transaction at a time. Stage vault changes in memory and acknowledge only
// after the storage adapter confirms the complete registry has been saved.
export class ProfileStore {
  private session: UserSession | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private disk: ProfileDisk;
  constructor(disk: ProfileDisk) { this.disk = disk; }
  request<T = AppState>(path: string, input?: object): Promise<T> {
    const task = this.queue.catch(() => {}).then(() => this.transact(path, input));
    this.queue = task;
    return task as Promise<T>;
  }
  private async transact(path: string, input?: object): Promise<unknown> {
    const original = await this.disk.read();
    if (original !== null) validateRegistry(original);
    let staged = original;
    const storage = {
      getItem: (key: string) => key === USERS_KEY ? staged : null,
      setItem: (key: string, value: string) => {
        if (key !== USERS_KEY) throw new Error("Unsupported storage key.");
        staged = value;
      },
      removeItem: () => { throw new Error("Delete profiles through admin settings."); },
    };
    const vault = new UserVault(storage);
    let nextSession = this.session;
    const values = (input ?? {}) as Record<string, unknown>;
    const actor = (): UserSession => {
      if (!nextSession) throw new Error("Sign in before changing this profile.");
      if (revision(values.revision) !== nextSession.revision)
        throw new Error("This profile changed. Reload before saving again.");
      return nextSession;
    };
    if (path === "state") {
      if (nextSession) {
        try { nextSession = await vault.refresh(nextSession); }
        catch (error) {
          if (/no longer exists|password changed|Sign in again/.test(error instanceof Error ? error.message : "")) nextSession = null;
          else throw error;
        }
      }
    } else if (path === "profile-export") {
      if (!nextSession) throw new Error("Sign in before exporting this profile.");
      return vault.exportProfile(nextSession);
    } else if (path === "profile-import") {
      if (nextSession) throw new Error("Sign out before importing a portable profile.");
      nextSession = await vault.importProfile(values.profile, field(values.password, "password", true), field(values.name, "name"));
    } else if (path === "register") {
      if (nextSession) throw new Error("Sign out to create a new profile, or use admin profile management.");
      nextSession = await vault.register(field(values.name, "name"), createInitialData(), field(values.password, "password", true));
    } else if (path === "sign-in") {
      nextSession = await vault.open(field(values.id, "profile ID"), field(values.password, "password", true));
    } else if (path === "sign-out") {
      nextSession = null;
    } else if (path === "setup-admin") {
      nextSession = await vault.createAdmin(field(values.name, "name"), createInitialData(), field(values.password, "password"));
    } else if (path === "save") {
      if (!isValidBackup(values.data)) throw new Error("The finance records are invalid. Existing records have been kept.");
      nextSession = await vault.save(actor(), values.data);
    } else if (path === "configure") {
      nextSession = await vault.configure(actor(), field(values.name, "name"), values.password === null ? null : field(values.password, "new password"), field(values.currentPassword, "current password", true));
    } else if (path === "admin/settings") {
      nextSession = await vault.saveAdminSettings(actor(), values.settings as AdminSettings);
    } else if (path === "admin/create-user") {
      await vault.create(actor(), field(values.name, "name"), createInitialData(), field(values.password, "password", true));
    } else if (path === "admin/rename-user") {
      await vault.renameUser(actor(), field(values.id, "profile ID"), revision(values.targetRevision), field(values.name, "name"));
    } else if (path === "admin/delete-user") {
      await vault.deleteUser(actor(), field(values.id, "profile ID"), revision(values.targetRevision));
    } else if (path === "admin/refresh-users") {
      await vault.listManagedUsers(actor());
    } else if (path === "profiles-backup") {
      await vault.listManagedUsers(nextSession);
      return { format: "savingsos-profiles-backup", version: 1, registry: JSON.parse(staged!) };
    } else if (path === "migrate") {
      throw new Error("Import a profile backup from the user screen to move records between browsers.");
    } else {
      throw new Error("App operation not found.");
    }
    if (staged !== original && staged !== null) {
      validateRegistry(staged);
      await this.disk.write(staged);
    }
    this.session = nextSession;
    return structuredClone({
      users: vault.list(),
      session: nextSession ? { user: nextSession.user, revision: nextSession.revision, data: nextSession.data } : null,
    });
  }
}
