import test from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import { createServer } from "vite";
import { fixtureAccounts } from "./account-fixtures.mjs";

test("GitHub Pages browser profiles persist privately without a server", async t => {
  const factory = new IDBFactory();
  const previous = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
  Object.defineProperty(globalThis, "indexedDB", { configurable: true, value: factory });
  const originalFetch = globalThis.fetch;
  const vite = await createServer({ mode: "github", server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { browserStorage } = await vite.ssrLoadModule("/src/services/runtime.ts");
    assert.equal(browserStorage, true);
    const { createBrowserDisk } = await vite.ssrLoadModule("/src/services/browserProfiles.ts");
    const { NativeProfiles } = await vite.ssrLoadModule("/src/services/nativeProfiles.ts");
    const { createInitialData } = await vite.ssrLoadModule("/src/utils/initialData.ts");
    const { UserVault } = await vite.ssrLoadModule("/src/services/profileVault.ts");
    const { appRequest } = await vite.ssrLoadModule("/src/services/appApi.ts");
    globalThis.fetch = async () => { throw new Error("The browser edition must not call a server API."); };
    let backup;
    const password = "browser profile password";
    const data = { ...createInitialData(), accounts: fixtureAccounts(), income: [{ id: "salary", name: "Browser private salary", amount: 1500, date: "2026-11-01", accountId: "moey" }] };
    await t.test("the Pages API creates, saves and exports without HTTP calls", async () => {
      assert.equal((await appRequest("state")).session, null);
      let state = await appRequest("register", { name: "Browser owner", password });
      state = await appRequest("save", { revision: state.session.revision, data });
      assert.deepEqual(state.session.data, data);
      backup = await appRequest("profile-export");
      assert.equal(backup.profile.payload.kind, "encrypted");
      assert.ok(!JSON.stringify(backup).includes("Browser private salary"));
    });
    await t.test("a fresh app instance requires the password and restores saved finance records", async () => {
      const app = new NativeProfiles(createBrowserDisk(factory));
      assert.equal((await app.request("state")).session, null);
      await assert.rejects(app.request("sign-in", { id: backup.profile.user.id, password: "wrong" }), /incorrect/);
      const state = await app.request("sign-in", { id: backup.profile.user.id, password });
      assert.deepEqual(state.session.data, data);
    });
    await t.test("browser exports import into a separate desktop-compatible registry", async () => {
      let raw = null;
      const desktop = new NativeProfiles({ read: async () => raw, write: async value => { raw = value; } });
      const imported = await desktop.request("profile-import", { profile: backup, name: "Desktop owner", password });
      assert.deepEqual(imported.session.data, data);
      assert.equal(imported.session.user.id, backup.profile.user.id);
      assert.ok(!raw.includes("Browser private salary"));
    });
    await t.test("atomic writes reject a conflicting tab instead of losing profiles", async () => {
      const first = createBrowserDisk(factory, "conflict-test");
      const second = createBrowserDisk(factory, "conflict-test");
      await first.read(); await second.read();
      const registry = JSON.stringify({ version: 1, records: [] });
      await first.write(registry);
      await assert.rejects(second.write(registry), /another tab/);
      assert.equal(await second.read(), registry);
    });
    await t.test("stale tab sessions cannot overwrite a more recent finance save", async () => {
      const a = new NativeProfiles(createBrowserDisk(factory)), b = new NativeProfiles(createBrowserDisk(factory));
      const sessionA = await a.request("sign-in", { id: backup.profile.user.id, password });
      const sessionB = await b.request("sign-in", { id: backup.profile.user.id, password });
      await a.request("save", { revision: sessionA.session.revision, data });
      await assert.rejects(b.request("save", { revision: sessionB.session.revision, data: createInitialData() }), /another tab/);
    });
    await t.test("corrupt browser records and unavailable storage fail without erasing data", async () => {
      await assert.rejects(createBrowserDisk(null).read(), /storage is unavailable/);
      const disk = createBrowserDisk(factory, "validation-test");
      await disk.read();
      await assert.rejects(disk.write("not JSON"), /could not be read/);
      assert.equal(await disk.read(), null);
      const entries = new Map();
      const vault = new UserVault({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) });
      const user = await vault.register("Plain owner", createInitialData());
      const plain = await vault.exportProfile(user);
      const app = new NativeProfiles(disk);
      const imported = await app.request("profile-import", { profile: plain, name: "Plain owner" });
      assert.equal(imported.session.user.hasPassword, false);
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (previous) Object.defineProperty(globalThis, "indexedDB", previous);
    else delete globalThis.indexedDB;
    await vite.close();
  }
});
