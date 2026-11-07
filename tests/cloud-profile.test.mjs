import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

test("online planners preserve records across devices and reject stale saves", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { createCloudProfileBackend, cloudRecord, parseCloudRecord } = await vite.ssrLoadModule("/src/services/cloudProfileStore.ts");
    const { createInitialData } = await vite.ssrLoadModule("/src/utils/initialData.ts");
    const { parsePortableProfile } = await vite.ssrLoadModule("/src/services/portableProfile.ts");
    const { firebaseError } = await vite.ssrLoadModule("/src/services/firebaseErrors.ts");
    const { firestoreConnectionError, firestoreSetupMessage } = await vite.ssrLoadModule("/src/services/firestoreConnection.ts");
    const user = { id: "firebase-user-1", name: "Ana", role: "admin", hasPassword: true, createdAt: "2026-11-07T12:00:00.000Z", email: "ana@example.test" };
    const planners = new Map();
    const listeners = new Map();
    let writes = 0;
    let unavailable = false;
    function client(id = user.id) {
      return createCloudProfileBackend(() => ({ ...user, id }), {
        async read() { if (unavailable) throw new Error("Network unavailable"); return structuredClone(planners.get(id) ?? null); },
        async write(expected, next) {
          if (unavailable) throw new Error("Network unavailable");
          if ((planners.get(id)?.revision ?? 0) !== expected) throw new Error("Changed on another device");
          planners.set(id, structuredClone(next)); writes++;
          for (const listener of listeners.get(id) ?? []) listener(next);
        },
        subscribe(next) {
          const set = listeners.get(id) ?? new Set(); listeners.set(id, set); set.add(next);
          return () => set.delete(next);
        },
        async rename(name) { user.name = name; },
        async signOut() {},
        async remove(revision, password) {
          if (password !== "correct password") throw new Error("Wrong password");
          if (planners.get(id)?.revision !== revision) throw new Error("Changed on another device");
          planners.delete(id);
        },
      });
    }
    const a = client();
    const b = client();
    let first, saved;
    await t.test("first online sign-in creates one empty planner without importing local data or admin privileges", async () => {
      first = await a.request("state");
      assert.deepEqual(first.session.data, createInitialData());
      assert.equal(first.session.user.role, "user");
      assert.equal(first.session.user.hasPassword, false);
      assert.equal(first.session.user.authProvider, "firebase");
      assert.equal(writes, 1);
      assert.deepEqual((await b.request("state")).session.data, first.session.data);
      assert.equal(writes, 1);
    });
    await t.test("a second device loads the same confirmed accounts, income, payments and transfers", async () => {
      const data = { ...createInitialData(), accounts: [
        { id: "daily", name: "Everyday", provider: "Manual", kind: "Spending", balance: 900, color: "#a4d17a" },
        { id: "reserve", name: "Savings", provider: "Manual", kind: "Savings", balance: 300, color: "#b2cbd5" },
      ], income: [{ id: "salary", name: "Salary", amount: 1200, accountId: "daily", date: "2026-11-07" }],
        expenses: [{ id: "bill", name: "Bill", amount: 20, accountId: "daily", category: "Housing", due: "2026-11-07", frequency: "once", notes: "" }],
        payments: { "bill:2026-11-07": "2026-11-07" },
        transfers: [{ id: "transfer", fromAccountId: "daily", toAccountId: "reserve", amount: 300, date: "2026-11-07", notes: "Savings" }],
      };
      saved = await a.request("save", { revision: first.session.revision, data });
      assert.equal(saved.session.revision, 2);
      assert.deepEqual((await b.request("state")).session.data, data);
      await assert.rejects(b.request("save", { revision: 1, data: createInitialData() }), /another device/);
      assert.deepEqual((await a.request("state")).session.data, data);
    });
    await t.test("a different UID starts separately and cannot mutate another planner through input IDs", async () => {
      const other = client("firebase-user-2");
      const empty = await other.request("state");
      await other.request("save", { revision: empty.session.revision, userId: user.id, data: createInitialData() });
      assert.deepEqual((await a.request("state")).session.data, saved.session.data);
      assert.deepEqual((await other.request("state")).session.data.accounts, []);
    });
    await t.test("invalid, oversized and corrupt cloud records fail without replacement", async () => {
      const before = writes;
      await assert.rejects(a.request("save", { revision: 2, data: { accounts: [] } }), /invalid/);
      assert.throws(() => cloudRecord({ ...createInitialData(), unknown: "x".repeat(900001) }, 3), /too large/);
      assert.throws(() => parseCloudRecord({ version: 1, revision: 2, dataJson: "broken" }), /could not be read/);
      assert.equal(writes, before);
      const record = planners.get(user.id);
      planners.set(user.id, { ...record, dataJson: "broken" });
      await assert.rejects(a.request("state"), /could not be read/);
      assert.equal(writes, before);
      planners.set(user.id, record);
    });
    await t.test("network failures preserve the last acknowledged planner and failed first loads do not create data", async () => {
      unavailable = true;
      const before = writes;
      await assert.rejects(a.request("save", { revision: 2, data: createInitialData() }), /Network/);
      await assert.rejects(client("offline-new-user").request("state"), /Network/);
      assert.equal(writes, before);
      unavailable = false;
      assert.deepEqual((await a.request("state")).session.data, saved.session.data);
    });
    await t.test("live updates are scoped to the selected account and unsubscribe cleanly", async () => {
      const updates = [];
      const stop = b.subscribe(state => updates.push(state), error => { throw error; });
      saved = await a.request("save", { revision: 2, data: saved.session.data });
      assert.equal(updates.length, 1);
      assert.equal(updates[0].session.revision, 3);
      stop();
      saved = await a.request("save", { revision: 3, data: saved.session.data });
      assert.equal(updates.length, 1);
    });
    await t.test("portable exports contain finance data and no Firebase credentials or local admin authority", async () => {
      const exported = parsePortableProfile(await a.request("profile-export"));
      assert.equal(exported.profile.payload.kind, "plain");
      assert.equal(exported.profile.user.hasPassword, false);
      assert.equal(exported.profile.user.role, "user");
      assert.equal(JSON.stringify(exported).includes("ana@example.test"), false);
      assert.deepEqual(exported.profile.payload.data, saved.session.data);
      await assert.rejects(a.request("admin/create-user", {}), /local profiles/);
      await assert.rejects(a.request("configure", { name: "Ana", password: "new password" }), /account settings/);
    });
    await t.test("deleted planners are not recreated by exports and deletion requires reauthentication", async () => {
      await assert.rejects(a.request("delete-account", { revision: 4, password: "wrong" }), /Wrong password/);
      assert.ok(planners.has(user.id));
      await a.request("delete-account", { revision: 4, password: "correct password" });
      const before = writes;
      await assert.rejects(a.request("profile-export"), /was removed/);
      assert.equal(writes, before);
    });
    await t.test("Firebase errors give actionable messages without exposing SDK internals", () => {
      assert.match(firebaseError({ code: "auth/popup-blocked" }), /pop-ups/);
      assert.match(firebaseError({ code: "permission-denied" }), /security rules/);
      assert.equal(firebaseError({ code: "auth/user-not-found" }), firebaseError({ code: "auth/wrong-password" }));
      assert.match(firebaseError({ code: "native-google/not-completed" }), /If you did not cancel/);
      assert.equal(firebaseError({ code: "auth/popup-closed-by-user" }), "Google sign-in was cancelled.");
    });
    await t.test("disabled Firestore is diagnosed separately from genuine network and permission failures", async () => {
      const offline = Object.assign(new Error("Client is offline"), { code: "unavailable" });
      const diagnosed = await firestoreConnectionError(offline, "demo-savingsos", "public-key", async (url, options) => {
        assert.match(url, /\/databases\/\(default\)\?key=/);
        assert.ok(!url.includes("/documents/"));
        assert.equal(options.credentials, "omit");
        assert.equal(options.headers, undefined);
        return new Response(JSON.stringify({ error: { details: [{ reason: "SERVICE_DISABLED" }] } }), { status: 403 });
      });
      assert.equal(firebaseError(diagnosed), firestoreSetupMessage);
      assert.equal(diagnosed.cause, offline);
      const denied = Object.assign(new Error("Missing permissions"), { code: "permission-denied" });
      assert.equal(await firestoreConnectionError(denied, "demo-savingsos", "key", async () => { assert.fail("Permission errors must not trigger a network probe"); }), denied);
      assert.equal(await firestoreConnectionError(offline, "demo-savingsos", "key", async () => { throw new TypeError("Failed to fetch"); }), offline);
      assert.equal(await firestoreConnectionError(offline, "demo-savingsos", "key", async () => new Response(JSON.stringify({ error: { status: "PERMISSION_DENIED" } }), { status: 403 })), offline);
    });
  } finally { await vite.close(); }
});
