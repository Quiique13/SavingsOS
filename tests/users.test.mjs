import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compile = file => ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
const url = source => "data:text/javascript;base64," + Buffer.from(source).toString("base64");
const modelUrl = url(compile("../src/planner/model.ts"));
const { UserVault, USERS_KEY } = await import(url(compile("../src/planner/users/vault.ts").replace('from "../model"', 'from "' + modelUrl + '"')));
const fixture = name => ({
  accounts: [{ id: "account", name, provider: "Manual", kind: "Spending", balance: 125, color: "#a4d17a" }],
  expenses: [{ id: "expense", name: name + " subscription", amount: 12.99, category: "Subscriptions", accountId: "account", due: "2026-10-20", frequency: "monthly", notes: "" }],
  payments: {}, income: [], initialized: true,
});
function setup() {
  const entries = new Map();
  const storage = {
    failWrites: false,
    getItem: key => entries.get(key) ?? null,
    setItem(key, value) { if (this.failWrites) throw new Error("Storage is full"); entries.set(key, value); },
    removeItem: key => entries.delete(key),
  };
  return { storage, vault: new UserVault(storage) };
}
const pw = "a separate password 123!";

test("local users have independent finance records and case-insensitive unique names", async () => {
  const { vault } = setup();
  let alice = await vault.register(" Alice ", fixture("Alice finance"));
  const bob = await vault.register("Bob", fixture("Bob finance"));
  alice = await vault.save(alice, { ...alice.data, income: [{ id: "pay", name: "Alice salary", amount: 1500, date: "2026-10-01", accountId: "account" }] });
  assert.equal((await vault.open(bob.user.id)).data.income.length, 0);
  assert.equal((await vault.open(alice.user.id)).data.income[0].name, "Alice salary");
  await assert.rejects(vault.register("alice", fixture("duplicate")), /already exists/);
  assert.equal(vault.list().length, 2);
  assert.deepEqual(Object.keys(vault.list()[0]).sort(), ["createdAt", "hasPassword", "id", "name", "revision"]);
});

test("passwords encrypt finance records, reject wrong passwords and use a non-extractable key", async () => {
  const { vault, storage } = setup();
  const session = await vault.register("Protected", fixture("private finance detail"), pw);
  const saved = storage.getItem(USERS_KEY);
  assert.ok(!saved.includes("private finance detail"));
  assert.ok(!saved.includes(pw));
  assert.equal(session.key.extractable, false);
  await assert.rejects(crypto.subtle.exportKey("raw", session.key));
  await assert.rejects(vault.open(session.user.id), /password/);
  await assert.rejects(vault.open(session.user.id, "incorrect"), /incorrect/);
  assert.deepEqual((await vault.open(session.user.id, pw)).data, session.data);
  await assert.rejects(vault.register("Short", fixture("short"), "1234567"), /8 to 128/);
});

test("encrypted saves use fresh nonces and keep other user data intact", async () => {
  const { vault, storage } = setup();
  let alice = await vault.register("Alice", fixture("Alice private"), pw);
  const bob = await vault.register("Bob", fixture("Bob private"), pw);
  const before = JSON.parse(storage.getItem(USERS_KEY)).records[0].payload;
  const edited = { ...alice.data, payments: { "expense:2026-10-20": "2026-10-21" } };
  alice = await vault.save(alice, edited);
  const after = JSON.parse(storage.getItem(USERS_KEY)).records[0].payload;
  assert.notEqual(before.iv, after.iv);
  assert.notEqual(before.ciphertext, after.ciphertext);
  assert.deepEqual((await vault.open(alice.user.id, pw)).data, edited);
  assert.deepEqual((await vault.open(bob.user.id, pw)).data.payments, {});
});

test("setting, changing and removing passwords require the correct existing password", async () => {
  const { vault, storage } = setup();
  let session = await vault.register("Personal", fixture("my finances"));
  session = await vault.configure(session, "My name", pw);
  assert.ok(!storage.getItem(USERS_KEY).includes("my finances"));
  assert.equal(session.user.name, "My name");
  assert.equal(session.user.hasPassword, true);
  await assert.rejects(vault.configure(session, "My name", "new secure password", "wrong"), /incorrect/);
  assert.deepEqual((await vault.open(session.user.id, pw)).data, session.data);
  session = await vault.configure(session, "My name", "new secure password", pw);
  await assert.rejects(vault.open(session.user.id, pw), /incorrect/);
  assert.deepEqual((await vault.open(session.user.id, "new secure password")).data, session.data);
  await assert.rejects(vault.configure(session, "My name", "", "wrong"), /incorrect/);
  session = await vault.configure(session, "My name", "", "new secure password");
  assert.equal(session.key, null);
  assert.equal(session.user.hasPassword, false);
  assert.deepEqual((await vault.open(session.user.id)).data, session.data);
});

