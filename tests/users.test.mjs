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
  let alice = await vault.create(" Alice ", fixture("Alice finance"));
  const bob = await vault.create("Bob", fixture("Bob finance"));
  alice = await vault.save(alice, { ...alice.data, income: [{ id: "pay", name: "Alice salary", amount: 1500, date: "2026-10-01", accountId: "account" }] });
  assert.equal((await vault.open(bob.user.id)).data.income.length, 0);
  assert.equal((await vault.open(alice.user.id)).data.income[0].name, "Alice salary");
  await assert.rejects(vault.create("alice", fixture("duplicate")), /already exists/);
  assert.equal(vault.list().length, 2);
  assert.deepEqual(Object.keys(vault.list()[0]).sort(), ["createdAt", "hasPassword", "id", "name"]);
});

test("passwords encrypt finance records, reject wrong passwords and use a non-extractable key", async () => {
  const { vault, storage } = setup();
  const session = await vault.create("Protected", fixture("private finance detail"), pw);
  const saved = storage.getItem(USERS_KEY);
  assert.ok(!saved.includes("private finance detail"));
  assert.ok(!saved.includes(pw));
  assert.equal(session.key.extractable, false);
  await assert.rejects(crypto.subtle.exportKey("raw", session.key));
  await assert.rejects(vault.open(session.user.id), /password/);
  await assert.rejects(vault.open(session.user.id, "incorrect"), /incorrect/);
  assert.deepEqual((await vault.open(session.user.id, pw)).data, session.data);
  await assert.rejects(vault.create("Short", fixture("short"), "1234567"), /8 to 128/);
});

test("encrypted saves use fresh nonces and keep other user data intact", async () => {
  const { vault, storage } = setup();
  let alice = await vault.create("Alice", fixture("Alice private"), pw);
  const bob = await vault.create("Bob", fixture("Bob private"), pw);
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
  let session = await vault.create("Personal", fixture("my finances"));
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
  const alice = await vault.create("Alice", fixture("A"), pw);
  await vault.create("Bob", fixture("B"));
  await assert.rejects(vault.configure(alice, "BOB", null), /already exists/);
  const renamed = await vault.configure(alice, "Ana", null);
  assert.equal(renamed.user.hasPassword, true);
  assert.equal((await vault.open(renamed.user.id, pw)).user.name, "Ana");
});

test("authenticated encryption detects modified ciphertext and cross-user swaps", async () => {
  const { vault, storage } = setup();
  const a = await vault.create("One", fixture("One private"), pw);
  const b = await vault.create("Two", fixture("Two private"), pw);
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
  const stale = await vault.create("Personal", fixture("private"));
  const refreshed = await vault.configure(stale, "Personal", pw);
  await assert.rejects(vault.save(stale, stale.data), /another tab/);
  assert.equal((await vault.open(refreshed.user.id, pw)).user.hasPassword, true);
  const bob = await vault.create("Bob", fixture("Bob"));
  await vault.save(bob, bob.data);
  await vault.save(refreshed, refreshed.data); // Another user's revision does not block this one.
});

test("storage failures and damaged registries preserve saved records", async () => {
  const { vault, storage } = setup();
  const session = await vault.create("Personal", fixture("original"));
  const before = storage.getItem(USERS_KEY);
  storage.failWrites = true;
  await assert.rejects(vault.save(session, { ...session.data, expenses: [] }), /Storage is full/);
  assert.equal(storage.getItem(USERS_KEY), before);
  storage.failWrites = false;
  storage.setItem(USERS_KEY, "{broken-json");
  assert.throws(() => vault.list(), /could not be read/);
  await assert.rejects(vault.create("New", fixture("new")), /could not be read/);
  assert.equal(storage.getItem(USERS_KEY), "{broken-json");
});
