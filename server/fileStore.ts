import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { UserVault, USERS_KEY, type Registry } from "../src/planner/users/vault";
import { isValidBackup } from "../src/planner/model";

export class FileStore {
  directory: string;
  file: string;
  constructor(directory: string) { this.directory = directory; this.file = join(directory, "profiles.json"); }
  getItem(key: string): string | null {
    if (key !== USERS_KEY) throw new Error("Unsupported app storage key.");
    try { return readFileSync(this.file, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw new Error("The app data file could not be read. Saved records have not been changed."); }
  }
  setItem(key: string, value: string): void {
    if (key !== USERS_KEY) throw new Error("Unsupported app storage key.");
    this.atomicWrite(this.file, value);
  }
  removeItem(): void { throw new Error("Delete individual profiles through the admin page."); }
  private atomicWrite(path: string, value: string): void {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const temporary = path + "." + randomUUID() + ".tmp";
    let descriptor: number | null = null;
    try {
      descriptor = openSync(temporary, "wx", 0o600);
      writeFileSync(descriptor, value, "utf8"); fsyncSync(descriptor); closeSync(descriptor); descriptor = null;
      renameSync(temporary, path);
    } catch {
      if (descriptor !== null) closeSync(descriptor);
      try { unlinkSync(temporary); } catch { /* Preserve the last complete data file. */ }
      throw new Error("The app data file could not be saved. Check disk space and folder access. Existing records have not been replaced.");
    }
  }
  async locked<T>(action: () => Promise<T>): Promise<T> {
    mkdirSync(this.directory, { recursive: true, mode: 0o700 });
    const lock = join(this.directory, "profiles.lock");
    const deadline = Date.now() + 10000;
    let descriptor: number;
    while (true) {
      try { descriptor = openSync(lock, "wx", 0o600); writeFileSync(descriptor, String(process.pid)); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        try {
          const owner = Number(readFileSync(lock, "utf8"));
          if (owner > 0) {
            try { process.kill(owner, 0); }
            catch (error) { if ((error as NodeJS.ErrnoException).code === "ESRCH") { unlinkSync(lock); continue; } }
          } else if (Date.now() - statSync(lock).mtimeMs > 30000) { unlinkSync(lock); continue; }
        } catch { /* Another request may have just released the lock. */ }
        if (Date.now() >= deadline) throw new Error("The app data is busy. Please try again shortly.");
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }
    try { return await action(); }
    finally { closeSync(descriptor); unlinkSync(lock); }
  }
  importBrowserRegistry(raw: string): void {
    const hash = createHash("sha256").update(raw).digest("hex");
    const currentRaw = this.getItem(USERS_KEY);
    const current = currentRaw ? JSON.parse(currentRaw) as Registry : { version: 1 as const, records: [] };
    if (current.migrationHashes?.includes(hash)) return;
    const incoming = JSON.parse(raw) as Registry;
    const memory = { getItem: () => raw, setItem() {}, removeItem() {} };
    const incomingUsers = new UserVault(memory).list();
    new UserVault(this).list(); // Refuse to replace an invalid existing file.
    for (const record of [...incoming.records, ...(incoming.archivedDefaultProfiles ?? [])]) {
      if (record.payload.kind === "plain" && !isValidBackup(record.payload.data)) throw new Error("The old browser profile contains invalid finance data. Its browser copy has been kept.");
    }
    const additions = incoming.records.filter(record => {
      const existing = current.records.find(r => r.user.id === record.user.id);
      if (existing && JSON.stringify(existing) !== JSON.stringify(record)) throw new Error("An imported profile conflicts with an existing app profile. The browser copy has been kept.");
      return !existing;
    });
    const names = new Set(current.records.map(r => r.user.name.toLocaleLowerCase()));
    for (const record of additions) {
      const name = record.user.name.toLocaleLowerCase();
      if (names.has(name)) throw new Error("An imported profile name already exists in the app. The browser copy has been kept.");
      names.add(name);
    }
    if ([...current.records, ...additions].filter(r => r.user.role === "admin").length > 1) throw new Error("The app and browser have different admin accounts. The browser copy has been kept.");
    if (incomingUsers.some(user => user.name.trim().length === 0 || user.name.length > 50)) throw new Error("The old browser profile names are invalid.");
    const migrationDirectory = join(this.directory, "migrations");
    mkdirSync(migrationDirectory, { recursive: true, mode: 0o700 });
    const backup = join(migrationDirectory, "browser-" + hash + ".json");
    if (!existsSync(backup)) this.atomicWrite(backup, raw);
    const archived = [...(current.archivedDefaultProfiles ?? [])];
    for (const record of incoming.archivedDefaultProfiles ?? []) if (!archived.some(r => r.user.id === record.user.id)) archived.push(record);
    this.setItem(USERS_KEY, JSON.stringify({ ...current, records: [...current.records, ...additions], archivedDefaultProfiles: archived, migrationHashes: [...(current.migrationHashes ?? []), hash] }));
  }
}