test("renaming a protected profile retains encryption and rejects duplicate names", async () => {
  const { vault } = setup();
  const alice = await vault.register("Alice", fixture("A"), pw);
  await vault.register("Bob", fixture("B"));
  await assert.rejects(vault.configure(alice, "BOB", null), /already exists/);
  const renamed = await vault.configure(alice, "Ana", null);
  assert.equal(renamed.user.hasPassword, true);
  assert.equal((await vault.open(renamed.user.id, pw)).user.name, "Ana");
});

test("authenticated encryption detects modified ciphertext and cross-user swaps", async () => {
  const { vault, storage } = setup();
  const a = await vault.register("One", fixture("One private"), pw);
  const b = await vault.register("Two", fixture("Two private"), pw);
  const raw = storage.getItem(USERS_KEY);
  const registry = JSON.parse(raw);
  registry.records[1].payload = { ...registry.records[0].payload };
  storage.setItem(USERS_KEY, JSON.stringify(registry));
  await assert.rejects(vault.open(b.user.id, pw), /incorrect|damaged/);
  const modified = JSON.parse(raw);
  const encrypted = modified.records[0].payload;
  encrypted.ciphertext = (encrypted.ciphertext[0] === "A" ? "B" : "A") + encrypted.ciphertext.slice(1);
  storage.setItem(USERS_KEY, JSON.stringify(modified));
  await assert.rejects(vault.open(a.user.id, pw), /incorrect|damaged/);
});

test("stale writes cannot undo a password change or overwrite another tab", async () => {
  const { vault } = setup();
  const stale = await vault.register("Personal", fixture("private"));
  const refreshed = await vault.configure(stale, "Personal", pw);
  await assert.rejects(vault.save(stale, stale.data), /another tab/);
  assert.equal((await vault.open(refreshed.user.id, pw)).user.hasPassword, true);
  const bob = await vault.register("Bob", fixture("Bob"));
  await vault.save(bob, bob.data);
  await vault.save(refreshed, refreshed.data); // Another user's revision does not block this one.
});

test("storage failures and damaged registries preserve saved records", async () => {
  const { vault, storage } = setup();
  const session = await vault.register("Personal", fixture("original"));
  const before = storage.getItem(USERS_KEY);
  storage.failWrites = true;
  await assert.rejects(vault.save(session, { ...session.data, expenses: [] }), /Storage is full/);
  assert.equal(storage.getItem(USERS_KEY), before);
  storage.failWrites = false;
  storage.setItem(USERS_KEY, "{broken-json");
  assert.throws(() => vault.list(), /could not be read/);
  await assert.rejects(vault.register("New", fixture("new")), /could not be read/);
  assert.equal(storage.getItem(USERS_KEY), "{broken-json");
});


test("a fresh installation has no default user and created users survive reloads", async () => {
  const { storage, vault } = setup();
  vault.removeDefaultProfile();
  assert.deepEqual(vault.list(), []);
  assert.equal(storage.getItem(USERS_KEY), null);
  const ana = await vault.register("Ana", fixture("Ana records"), pw);
  const personal = await vault.register("Personal", fixture("Explicitly created"));
  await vault.save(personal, personal.data);
  const reloaded = new UserVault(storage);
  reloaded.removeDefaultProfile();
  assert.deepEqual(reloaded.list().map(u => u.name), ["Ana", "Personal"]);
  assert.deepEqual((await reloaded.open(ana.user.id, pw)).data, ana.data);
});

test("the old automatic Personal profile is archived without changing other users", async () => {
  const { storage, vault } = setup();
  const personal = await vault.register("Personal", fixture("old default records"));
  const ana = await vault.register("Ana", fixture("Ana records"), pw);
  const registry = JSON.parse(storage.getItem(USERS_KEY));
  for (const record of registry.records) delete record.origin; // Registry written by the previous app.
  storage.setItem(USERS_KEY, JSON.stringify(registry));
  const originalDefault = registry.records[0];
  const originalAna = registry.records[1];
  vault.removeDefaultProfile();
  assert.deepEqual(vault.list().map(u => u.name), ["Ana"]);
  let saved = JSON.parse(storage.getItem(USERS_KEY));
  assert.deepEqual(saved.records[0], originalAna);
  assert.deepEqual(saved.archivedDefaultProfiles, [originalDefault]);
  await assert.rejects(vault.open(personal.user.id), /could not be found/);
  assert.deepEqual((await vault.open(ana.user.id, pw)).data, ana.data);
  const bob = await vault.register("Bob", fixture("Bob records"));
  await vault.save(bob, bob.data);
  vault.removeDefaultProfile();
  saved = JSON.parse(storage.getItem(USERS_KEY));
  assert.deepEqual(saved.archivedDefaultProfiles, [originalDefault]);
  assert.deepEqual(vault.list().map(u => u.name), ["Ana", "Bob"]);
});

