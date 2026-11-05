import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appClient, startApp, temporaryAppDirectory, removeTemporaryAppDirectory } from "./app-server-helpers.mjs";
import { fixtureAccounts } from "./account-fixtures.mjs";

test("portable profiles transfer safely between web app copies", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  const root = temporaryAppDirectory();
  let source, destination;
  try {
    const { createAppServer } = await vite.ssrLoadModule("/server/appServer.ts");
    const { ProfileStore } = await vite.ssrLoadModule("/src/services/profileStore.ts");
    source = await startApp(createAppServer, join(root, "web"));
    destination = await startApp(createAppServer, join(root, "destinationClient"));
    const web = appClient(source.base), destinationClient = appClient(destination.base);
    await web.request("register", { name: "My profile", password: "original password" });
    const data = { ...web.state.session.data, accounts: fixtureAccounts(), income: [{ id: "salary", name: "Private transfer salary", amount: 1234, date: "2026-11-01", accountId: "moey" }] };
    await web.request("save", { data });
    const exported = await web.request("profile-export");
    assert.equal(exported.status, 200);
    const backup = exported.value;

    await t.test("only the signed-in profile is exported with password encryption intact", async () => {
      assert.equal(backup.format, "savingsos-portable-profile");
      assert.equal(backup.profile.user.id, web.state.session.user.id);
      assert.equal(backup.profile.payload.kind, "encrypted");
      assert.ok(!JSON.stringify(backup).includes("Private transfer salary"));
      assert.equal((await appClient(source.base).request("profile-export")).status, 401);
    });
    await t.test("wrong passwords and damaged files never create a destination profile", async () => {
      const before = JSON.stringify((await destinationClient.request("state")).value);
      assert.equal((await destinationClient.request("profile-import", { profile: backup, name: "My profile", password: "wrong password" })).status, 401);
      const corrupt = structuredClone(backup);
      corrupt.profile.payload.iv = "invalid";
      assert.equal((await destinationClient.request("profile-import", { profile: corrupt, name: "My profile", password: "original password" })).status, 400);
      assert.equal(JSON.stringify((await destinationClient.request("state")).value), before);
    });
    await t.test("import preserves identity and all records across a web server restart", async () => {
      const result = await destinationClient.request("profile-import", { profile: backup, name: "Imported profile", password: "original password" });
      assert.equal(result.status, 200);
      assert.equal(result.value.session.user.id, backup.profile.user.id);
      assert.equal(result.value.session.user.name, "Imported profile");
      assert.deepEqual(result.value.session.data, data);
      assert.ok(!readFileSync(join(root, "destinationClient/profiles.json"), "utf8").includes("Private transfer salary"));
      await destination.close();
      destination = await startApp(createAppServer, join(root, "destinationClient"));
      const reopened = appClient(destination.base);
      const signedIn = await reopened.request("sign-in", { id: backup.profile.user.id, password: "original password" });
      assert.deepEqual(signedIn.value.session.data, data);
    });
    await t.test("duplicate imports and admin-role tampering do not overwrite destination records", async () => {
      const client = appClient(destination.base);
      const before = readFileSync(join(root, "destinationClient/profiles.json"), "utf8");
      const duplicate = await client.request("profile-import", { profile: backup, name: "Another name", password: "original password" });
      assert.match(duplicate.value.error, /already exists/);
      const admin = structuredClone(backup);
      admin.profile.user.role = "admin";
      assert.equal((await client.request("profile-import", { profile: admin, name: "Admin", password: "original password" })).status, 400);
      assert.equal(readFileSync(join(root, "destinationClient/profiles.json"), "utf8"), before);
    });
    await t.test("signed-in users must sign out before importing", async () => {
      assert.equal((await web.request("profile-import", { profile: backup, name: "Copy", password: "original password" })).status, 403);
    });
    await t.test("profile imports are atomic, support exports, and preserve passwordless profiles", async () => {
      let stored = null, fail = true;
      const importedApp = new ProfileStore({ read: async () => stored, write: async value => { if (fail) throw Error("Disk full"); stored = value; } });
      await assert.rejects(importedApp.request("profile-import", { profile: backup, name: "Imported copy", password: "original password" }), /Disk full/);
      assert.equal(stored, null);
      assert.equal((await importedApp.request("state")).session, null);
      fail = false;
      const imported = await importedApp.request("profile-import", { profile: backup, name: "Imported copy", password: "original password" });
      assert.deepEqual(imported.session.data, data);
      const roundTrip = await importedApp.request("profile-export");
      assert.equal(roundTrip.profile.payload.kind, "encrypted");
      assert.ok(!JSON.stringify(roundTrip).includes("Private transfer salary"));
      await importedApp.request("sign-out");
      await importedApp.request("register", { name: "No password" });
      const plain = await importedApp.request("profile-export");
      assert.equal(plain.profile.payload.kind, "plain");
      const result = await appClient(destination.base).request("profile-import", { profile: plain, name: "No password", password: "" });
      assert.equal(result.status, 200);
      assert.equal(result.value.session.user.hasPassword, false);
      assert.deepEqual(result.value.session.data, plain.profile.payload.data);
    });
    await t.test("name collisions preserve both source and destination", async () => {
      const fresh = appClient(source.base);
      await fresh.request("register", { name: "No password" });
      const plain = (await fresh.request("profile-export")).value;
      const client = appClient(destination.base);
      const conflict = await client.request("profile-import", { profile: plain, name: "No password" });
      assert.equal(conflict.status, 409);
      assert.equal((await client.request("profile-import", { profile: plain, name: "New name" })).status, 200);
    });
  } finally {
    if (source) await source.close();
    if (destination) await destination.close();
    await vite.close();
    removeTemporaryAppDirectory(root);
  }
});
