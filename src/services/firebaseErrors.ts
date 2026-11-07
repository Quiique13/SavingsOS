export function firebaseError(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const messages: Record<string, string> = {
    "native-google/not-completed": "Google sign-in did not finish. If you did not cancel, check the Android app's package and signing certificate in Firebase.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/wrong-password": "The email or password is incorrect.",
    "auth/user-not-found": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "This email is already registered. Sign in or reset your password.",
    "auth/weak-password": "Choose a stronger password with at least 8 characters.",
    "auth/password-does-not-meet-requirements": "This password does not meet the account password requirements.",
    "auth/popup-blocked": "Allow pop-ups for savingsOS, then try Google sign-in again.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/cancelled-popup-request": "Google sign-in was cancelled.",
    "auth/unauthorized-domain": "This website is not enabled for sign-in. Add its hostname to Firebase authorized domains.",
    "auth/operation-not-allowed": "This sign-in method is not enabled in Firebase Authentication.",
    "auth/account-exists-with-different-credential": "This email uses another sign-in method. Sign in with that method first.",
    "auth/network-request-failed": "Check your internet connection and try again.",
    "auth/too-many-requests": "Too many attempts. Wait a moment before trying again.",
    "auth/requires-recent-login": "Sign out and sign in again before changing this account.",
    "auth/user-disabled": "This account is disabled. Contact the app owner.",
    "auth/user-mismatch": "Choose the Google account you are currently signed in with.",
    "permission-denied": "Cloud access is not available. Check that the Firestore security rules have been published.",
    "unavailable": "Cloud storage is unavailable. Check your connection and try again.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "The account request could not be completed. Try again.");
}
