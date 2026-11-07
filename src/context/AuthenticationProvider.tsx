import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, updateProfile, type User } from "firebase/auth";
import { signInWithGoogle } from "../services/googleSignIn";
import { firebaseEnabled, getFirebase } from "../services/firebase";
import type { ProfileBackend } from "../services/cloudProfileStore";
import { firebaseError } from "../services/firebaseErrors";
import { AuthenticationContext } from "./AuthenticationContext";
import { UsersProvider } from "./UsersProvider";
import { translate, useLanguage } from "../i18n";

export function AuthenticationProvider({ children }: { children: ReactNode }) {
  useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const working = useRef(false);
  const creatingAccount = useRef(false);
  useEffect(() => {
    if (!firebaseEnabled) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    async function initialize() {
      try {
        unsubscribe = onAuthStateChanged(getFirebase().auth, next => { if (active) { if (!creatingAccount.current) setUser(next); setReady(true); } }, cause => { if (active) { setError(firebaseError(cause)); setReady(true); } });
      } catch (cause) { if (active) { setError(firebaseError(cause)); setReady(true); } }
    }
    void initialize();
    return () => { active = false; unsubscribe?.(); };
  }, []);
  const uid = user?.uid;
  const backend = useMemo<ProfileBackend | undefined>(() => {
    if (!uid) return;
    const client = import("../services/firebaseProfiles").then(module => module.createFirebaseProfileBackend(uid));
    return {
      request: async (path, input) => (await client).request(path, input),
      subscribe(next, error) {
        let active = true;
        let unsubscribe: (() => void) | undefined;
        void client.then(backend => { if (active) unsubscribe = backend.subscribe?.(next, error); }).catch(cause => { if (active) error(cause); });
        return () => { active = false; unsubscribe?.(); };
      },
    };
  }, [uid]);
  async function perform(action: () => Promise<unknown>) {
    if (working.current) throw new Error("Please wait for the current user change to finish.");
    working.current = true; setBusy(true); setError("");
    try { await action(); } catch (cause) { throw new Error(firebaseError(cause), { cause }); }
    finally { working.current = false; setBusy(false); }
  }
  const value = {
    enabled: firebaseEnabled, user, busy, error,
    leave: () => perform(() => signOut(getFirebase().auth)),
    google: () => perform(() => signInWithGoogle(getFirebase().auth)),
    email: (email: string, password: string) => perform(() => signInWithEmailAndPassword(getFirebase().auth, email.trim(), password)),
    register: (name: string, email: string, password: string) => perform(async () => {
      if (!name.trim() || name.trim().length > 50) throw new Error("Use a name with 1 to 50 characters.");
      if (password.length < 8) throw new Error("Choose a stronger password with at least 8 characters.");
      creatingAccount.current = true;
      try {
        const credential = await createUserWithEmailAndPassword(getFirebase().auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: name.trim() });
        // Verification is a separate request and can be retried in Settings.
        await sendEmailVerification(credential.user).catch(() => {});
      } finally {
        creatingAccount.current = false;
        setUser(getFirebase().auth.currentUser);
      }
    }),
    resetPassword: (email: string) => perform(() => sendPasswordResetEmail(getFirebase().auth, email.trim())),
    verifyEmail: () => perform(async () => {
      const current = getFirebase().auth.currentUser;
      if (current) await sendEmailVerification(current);
    }),
  };
  return <AuthenticationContext.Provider value={value}>
    {ready ? <UsersProvider key={user?.uid ?? "local"} backend={backend}>{children}</UsersProvider> : <div className="loading-state"><p>{translate("Opening your space...")}</p></div>}
  </AuthenticationContext.Provider>;
}
