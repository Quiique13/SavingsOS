import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase web app identifiers are public. Access is enforced by Authentication
// and firestore.rules, never by hiding this configuration in the frontend.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyB3LNq7q-qj6H-ufSxZ4wH32jeO-rIrt44",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "savingsos.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "savingsos",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "savingsos.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "303880340930",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:303880340930:web:e3eec48c9a9b7404f7825b",
};
export const firebaseEnabled = import.meta.env.VITE_FIREBASE_ENABLED !== "false";

export function getFirebase() {
  const app = getApps().find(app => app.name === "savingsos") ?? initializeApp(firebaseConfig, "savingsos");
  // No Analytics or persistent finance cache: signing out clears the in-memory
  // planner. Local profiles continue to use their existing encrypted storage.
  return { app, auth: getAuth(app) };
}