test("protected or renamed legacy profiles remain available", async () => {
  const { storage, vault } = setup();
  const personal = await vault.register("Personal", fixture("protected"), pw);
  await vault.register("My planner", fixture("renamed"));
  const registry = JSON.parse(storage.getItem(USERS_KEY));
  for (const record of registry.records) delete record.origin;
  storage.setItem(USERS_KEY, JSON.stringify(registry));
  vault.removeDefaultProfile();
  assert.deepEqual(vault.list().map(u => u.name), ["Personal", "My planner"]);
  assert.deepEqual((await vault.open(personal.user.id, pw)).data, personal.data);
});

test("failed default-profile cleanup leaves all original profiles intact", async () => {
  const { storage, vault } = setup();
  await vault.register("Personal", fixture("keep on failure"));
  const registry = JSON.parse(storage.getItem(USERS_KEY));
  delete registry.records[0].origin;
  const before = JSON.stringify(registry);
  storage.setItem(USERS_KEY, before);
  storage.failWrites = true;
  assert.throws(() => vault.removeDefaultProfile(), /Storage is full/);
  assert.equal(storage.getItem(USERS_KEY), before);
});


const adminSettings = { workspaceName: "SavingsOS preview", supportEmail: "admin@example.com", monthlyBudget: 1500, reminderDays: 3, experimentalFeatures: false, announcement: "Sample announcement" };

test("admin setup requires a password, preserves users, and allows only one admin", async () => {
  const { storage, vault } = setup();
  const ana = await vault.register("Ana", fixture("Ana finances"), pw);
  const before = JSON.parse(storage.getItem(USERS_KEY)).records[0];
  await assert.rejects(vault.createAdmin("Admin", fixture("admin"), ""), /8 to 128/);
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  assert.equal(admin.user.role, "admin");
  assert.equal(admin.user.hasPassword, true);
  assert.deepEqual(JSON.parse(storage.getItem(USERS_KEY)).records[0], before);
  await assert.rejects(vault.createAdmin("Other admin", fixture("other"), pw), /already exists/);
  const reopened = await new UserVault(storage).open(admin.user.id, pw);
  assert.equal(reopened.user.role, "admin");
  assert.deepEqual((await vault.open(ana.user.id, pw)).data, ana.data);
  await assert.rejects(vault.configure(reopened, "Admin", "", pw), /must keep a password/);
  const renamed = await vault.configure(reopened, "Owner", null);
  assert.equal(renamed.user.role, "admin");
});

test("admin settings persist encrypted without modifying personal finance records", async () => {
  const { storage, vault } = setup();
  const ana = await vault.register("Ana", fixture("Ana finances"));
  const admin = await vault.createAdmin("Admin", fixture("admin finances"), pw);
  const saved = await vault.saveAdminSettings(admin, adminSettings);
  assert.deepEqual(saved.data.expenses, admin.data.expenses);
  assert.ok(!storage.getItem(USERS_KEY).includes("SavingsOS preview"));
  const reopened = await new UserVault(storage).open(admin.user.id, pw);
  assert.deepEqual(reopened.data.adminSettings, adminSettings);
  assert.deepEqual((await vault.open(ana.user.id)).data, ana.data);
  await assert.rejects(vault.saveAdminSettings(admin, adminSettings), /another tab/);
  for (const invalid of [{ reminderDays: 31 }, { reminderDays: 1.5 }, { monthlyBudget: -1 }, { supportEmail: "invalid" }, { workspaceName: " " }, { experimentalFeatures: "yes" }]) {
    await assert.rejects(vault.saveAdminSettings(reopened, { ...adminSettings, ...invalid }), /Check the admin/);
  }
});

test("regular and forged sessions cannot change admin settings", async () => {
  const { vault } = setup();
  const regular = await vault.register("User", fixture("user"), pw);
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  await assert.rejects(vault.saveAdminSettings(regular, adminSettings), /Sign in as the admin/);
  await assert.rejects(vault.saveAdminSettings({ ...regular, user: { ...regular.user, role: "admin" } }, adminSettings), /Sign in as the admin/);
  await assert.rejects(vault.saveAdminSettings({ ...regular, user: admin.user, revision: admin.revision }, adminSettings), /Unlock the admin/);
  await assert.rejects(vault.saveAdminSettings({ ...admin, key: null }, adminSettings), /Sign in as the admin/);
});


