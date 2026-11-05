import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { fixtureAccounts } from "./account-fixtures.mjs";

test("web profile storage transactions", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { ProfileStore } = await vite.ssrLoadModule("/src/services/profileStore.ts");
    const { saveTransfer } = await vite.ssrLoadModule("/src/utils/finance.ts");
    const make = () => {
      const files = new Map();
      let failWrite = false;
      return {
        files,
        disk: () => ({
          read: async () => files.get("registry.json") ?? null,
          write: async raw => {
            if (failWrite) throw new Error("The browser could not save these records.");
            files.set("registry.json", raw);
          },
        }),
        failWrite: value => { failWrite = value; },
      };
    };
    const latest = () => "registry.json";
    await t.test("new profiles stay empty after restart without changing an existing user's accounts", async () => {
      const fixture = make();
      let app = new ProfileStore(fixture.disk());
      let state = await app.request("register", { name: "Existing owner" });
      assert.deepEqual(state.session.data.accounts, []);
      const firstId = state.session.user.id;
      const custom = [{ ...fixtureAccounts()[0], id: "custom-bank", name: "My own account", balance: 200 }];
      state = await app.request("save", { revision: state.session.revision, data: { ...state.session.data, accounts: custom } });
      await app.request("sign-out");
      state = await app.request("register", { name: "New owner" });
      assert.deepEqual(state.session.data.accounts, []);
      const emptyId = state.session.user.id;
      await app.request("save", { revision: state.session.revision, data: state.session.data });
      app = new ProfileStore(fixture.disk());
      assert.deepEqual((await app.request("sign-in", { id: emptyId })).session.data.accounts, []);
      assert.deepEqual((await app.request("sign-in", { id: firstId })).session.data.accounts, custom);
    });
    await t.test("income, payments, transfers and backups survive a full app restart", async () => {
      const fixture = make();
      let app = new ProfileStore(fixture.disk());
      let state = await app.request("register", { name: "Web profile" });
      const id = state.session.user.id;
      let data = structuredClone(state.session.data);
      assert.deepEqual(data.accounts, []);
      data.accounts = fixtureAccounts();
      data.accounts[0].balance = 100;
      data.accounts[1].balance = 1000;
      data.income = [{ id: "salary", name: "Salary", amount: 1500, date: "2026-10-01", accountId: "moey" }];
      data.expenses = [{ id: "rent", name: "Rent", amount: 650, due: "2026-10-01", category: "Housing", frequency: "monthly", accountId: "bleap", notes: "" }];
      data.payments = { "rent:2026-10-01": "2026-10-02" };
      data = saveTransfer(data, { id: "move", fromAccountId: "moey", toAccountId: "bleap", amount: 300, date: "2026-10-15", notes: "Spending money" });
      state = await app.request("save", { revision: state.session.revision, data });
      assert.equal(state.session.data.accounts[0].balance, 400);
      assert.equal(state.session.data.accounts[1].balance, 700);
      app = new ProfileStore(fixture.disk());
      assert.equal((await app.request("state")).session, null);
      state = await app.request("sign-in", { id });
      assert.deepEqual(state.session.data, data);
      await app.request("save", { revision: state.session.revision, data: JSON.parse(JSON.stringify(data)) });
      assert.deepEqual((await app.request("state")).session.data, data);
    });
    await t.test("protected web profiles remain encrypted and require a password after restart", async () => {
      const fixture = make();
      let app = new ProfileStore(fixture.disk());
      let state = await app.request("register", { name: "Protected", password: "web password" });
      const id = state.session.user.id;
      const data = { ...state.session.data, accounts: fixtureAccounts(), income: [{ id: "secret", name: "Private salary", amount: 1700, date: "2026-10-01", accountId: "moey" }] };
      state = await app.request("save", { revision: state.session.revision, data });
      assert.ok(!fixture.files.get(latest(fixture)).includes("Private salary"));
      app = new ProfileStore(fixture.disk());
      await assert.rejects(app.request("sign-in", { id }), /password/);
      await assert.rejects(app.request("sign-in", { id, password: "incorrect" }), /incorrect/);
      state = await app.request("sign-in", { id, password: "web password" });
      assert.deepEqual(state.session.data, data);
      await assert.rejects(app.request("configure", { revision: state.session.revision, name: "Protected", password: "new password", currentPassword: "wrong password" }), /incorrect/);
      await app.request("configure", { revision: state.session.revision, name: "Protected", password: "new password", currentPassword: "web password" });
      app = new ProfileStore(fixture.disk());
      assert.deepEqual((await app.request("sign-in", { id, password: "new password" })).session.data, data);
    });
    await t.test("failed writes preserve acknowledged records and allow retry", async () => {
      const fixture = make();
      const app = new ProfileStore(fixture.disk());
      let state = await app.request("register", { name: "Durable" });
      const id = state.session.user.id;
      const before = fixture.files.get(latest(fixture));
      const changed = { ...state.session.data, accounts: fixtureAccounts(), income: [{ id: "retry", name: "Retry salary", amount: 900, date: "2026-10-01", accountId: "moey" }] };
      fixture.failWrite(true);
      await assert.rejects(app.request("save", { revision: state.session.revision, data: changed }), /could not save/);
      assert.equal(fixture.files.get(latest(fixture)), before);
      assert.deepEqual((await new ProfileStore(fixture.disk()).request("sign-in", { id })).session.data, state.session.data);
      fixture.failWrite(false);
      state = await app.request("save", { revision: state.session.revision, data: changed });
      assert.equal(state.session.data.income.length, 1);
    });
    await t.test("damaged saved registries are never replaced", async () => {
      const fixture = make();
      const app = new ProfileStore(fixture.disk());
      await app.request("register", { name: "Kept" });
      assert.equal((await new ProfileStore(fixture.disk()).request("state")).users[0].name, "Kept");
      const name = latest(fixture);
      fixture.files.set(name, "{broken");
      await assert.rejects(new ProfileStore(fixture.disk()).request("register", { name: "Replacement" }));
      assert.equal(fixture.files.get(name), "{broken");
    });
    await t.test("admin permissions and other profiles remain isolated offline", async () => {
      const fixture = make();
      const app = new ProfileStore(fixture.disk());
      let state = await app.request("register", { name: "Personal" });
      const regular = state.session.user.id;
      await assert.rejects(app.request("admin/create-user", { revision: state.session.revision, name: "Forbidden" }), /admin/);
      await assert.rejects(app.request("profiles-backup"), /admin/);
      await app.request("sign-out");
      state = await app.request("setup-admin", { name: "Admin", password: "admin password" });
      state = await app.request("admin/create-user", { revision: state.session.revision, name: "Second" });
      const second = state.users.find(user => user.name === "Second");
      const admin = state.session.user.id;
      const backup = await app.request("profiles-backup");
      assert.equal(backup.format, "savingsos-profiles-backup");
      assert.equal(backup.registry.records.length, 3);
      await app.request("admin/rename-user", { revision: state.session.revision, id: second.id, targetRevision: second.revision, name: "Renamed" });
      await app.request("admin/delete-user", { revision: state.session.revision, id: second.id, targetRevision: second.revision + 1 });
      await assert.rejects(app.request("admin/delete-user", { revision: state.session.revision, id: admin, targetRevision: state.session.revision }), /cannot be deleted/);
      await app.request("sign-out");
      state = await app.request("sign-in", { id: regular });
      assert.equal(state.session.user.name, "Personal");
      assert.equal(state.session.data.income.length, 0);
    });
    await t.test("queued stale writes cannot overwrite a more recent save", async () => {
      const fixture = make();
      const app = new ProfileStore(fixture.disk());
      const state = await app.request("register", { name: "Queued" });
      const result = await Promise.allSettled([
        app.request("save", { revision: state.session.revision, data: state.session.data }),
        app.request("save", { revision: state.session.revision, data: state.session.data }),
      ]);
      assert.equal(result[0].status, "fulfilled");
      assert.equal(result[1].status, "rejected");
    });
  } finally { await vite.close(); }
});
