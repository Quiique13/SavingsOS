import { ProfileStore, validateRegistry, type ProfileDisk } from "./profileStore";

const unavailable = () => new Error("Browser storage is unavailable. Allow site storage for savingsOS and reload. Existing records have been kept.");

export function createBrowserDisk(factory: IDBFactory = globalThis.indexedDB, name = "savingsos-web-profiles-v1"): ProfileDisk {
  let database: Promise<IDBDatabase> | undefined;
  let expected: string | null = null;
  function open(): Promise<IDBDatabase> {
    if (!factory) return Promise.reject(unavailable());
    database ??= new Promise((resolve, reject) => {
      const request = factory.open(name, 1);
      let blocked = false;
      request.onupgradeneeded = () => request.result.createObjectStore("profiles");
      request.onerror = () => reject(unavailable());
      request.onblocked = () => { blocked = true; reject(new Error("Close other savingsOS tabs, then reload to open browser storage.")); };
      request.onsuccess = () => {
        if (blocked) { request.result.close(); return; }
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
    return database;
  }
  return {
    async read() {
      const db = await open();
      const raw = await new Promise<string | null>((resolve, reject) => {
        const transaction = db.transaction("profiles", "readonly");
        const request = transaction.objectStore("profiles").get("registry");
        transaction.oncomplete = () => resolve(request.result ?? null);
        transaction.onabort = transaction.onerror = () => reject(unavailable());
      });
      if (raw !== null) validateRegistry(raw);
      expected = raw;
      return raw;
    },
    async write(raw) {
      validateRegistry(raw);
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("profiles", "readwrite");
        let conflict = false;
        const store = transaction.objectStore("profiles");
        const request = store.get("registry");
        request.onsuccess = () => {
          // Compare and replace inside one IndexedDB transaction. Two tabs cannot
          // acknowledge writes based on the same old registry and lose a profile.
          if ((request.result ?? null) !== expected) { conflict = true; transaction.abort(); return; }
          store.put(raw, "registry");
        };
        transaction.oncomplete = () => { expected = raw; resolve(); };
        transaction.onabort = transaction.onerror = () => reject(conflict
          ? new Error("Profiles changed in another tab. Export unsaved finance records, then reload before trying again.")
          : new Error("The browser could not save these records. Check available storage and export a backup. Existing records have been kept."));
      });
    },
  };
}

export const browserProfiles = new ProfileStore(createBrowserDisk());