test("only an unlocked admin can create profiles from an active session", async () => {
  const { vault } = setup();
  const regular = await vault.register("User", fixture("user"), pw);
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  await assert.rejects(vault.create(null, "Denied", fixture("denied")), /Sign in as the admin/);
  await assert.rejects(vault.create(regular, "Denied", fixture("denied")), /Sign in as the admin/);
  await assert.rejects(vault.create({ ...regular, user: admin.user, revision: admin.revision }, "Forged", fixture("forged")), /Unlock the admin/);
  const created = await vault.create(admin, "Managed", fixture("managed"), pw);
  assert.equal(created.user.role, undefined);
  assert.deepEqual((await vault.open(created.user.id, pw)).data, created.data);
  assert.equal((await vault.open(admin.user.id, pw)).user.role, "admin");
});

test("public registration creates a separate regular profile without editing existing users", async () => {
  const { vault, storage } = setup();
  await vault.createAdmin("Admin", fixture("admin"), pw);
  const before = storage.getItem(USERS_KEY);
  const newUser = await vault.register("New person", fixture("new"));
  assert.equal(newUser.user.role, undefined);
  assert.deepEqual(JSON.parse(storage.getItem(USERS_KEY)).records.slice(0, -1), JSON.parse(before).records);
});

test("admin renames preserve encrypted finance data and enforce unique names", async () => {
  const { vault, storage } = setup();
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  const regular = await vault.register("Ana", fixture("private finance"), pw);
  await vault.register("Bob", fixture("bob"));
  const before = JSON.parse(storage.getItem(USERS_KEY)).records.find(r => r.user.id === regular.user.id).payload;
  await assert.rejects(vault.renameUser(admin, regular.user.id, regular.revision, "BOB"), /already exists/);
  await vault.renameUser(admin, regular.user.id, regular.revision, "Anabela");
  const reopened = await vault.open(regular.user.id, pw);
  assert.equal(reopened.user.name, "Anabela");
  assert.deepEqual(reopened.data, regular.data);
  assert.deepEqual(JSON.parse(storage.getItem(USERS_KEY)).records.find(r => r.user.id === regular.user.id).payload, before);
  await assert.rejects(vault.renameUser(admin, regular.user.id, regular.revision, "Stale"), /changed in another tab/);
});

test("admin deletion removes only the selected profile and prevents stale saves resurrecting it", async () => {
  const { vault, storage } = setup();
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  const target = await vault.register("Delete me", fixture("target"), pw);
  const kept = await vault.register("Keep me", fixture("keep"));
  const before = JSON.parse(storage.getItem(USERS_KEY)).records.filter(r => r.user.id !== target.user.id);
  await vault.deleteUser(admin, target.user.id, target.revision);
  assert.deepEqual(JSON.parse(storage.getItem(USERS_KEY)).records, before);
  await assert.rejects(vault.open(target.user.id, pw), /could not be found/);
  await assert.rejects(vault.save(target, target.data), /another tab/);
  assert.deepEqual((await vault.open(kept.user.id)).data, kept.data);
  assert.equal((await vault.open(admin.user.id, pw)).user.role, "admin");
});

test("profile management blocks regular users, forged sessions and deleting the admin", async () => {
  const { vault } = setup();
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  const regular = await vault.register("Regular", fixture("regular"), pw);
  for (const session of [null, regular, { ...regular, user: { ...regular.user, role: "admin" } }, { ...admin, key: null }]) {
    await assert.rejects(vault.deleteUser(session, regular.user.id, regular.revision), /Sign in as the admin/);
    await assert.rejects(vault.renameUser(session, regular.user.id, regular.revision, "Changed"), /Sign in as the admin/);
  }
  const forged = { ...regular, user: admin.user, revision: admin.revision };
  await assert.rejects(vault.deleteUser(forged, regular.user.id, regular.revision), /Unlock the admin/);
  await assert.rejects(vault.deleteUser(admin, admin.user.id, admin.revision), /cannot be deleted/);
  await assert.rejects(vault.renameUser(admin, admin.user.id, admin.revision, "Other"), /admin account settings/);
});

test("changed profiles and failed writes cannot be deleted using a stale confirmation", async () => {
  const { vault, storage } = setup();
  const admin = await vault.createAdmin("Admin", fixture("admin"), pw);
  const original = await vault.register("Active user", fixture("user"));
  const current = await vault.save(original, { ...original.data, expenses: [] });
  await assert.rejects(vault.deleteUser(admin, original.user.id, original.revision), /changed in another tab/);
  const before = storage.getItem(USERS_KEY);
  storage.failWrites = true;
  await assert.rejects(vault.deleteUser(admin, current.user.id, current.revision), /Storage is full/);
  assert.equal(storage.getItem(USERS_KEY), before);
  storage.failWrites = false;
  await vault.deleteUser(admin, current.user.id, current.revision);
  assert.ok(!vault.list().some(user => user.id === current.user.id));
});
