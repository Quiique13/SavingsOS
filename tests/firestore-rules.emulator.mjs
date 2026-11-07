import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

// This suite must run against the demo emulator, never a live Firebase project.
test("Firestore rules enforce private, revisioned planners", async t => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, "Run this suite with npm run test:firebase:rules");
  const environment = await initializeTestEnvironment({
    projectId: "demo-savingsos",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  try {
    const alice = environment.authenticatedContext("alice", { email: "alice@example.test" }).firestore();
    const bob = environment.authenticatedContext("bob", { email: "bob@example.test" }).firestore();
    const anonymous = environment.unauthenticatedContext().firestore();
    const reference = doc(alice, "users/alice/finance/planner");
    const payload = { version: 1, revision: 1, dataJson: JSON.stringify({ accounts: [], expenses: [], income: [], payments: {}, transfers: [] }), updatedAt: serverTimestamp() };
    await t.test("owners create and read their own planner", async () => {
      await assertSucceeds(setDoc(reference, payload));
      assert.equal((await assertSucceeds(getDoc(reference))).data().revision, 1);
    });
    await t.test("unauthenticated clients and other users cannot read, update or delete it", async () => {
      for (const db of [anonymous, bob]) {
        const other = doc(db, "users/alice/finance/planner");
        await assertFails(getDoc(other));
        await assertFails(setDoc(other, { ...payload, revision: 2 }));
        await assertFails(deleteDoc(other));
      }
      await assertFails(setDoc(doc(alice, "users/bob/finance/planner"), payload));
    });
    await t.test("stale revisions, extra fields, wrong schema versions and fake timestamps are rejected", async () => {
      await assertFails(setDoc(reference, payload));
      await assertFails(updateDoc(reference, { revision: 3, updatedAt: serverTimestamp() }));
      await assertFails(setDoc(reference, { ...payload, revision: 2, role: "admin" }));
      await assertFails(setDoc(reference, { ...payload, version: 2, revision: 2 }));
      await assertFails(setDoc(reference, { ...payload, revision: 2, updatedAt: new Date(0) }));
      await assertFails(setDoc(reference, { ...payload, revision: 2, dataJson: "x".repeat(900001) }));
      await assertSucceeds(setDoc(reference, { ...payload, revision: 2 }));
    });
    await t.test("collection queries and all unrecognized paths are denied", async () => {
      await assertFails(getDocs(collection(alice, "users/alice/finance")));
      await assertFails(setDoc(doc(alice, "users/alice"), { role: "admin" }));
      await assertFails(setDoc(doc(alice, "admin/settings"), { role: "admin" }));
    });
    await t.test("owners can delete their planner without deleting another user's records", async () => {
      const own = doc(bob, "users/bob/finance/planner");
      await assertSucceeds(setDoc(own, payload));
      await assertSucceeds(deleteDoc(reference));
      assert.equal((await assertSucceeds(getDoc(reference))).exists(), false);
      assert.equal((await assertSucceeds(getDoc(own))).exists(), true);
    });
  } finally { await environment.cleanup(); }
});
