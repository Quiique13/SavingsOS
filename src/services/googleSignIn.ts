import { registerPlugin } from "@capacitor/core";
import { GoogleAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, signInWithCredential, signInWithPopup, type Auth, type User } from "firebase/auth";
import { nativeApp } from "./runtime";

const GoogleIdentity = registerPlugin<{ signIn: () => Promise<{ idToken: string }> }>("GoogleIdentity");

async function nativeCredential() {
  const result = await GoogleIdentity.signIn();
  if (!result.idToken) throw new Error("Google sign-in did not return a valid identity.");
  return GoogleAuthProvider.credential(result.idToken);
}

export async function signInWithGoogle(auth: Auth) {
  if (nativeApp) return signInWithCredential(auth, await nativeCredential());
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function reauthenticateWithGoogle(user: User) {
  if (nativeApp) return reauthenticateWithCredential(user, await nativeCredential());
  return reauthenticateWithPopup(user, new GoogleAuthProvider());
}
