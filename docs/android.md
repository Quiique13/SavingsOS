# savingsOS for Android

The Android app packages the current React interface using Capacitor. Its package/application ID is **`com.savingsos.app`**, defined in `android/app/build.gradle` and `capacitor.config.ts`. The app name is always **savingsOS**, without translation. Launcher and splash artwork come from the existing blue/mint vector logo.

## Build and install a test APK

Requirements: Node 24.12 or newer, JDK 21, Android SDK platform 36, and build-tools 36.0.0. Install Android Studio and use its SDK Manager to install missing Android tools and review their licenses. Set `JAVA_HOME` and `ANDROID_HOME` if your installations are in custom locations.

```sh
npm ci
npm run android:check
npm run android:apk
```

The APK is written to **`output/android/savingsOS-debug.apk`**. Copy it to your Android device and open it to install. This is a debug-signed test build; publishing to Google Play needs a release signing key and release build.

Other commands:

```sh
npm run android:sync   # Build web assets and sync native plugins
npm run android:open   # Sync, then open the native project in Android Studio
```

The build script checks the toolchain and stages only Android sources, packaged web assets and native plugin sources in a temporary build directory. It excludes private profile folders. Staging avoids OneDrive/Windows Java filesystem restrictions. A failed staging directory is retained for diagnosis; successful builds copy out the APK and clean up only their own checked temporary directory.

On this machine a checksum-verified Microsoft OpenJDK 21 is available in the ignored `.android-tools/jdk` directory. This directory is a local build cache, not part of the repository or APK. On other machines, use your installed JDK 21.

## Firebase sign-in

The supplied `android/app/google-services.json` registers this Android app with the same `savingsos` project used by the web app. It contains public app identifiers, not Admin SDK credentials. The Google Services Gradle plugin generates the `default_web_client_id` resource from its Web OAuth client.

`android/build.gradle` declares `com.google.gms:google-services:4.5.0` through Capacitor's `buildscript` classpath, and `android/app/build.gradle` applies `com.google.gms.google-services`. This is equivalent to the Firebase setup guide's `plugins` DSL; keep one declaration rather than adding both styles. Authentication and Firestore use the existing Firebase JavaScript SDK, so this implementation does not need a second set of native Firebase Auth/Firestore dependencies or the Analytics dependency shown in Firebase's optional example.

Email/password accounts use the existing Firebase JavaScript session. Google sign-in opens Android Credential Manager through `GoogleIdentityPlugin`, then passes the returned ID token to Firebase's `signInWithCredential`. Firestore continues using the same authenticated UID, so the same online account opens the same planner on Android and the web. Account deletion also uses native Google reauthentication on Android.

In Firebase Console → Project settings → Your apps → **Android `com.savingsos.app`**, register the signing certificate fingerprints for each APK you intend to use. The debug certificate on this machine is:

```text
SHA-1:   86:64:B3:55:A4:0F:88:3D:C4:2F:76:62:C3:58:5C:BC:7A:52:F9:96
SHA-256: E4:0E:1B:1E:FA:10:D8:30:A1:0C:79:C7:7E:04:74:B0:85:B8:02:C9:BF:61:03:23:94:AB:ED:33:18:41:EB:90
```

The configuration supplied during restoration includes a Web OAuth client, but does not list an Android OAuth client (`client_type: 1`). Verify the fingerprints are saved in Firebase, then download a refreshed `google-services.json` if needed. A missing or mismatched Android OAuth client can prevent the Google chooser from completing even when the APK builds successfully.

Other machines generate different debug certificates. Register their fingerprints too, or use a stable signing key. Release keys and Play App Signing have their own fingerprints; the debug fingerprints do not authorize a future release. Never commit signing keystores or passwords.

Google sign-in needs an Android device/emulator with Google Play services, a Google account, an internet connection, the correct OAuth registration, and the existing Firebase/Firestore setup described in [firebase.md](firebase.md). Real account sign-in and system sharing need a device check; a successful build alone does not verify them.

## Local profiles, upgrades, and backups

Local profiles live in the app's private files, using the original `savingsos/profiles` snapshot folder and vault format. This preserves compatibility with the previous `com.savingsos.app` Android build. Password-protected profiles retain their encryption. New profiles start empty; local records are never automatically uploaded when using Firebase.

Updates retain Android data when the package and signing certificate match. Do not uninstall the old app to work around a signing mismatch before exporting a backup: uninstalling removes private app data. The separate historical v2 package, if installed, has independent storage; move its records through a portable profile or finance backup.

Backup and CSV export use Android's system share sheet with temporary app-cache files. Profile/backup imports use the Android file picker. Android OS automatic app backup is disabled for the app's private finance records. Keep your own exported backups.

Android Back first dismisses an open dialog or navigation drawer, respecting busy dialog guards. Otherwise it navigates back through the app history, or minimizes the app at its starting page.

## Validate

`npm test` includes the restored snapshot-storage checks: complete records and encrypted profiles survive restart, failed writes/renames preserve acknowledged records, unfinished snapshots are ignored, and stale writes are rejected. `npm run android:apk` compiles the Java Google bridge and packages the current web assets. The GitHub Pages app still builds independently with `npm run build:web`.

References: [Capacitor Android](https://capacitorjs.com/docs/android), [Google Credential Manager](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation), [Firebase Google sign-in](https://firebase.google.com/docs/auth/android/google-signin).
