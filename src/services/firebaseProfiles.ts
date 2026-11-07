import { doc, getDocFromServer, getFirestore, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, signOut, updateProfile, type User as FirebaseUser } from "firebase/auth";
import { reauthenticateWithGoogle } from "./googleSignIn";
import { firebaseConfig, getFirebase } from "./firebase";
import { firestoreConnectionError } from "./firestoreConnection";
import { createCloudProfileBackend, parseCloudRecord, type CloudRecord } from "./cloudProfileStore";
import type { User } from "./profileVault";

export function firebaseIdentity(user: FirebaseUser): User {
  return { id: user.uid, name: (user.displayName || user.email?.split("@")[0] || "savingsOS").slice(0, 50), email: user.email ?? undefined,
    authProvider: "firebase", hasPassword: false, role: "user", createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : new Date().toISOString() };
}

export function createFirebaseProfileBackend(uid: string) {
  const { auth, app } = getFirebase();
  const db = getFirestore(app);
  const reference = doc(db, "users", uid, "finance", "planner");
  function currentUser() {
    if (auth.currentUser?.uid !== uid) throw new Error("The signed-in account changed. Sign in again before saving.");
    return auth.currentUser;
  }
  return createCloudProfileBackend(() => firebaseIdentity(currentUser()), {
    async read() {
      currentUser();
      const snapshot = await getDocFromServer(reference).catch(async error => {
        throw await firestoreConnectionError(error, firebaseConfig.projectId, firebaseConfig.apiKey);
      });
      currentUser();
      return snapshot.exists() ? snapshot.data() : null;
    },
    async write(expectedRevision: number, record: CloudRecord) {
      currentUser();
      if (typeof navigator !== "undefined" && !navigator.onLine)
        throw new Error("You are offline. Reconnect before saving your cloud planner. Local profiles remain available offline.");
      await runTransaction(db, async transaction => {
        currentUser();
        const snapshot = await transaction.get(reference);
        const revision = snapshot.exists() ? parseCloudRecord(snapshot.data()).revision : 0;
        if (revision !== expectedRevision)
          throw new Error("Your planner changed on another device. Export unsaved records, then reload before trying again.");
        transaction.set(reference, { ...record, updatedAt: serverTimestamp() });
      });
      currentUser();
    },
    subscribe(next, error) {
      return onSnapshot(reference, { includeMetadataChanges: true }, snapshot => {
        // Do not acknowledge local echoes or cached results as confirmed saves.
        if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) return;
        try { currentUser(); next(snapshot.exists() ? snapshot.data() : null); } catch (cause) { error(cause); }
      }, error);
    },
    async rename(name) { await updateProfile(currentUser(), { displayName: name }); },
    async signOut() { currentUser(); await signOut(auth); },
    async remove(expectedRevision, password) {
      const user = currentUser();
      if (user.providerData.some(provider => provider.providerId === "password")) {
        await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email!, password));
      } else await reauthenticateWithGoogle(user);
      currentUser();
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (snapshot.exists() && parseCloudRecord(snapshot.data()).revision !== expectedRevision)
          throw new Error("Your planner changed on another device. Export unsaved records, then reload before trying again.");
        transaction.delete(reference);
      });
      try { await deleteUser(user); }
      catch (cause) {
        // Keep the confirmation open so a partial failure stays visible and can
        // be retried. No follow-up request recreates the removed planner.
        throw new Error("Your cloud planner was deleted, but account removal did not finish. Retry deletion or sign out.", { cause });
      }
    },
  });
}
