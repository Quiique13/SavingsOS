import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServer, preview } from "vite";
import { resolve } from "node:path";
import { appClient, startApp, temporaryAppDirectory, removeTemporaryAppDirectory } from "./app-server-helpers.mjs";

const password = "a test admin password";
test("private app file storage and API", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { createAppServer, localAppStorage } = await vite.ssrLoadModule("/server/appServer.ts");
    const { UserVault, USERS_KEY } = await vite.ssrLoadModule("/src/planner/users/vault.ts");
    const { saveTransfer } = await vite.ssrLoadModule("/src/planner/model.ts");
    const { createInitialData } = await vite.ssrLoadModule("/src/planner/initialData.ts");
    async function fixture(run) {
      const directory = temporaryAppDirectory(); let running = await startApp(createAppServer, directory);
      const restart = async () => { await running.close(); running = await startApp(createAppServer, directory); return running; };
      try { await run({ directory, get running() { return running; }, restart }); }
      finally { await running.close(); removeTemporaryAppDirectory(directory); }
    }
    await t.test("records survive server restarts and protected finance data stays encrypted", async () => fixture(async context => {
      const client = appClient(context.running.base);
      let result = await client.request("register", { name: "Alice", password });
      assert.equal(result.status, 200);
      assert.match(result.response.headers.get("set-cookie"), /HttpOnly/);
      assert.match(result.response.headers.get("set-cookie"), /SameSite=Strict/);
      assert.equal(result.value.session.key, undefined);
      const user = result.value.session.user;
      const data = { ...result.value.session.data, expenses: [{ id: "private", name: "Private finance detail", amount: 25, category: "Other", accountId: "bleap", due: "2026-10-16", frequency: "once", notes: "private notes" }] };
      assert.equal((await client.request("save", { data })).status, 200);
      const file = readFileSync(join(context.directory, "profiles.json"), "utf8");
      assert.ok(!file.includes("Private finance detail")); assert.ok(!file.includes(password));
      await context.restart();
      const secondBrowser = appClient(context.running.base);
      result = await secondBrowser.request("state");
      assert.equal(result.value.session, null);
      assert.ok(result.value.users.some(profile => profile.id === user.id));
      assert.equal((await secondBrowser.request("sign-in", { id: user.id, password: "wrong" })).status, 401);
      result = await secondBrowser.request("sign-in", { id: user.id, password });
      assert.equal(result.status, 200); assert.deepEqual(result.value.session.data, data);
    }));
    await t.test("transfers survive encrypted storage and backup restore without changing another profile", async () => fixture(async context => {
      const owner = appClient(context.running.base), other = appClient(context.running.base);
      const otherResult = await other.request("register", { name: "Other account owner" });
      const otherId = otherResult.value.session.user.id;
      const registered = await owner.request("register", { name: "Transfer owner", password });
      const ownerId = registered.value.session.user.id;
      const baseline = { ...registered.value.session.data, accounts: registered.value.session.data.accounts.map(account => ({ ...account, balance: account.id === "moey" ? 1000 : account.id === "bleap" ? 100 : 0 })) };
      assert.equal((await owner.request("save", { data: baseline })).status, 200);
      const moved = saveTransfer(owner.state.session.data, { id: "private-transfer", fromAccountId: "moey", toAccountId: "bleap", amount: 300, date: "2026-09-30", notes: "Private transfer note" });
      assert.equal((await owner.request("save", { data: moved })).status, 200);
      const backup = JSON.parse(JSON.stringify(owner.state.session.data));
      const file = readFileSync(join(context.directory, "profiles.json"), "utf8");
      assert.ok(!file.includes("Private transfer note")); assert.ok(!file.includes("private-transfer"));
      await context.restart();
      const reopened = appClient(context.running.base);
      const loggedIn = await reopened.request("sign-in", { id: ownerId, password });
      assert.deepEqual(loggedIn.value.session.data, backup);
      assert.equal((await reopened.request("save", { data: backup })).status, 200);
      assert.deepEqual(reopened.state.session.data.accounts.map(account => account.balance), [400, 700, 0]);
      const secondProfile = appClient(context.running.base);
      const untouched = await secondProfile.request("sign-in", { id: otherId });
      assert.ok(untouched.value.session.data.accounts.every(account => account.balance === 0));
      assert.deepEqual(untouched.value.session.data.transfers, []);
      const legacyBackup = { ...baseline }; delete legacyBackup.transfers;
      assert.equal((await reopened.request("save", { data: legacyBackup })).status, 200);
      assert.deepEqual(reopened.state.session.data.accounts, baseline.accounts);
    }));
    await t.test("browser migration is durable, idempotent, and keeps a private source backup", async () => fixture(async context => {
      const entries = new Map(); const memory = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
      const legacy = new UserVault(memory);
      const admin = await legacy.createAdmin("Admin", createInitialData(), password);
      const user = await legacy.register("Migrated", createInitialData(), password);
      const raw = entries.get(USERS_KEY), client = appClient(context.running.base);
      assert.equal((await client.request("migrate", { registry: raw })).status, 200);
      assert.equal((await client.request("migrate", { registry: raw })).status, 200);
      assert.equal(context.running.app.vault.list().length, 2);
      assert.equal(readdirSync(join(context.directory, "migrations")).length, 1);
      assert.deepEqual((await context.running.app.vault.open(user.user.id, password)).data, user.data);
      let state = await client.request("sign-in", { id: admin.user.id, password });
      const target = state.value.users.find(profile => profile.id === user.user.id);
      assert.equal((await client.request("admin/delete-user", { id: user.user.id, targetRevision: target.revision })).status, 200);
      assert.equal((await client.request("migrate", { registry: raw })).status, 200);
      assert.ok(!context.running.app.vault.list().some(profile => profile.id === user.user.id));
    }));
    await t.test("migration conflicts preserve both existing app records and browser source", async () => fixture(async context => {
      const client = appClient(context.running.base);
      await client.request("register", { name: "Same name" });
      const before = readFileSync(join(context.directory, "profiles.json"), "utf8");
      const entries = new Map(); const legacy = new UserVault({ getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem() {} });
      await legacy.register("Same name", createInitialData());
      const raw = entries.get(USERS_KEY);
      assert.equal((await client.request("migrate", { registry: raw })).status, 409);
      assert.equal(readFileSync(join(context.directory, "profiles.json"), "utf8"), before);
      assert.equal(entries.get(USERS_KEY), raw);
    }));
    await t.test("API enforces admin-only management and rejects stale finance saves", async () => fixture(async context => {
      const admin = appClient(context.running.base), user = appClient(context.running.base);
      const adminResult = await admin.request("setup-admin", { name: "Admin", password });
      assert.equal(adminResult.status, 200);
      const registered = await user.request("register", { name: "User" });
      const profile = registered.value.session.user;
      assert.equal((await user.request("admin/create-user", { name: "Denied" })).status, 403);
      assert.equal((await user.request("admin/delete-user", { id: profile.id, targetRevision: 1 })).status, 403);
      assert.equal((await user.request("register", { name: "Cannot create while signed in" })).status, 403);
      assert.equal((await admin.request("admin/create-user", { name: "Managed" })).status, 200);
      assert.equal(admin.state.session.user.role, "admin");
      const revision = user.state.session.revision;
      assert.equal((await user.request("save", { data: registered.value.session.data })).status, 200);
      assert.equal((await user.request("save", { revision, data: registered.value.session.data })).status, 409);
      const target = context.running.app.vault.list().find(p => p.id === profile.id);
      assert.equal((await admin.request("admin/rename-user", { id: profile.id, targetRevision: target.revision, name: "Renamed" })).status, 200);
      const current = context.running.app.vault.list().find(p => p.id === profile.id);
      assert.equal((await admin.request("admin/delete-user", { id: profile.id, targetRevision: current.revision })).status, 200);
      const stale = await user.request("state");
      assert.equal(stale.value.session, null);
      assert.ok(!stale.value.users.some(p => p.id === profile.id));
    }));
    await t.test("full profile backups are admin-only and preserve encrypted credentials", async () => fixture(async context => {
      const admin = appClient(context.running.base), user = appClient(context.running.base), anonymous = appClient(context.running.base);
      await admin.request("setup-admin", { name: "Admin", password });
      await user.request("register", { name: "User", password });
      assert.equal((await anonymous.request("profiles-backup")).status, 401);
      assert.equal((await user.request("profiles-backup")).status, 403);
      const backup = await admin.request("profiles-backup");
      assert.equal(backup.status, 200); assert.equal(backup.value.format, "savingsos-profiles-backup");
      assert.equal(backup.value.registry.records.length, 2);
      assert.ok(backup.value.registry.records.every(record => record.payload.kind === "encrypted"));
      assert.ok(!JSON.stringify(backup.value).includes(password));
    }));
    await t.test("private files and cross-site writes cannot be accessed through the app server", async () => fixture(async context => {
      const client = appClient(context.running.base);
      await client.request("register", { name: "Private" });
      for (const path of ["/.savingsos-data/profiles.json", "/@fs/C:/app/.savingsos-data/profiles.json", "/%2esavingsos-data/profiles.json"]) {
        assert.equal((await client.fetch(path)).status, 404);
      }
      const before = readFileSync(join(context.directory, "profiles.json"), "utf8");
      const crossSite = await fetch(context.running.base + "/api/register", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ name: "Attacker" }) });
      assert.equal(crossSite.status, 403);
      const missingHeader = await client.fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Other" }) });
      assert.equal(missingHeader.status, 403);
      assert.equal(readFileSync(join(context.directory, "profiles.json"), "utf8"), before);
    }));
    await t.test("development and production preview both use the same private app files", async () => {
      const directory = temporaryAppDirectory();
      let dev; let production;
      try {
        dev = await createServer({ configFile: false, root: directory, plugins: [localAppStorage()], server: { host: "127.0.0.1", port: 0, hmr: false, ws: false }, logLevel: "error" });
        await dev.listen();
        const client = appClient("http://127.0.0.1:" + dev.httpServer.address().port);
        assert.equal((await client.request("register", { name: "Persistent profile" })).status, 200);
        const file = join(directory, ".savingsos-data", "profiles.json");
        assert.ok(readFileSync(file, "utf8").includes("Persistent profile"));
        assert.equal((await client.fetch("/.savingsos-data/profiles.json")).status, 404);
        await dev.close(); dev = null;
        production = await preview({ configFile: false, root: directory, plugins: [localAppStorage()], build: { outDir: resolve("dist") }, preview: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
        const other = appClient("http://127.0.0.1:" + production.httpServer.address().port);
        assert.ok((await other.request("state")).value.users.some(user => user.name === "Persistent profile"));
        assert.equal((await other.fetch("/.savingsos-data/profiles.json")).status, 404);
      } finally {
        if (dev) await dev.close();
        if (production) { production.httpServer.closeAllConnections(); await new Promise(resolve => production.httpServer.close(resolve)); }
        removeTemporaryAppDirectory(directory);
      }
    });
    await t.test("a damaged data file is reported without replacing or erasing it", async () => fixture(async context => {
      const client = appClient(context.running.base);
      await client.request("register", { name: "Existing" });
      writeFileSync(join(context.directory, "profiles.json"), "{broken");
      assert.equal((await client.request("state")).status, 500);
      assert.equal(readFileSync(join(context.directory, "profiles.json"), "utf8"), "{broken");
    }));
  } finally { await vite.close(); }
});
