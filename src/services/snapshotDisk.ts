import type { ProfileDisk } from "./nativeProfiles";
import { validateRegistry } from "./nativeProfiles";

export type SnapshotFiles = {
  list: () => Promise<string[]>;
  read: (name: string) => Promise<string>;
  write: (name: string, data: string) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
};
const isSnapshot = (name: string) => /^\d{16}-[a-z0-9-]+\.json$/.test(name);

// Immutable generations avoid overwriting the last acknowledged save.
// A verified temporary file becomes committed only when renamed to .json.
// The two most recent complete generations remain available on the device.
export function createSnapshotDisk(files: SnapshotFiles): ProfileDisk {
  let generation = 0;
  return {
    async read() {
      const names = (await files.list()).filter(isSnapshot).sort();
      if (!names.length) return null;
      const latest = names[names.length - 1];
      const data = await files.read(latest);
      validateRegistry(data);
      generation = Number(latest.slice(0, 16));
      return data;
    },
    async write(data) {
      validateRegistry(data);
      generation = Math.max(Date.now(), generation + 1);
      const name = String(generation).padStart(16, "0") + "-" + crypto.randomUUID() + ".json";
      const temporary = name + ".tmp";
      try {
        await files.write(temporary, data);
        if (await files.read(temporary) !== data) throw new Error("The saved data could not be verified.");
        await files.rename(temporary, name);
      } catch (error) {
        try { await files.remove(temporary); } catch { /* Keep the complete generations. */ }
        throw new Error("The phone could not save these records. Existing profiles have been kept.", { cause: error });
      }
      try {
        const old = (await files.list()).filter(isSnapshot).sort().slice(0, -2);
        for (const entry of old) await files.remove(entry);
      } catch { /* Cleanup never changes whether a completed save is acknowledged. */ }
    },
  };
}
