# Firebase accounts

savingsOS supports Google and email/password sign-in using the `savingsos` Firebase project. The public web configuration is in `src/services/firebase.ts`; Analytics is not initialized. Local profiles still work independently and are never uploaded automatically.

The [Android app](android.md) uses the same Firebase session and cloud planner, with Android Credential Manager for Google sign-in. Its separate Android registration and signing fingerprints are described in that guide.

## Required Firebase console setup

Complete these steps **before using online accounts with real finance records**:

1. In [Firebase Console](https://console.firebase.google.com/project/savingsos/overview), open **Authentication → Sign-in method**. Enable **Google** (select a support email) and **Email/Password** (password sign-in; email-link sign-in is not needed).
2. In **Authentication → Settings → Authorized domains**, add `localhost` and `quiique13.github.io`. Add any other development hostname you actually use. Enter hostnames without a scheme, port, or path.
3. Create a **Cloud Firestore → Standard edition** database, using production mode and your preferred region. Do not leave the database in open test mode.
4. In **Firestore Database → Rules**, replace the rules with the exact contents of [`firestore.rules`](../firestore.rules) and click **Publish**. These rules deny all other paths and prevent users from reading or writing another UID's planner. Authentication alone does not secure the database.
5. The optional `dataJson` single-field index exemption in `firestore.indexes.json` avoids indexing the large planner payload. Deploy it and the rules with the Firebase CLI if preferred:

   ```sh
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,firestore:indexes --project savingsos
   ```

The repository changes do not deploy Firebase rules, enable providers, or change your Firebase billing plan. Those console changes require your Firebase project access. There is no service-account credential in the frontend.

## Use and test

If sign-in succeeds but the planner reports unavailable cloud storage, check that the **Cloud Firestore API** is enabled for the `savingsos` project and that the `(default)` Firestore database has been created. Authentication and Firestore are separate services. Creating the database from Firebase Console is the usual setup path. After enabling it and publishing `firestore.rules`, wait for activation to propagate and use **Try again** on the sign-in screen. The app diagnoses an API-disabled response without accessing financial documents and does not create or replace a planner when its initial read fails.

Run `npm run dev`, choose **Continue with Google**, or use **Create an account** to register an email and password. Registration sends a verification email; verification can be resent from Settings. Existing email accounts can use **Forgot password?**. Google sign-in uses a popup and requests only standard identity permissions. Allow popups for the app if the browser blocks it; popup behavior should also be checked on the mobile browsers you intend to support.

Open the app on a second device and sign in to the same online account to load that account's planner. Sign out and use a different account to verify that planners stay separate. The local admin portal manages local profiles only; signing in online never grants local admin privileges.

Use **Settings → Delete online account** to remove the cloud planner and Firebase identity. This requires a separate confirmation and recent authentication (the current email password or a Google popup). It does not remove downloaded backups or local copies. Firestore deletion and Firebase Authentication deletion are separate operations: if the latter fails after the planner is deleted, the confirmation stays open with a message to retry deletion or sign out.

## Storage and conflicts

Each UID owns one document at `users/{uid}/finance/planner`. Accounts, expenses, payments, income and transfers are saved together as a validated JSON payload, so a transfer and its two balance updates are atomic. The record contains a version, revision, and server timestamp. Firestore transactions compare the saved revision before committing. Concurrent edits reject the stale writer instead of silently overwriting another device.

The single-document format is capped at 900,000 UTF-8 bytes, below Firestore's document limit. Larger planners need a future collection-based schema. Payload indexing is unnecessary because the app reads only the owner's one document.

Live server snapshots update an idle planner automatically. Updates do not replace pending/failed local edits or records currently being edited in a dialog. If a conflict occurs, export a finance backup of unsaved data and reload to fetch the current cloud version before reapplying changes.

**Online accounts require internet for loading and saving.** This implementation intentionally does not queue finance writes offline or persist cloud records to disk. An already open planner remains visible in memory, but unsuccessful saves are not presented as confirmed. Local profiles retain their existing offline IndexedDB/file storage. Account sign-in persists through Firebase Auth until sign-out. Cloud records use Firebase access controls and transport/storage encryption; they do not use the local vault's password-derived encryption. No Analytics is enabled.

## Bring an existing local planner online

1. Sign in to the original local profile with its password if protected.
2. Use **Settings → Export backup** to export the finance records. This decrypts the data locally and creates an unencrypted JSON file; keep it safe.
3. Sign out, then sign in to the online account.
4. Use **Settings → Restore backup**, select the file, and review the existing replacement confirmation. This replaces only that online account's planner.

The original local profile stays intact. Exporting a portable profile from an online account produces an unencrypted local copy, without Firebase credentials. Imported local copies do not sync back to the online account.

## Configuration

The supplied savingsOS web configuration works for local and GitHub Pages builds. To use another project, copy `.env.example` to `.env.local`, set the `VITE_FIREBASE_*` values, and rebuild. `VITE_FIREBASE_ENABLED=false` disables the online sign-in UI and keeps the original local-only flow. Vite exposes these frontend values publicly; never place Admin SDK credentials in a `VITE_*` variable.

For GitHub Actions overrides, set the same values on the `npm run build:web` step. Never mix an Auth project with a different Firestore project.

## Verification

`npm test` covers local profile compatibility, online record validation, stale writes, account isolation in the storage adapter, portable exports, failures, and auth UI behavior. Live Google popups, email delivery, deployed Firestore rules and mobile sign-in require the configured Firebase project and should be verified before release.

`npm run test:firebase:rules` runs the real Firestore security rules against a local Firebase emulator using the `demo-savingsos` project. It checks anonymous and cross-account denial, owner reads/writes/deletion, revision checks, payload validation and forbidden queries. The emulator requires a supported Java runtime (Java 21 or newer); put it on `PATH` or set `JAVA_HOME` before running. This test never writes to the live savingsOS project.

References: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [email/password authentication](https://firebase.google.com/docs/auth/web/password-auth), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions).
