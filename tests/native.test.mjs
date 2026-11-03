import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("offline Android profile storage", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { NativeProfiles } = await vite.ssrLoadModule("/src/services/nativeProfiles.ts");
    const { createSnapshotDisk } = await vite.ssrLoadModule("/src/services/snapshotDisk.ts");
    const { saveTransfer } = await vite.ssrLoadModule("/src/utils/finance.ts");
    const make = () => {
      const files = new Map();
      let failWrite = false, failRename = false;
      const port = {
        async list() { return [...files.keys()]; },
        async read(name) { if (!files.has(name)) throw Error("Missing fixture"); return files.get(name); },
        async write(name, data) { if (failWrite) throw Error("Disk full"); files.set(name, data); },
        async rename(from, to) { if (failRename) throw Error("Rename failed"); files.set(to, files.get(from)); files.delete(from); },
        async remove(name) { files.delete(name); },
      };
      return { files, disk: () => createSnapshotDisk(port), failWrite: value => { failWrite = value; }, failRename: value => { failRename = value; } };
    };
    const latest = fixture => [...fixture.files.keys()].filter(name => name.endsWith(".json")).sort().at(-1);

    await t.test("income, payments, transfers and backups survive a full app restart", async () => {
      const fixture = make();
      let app = new NativeProfiles(fixture.disk());
      let state = await app.request("register", { name: "Phone profile" });
      const id = state.session.user.id;
      let data = structuredClone(state.session.data);
      data.accounts[0].balance = 100;
      data.accounts[1].balance = 1000;
      data.income = [{ id: "salary", name: "Salary", amount: 1500, date: "2026-10-01", accountId: "moey" }];
      data.expenses = [{ id: "rent", name: "Rent", amount: 650, due: "2026-10-01", category: "Housing", frequency: "monthly", accountId: "bleap", notes: "" }];
      data.payments = { "rent:2026-10-01": "2026-10-02" };
      data = saveTransfer(data, { id: "move", fromAccountId: "moey", toAccountId: "bleap", amount: 300, date: "2026-10-15", notes: "Spending money" });
      state = await app.request("save", { revision: state.session.revision, data });
      assert.equal(state.session.data.accounts[0].balance, 400);
      assert.equal(state.session.data.accounts[1].balance, 700);
      app = new NativeProfiles(fixture.disk());
      assert.equal((await app.request("state")).session, null);
      state = await app.request("sign-in", { id });
      assert.deepEqual(state.session.data, data);
      await app.request("save", { revision: state.session.revision, data: JSON.parse(JSON.stringify(data)) });
      assert.deepEqual((await app.request("state")).session.data, data);
      assert.equal([...fixture.files.keys()].filter(name => name.endsWith(".json")).length, 2);
    });
    await t.test("protected profiles remain encrypted on the phone and require a password after restart", async () => {
      const fixture = make();
      let app = new NativeProfiles(fixture.disk());
      let state = await app.request("register", { name: "Protected", password: "phone password" });
      const id = state.session.user.id;
      const data = { ...state.session.data, income: [{ id: "secret", name: "Private salary", amount: 1700, date: "2026-10-01", accountId: "moey" }] };
      state = await app.request("save", { revision: state.session.revision, data });
      assert.ok(!fixture.files.get(latest(fixture)).includes("Private salary"));
      app = new NativeProfiles(fixture.disk());
      await assert.rejects(app.request("sign-in", { id }), /password/);
      await assert.rejects(app.request("sign-in", { id, password: "incorrect" }), /incorrect/);
      state = await app.request("sign-in", { id, password: "phone password" });
      assert.deepEqual(state.session.data, data);
      await assert.rejects(app.request("configure", { revision: state.session.revision, name: "Protected", password: "new password", currentPassword: "wrong password" }), /incorrect/);
      await app.request("configure", { revision: state.session.revision, name: "Protected", password: "new password", currentPassword: "phone password" });
      app = new NativeProfiles(fixture.disk());
      assert.deepEqual((await app.request("sign-in", { id, password: "new password" })).session.data, data);
    });
    await t.test("failed writes or renames preserve acknowledged records and allow retry", async () => {
      const fixture = make();
      const app = new NativeProfiles(fixture.disk());
      let state = await app.request("register", { name: "Durable" });
      const id = state.session.user.id;
      const before = fixture.files.get(latest(fixture));
      const changed = { ...state.session.data, income: [{ id: "retry", name: "Retry salary", amount: 900, date: "2026-10-01", accountId: "moey" }] };
      fixture.failWrite(true);
      await assert.rejects(app.request("save", { revision: state.session.revision, data: changed }), /could not save/);
      fixture.failWrite(false); fixture.failRename(true);
      await assert.rejects(app.request("save", { revision: state.session.revision, data: changed }), /could not save/);
      assert.equal(fixture.files.get(latest(fixture)), before);
      assert.deepEqual((await new NativeProfiles(fixture.disk()).request("sign-in", { id })).session.data, state.session.data);
      fixture.failRename(false);
      state = await app.request("save", { revision: state.session.revision, data: changed });
      assert.equal(state.session.data.income.length, 1);
    });
    await t.test("unfinished snapshots are ignored and damaged committed files are never replaced", async () => {
      const fixture = make();
      const app = new NativeProfiles(fixture.disk());
      await app.request("register", { name: "Kept" });
      fixture.files.set("9999999999999999-interrupted.json.tmp", "{partial");
      assert.equal((await new NativeProfiles(fixture.disk()).request("state")).users[0].name, "Kept");
      const name = latest(fixture);
      fixture.files.set(name, "{broken");
      await assert.rejects(new NativeProfiles(fixture.disk()).request("register", { name: "Replacement" }));
      assert.equal(fixture.files.get(name), "{broken");
    });
    await t.test("admin permissions and other profiles remain isolated offline", async () => {
      const fixture = make();
      const app = new NativeProfiles(fixture.disk());
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
      const app = new NativeProfiles(fixture.disk());
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
