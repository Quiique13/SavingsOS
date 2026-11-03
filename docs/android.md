# Android APK builds

savingsOS uses Capacitor 8 to run its React interface as an Android app. Android reads and writes private on-device profile files and does not need the desktop Node server.

## Build on Windows

1. Install Android Studio and Android SDK Platform 36 through its SDK Manager. Install Build Tools 36.0.0 and accept the SDK licence when prompted.
2. Use JDK 21 for this project. Newer Android Studio installations may bundle Java 25, which is incompatible with the project's Gradle 8.14 wrapper. Set JAVA_HOME to a JDK 21 installation, or keep a private JDK in the ignored .android-tools/jdk folder.
3. Install project dependencies with npm install.
4. Run:

```powershell
npm run android:doctor
npm run android:apk
```

The build command compiles the web app, synchronizes Capacitor, stages the native project in a temporary directory outside OneDrive, runs Gradle assembleDebug, and copies the installable file to:

```text
output/android/savingsOS-debug.apk
```

For Android Studio, use npm run android:sync followed by npm run android:open. Configure its Gradle JDK as Java 21.

## Install on your phone

Copy the APK to your Android phone and open it with the Files app. If Android prompts, allow that app to install this APK. The debug APK is automatically signed and suitable for personal testing. For public distribution, create a signed release build with a private signing key and keep that key for future updates. Signing keys, SDK settings, generated web assets, and APK outputs are excluded from Git.

## Phone storage and backups

- New installations start with no profiles. Add a user on the landing page. Passwords remain optional.
- Each profile has independent finance records. Protected profiles keep the existing AES-GCM password encryption.
- Native storage uses immutable, verified file generations in the app's private data directory. A failed write does not replace the last complete save.
- Android sessions and unlocked keys stay in memory. Reopening the app after its process stops requires unlocking protected profiles again.
- The phone and computer have separate records. There is no automatic sync.
- To bring existing records to the phone, export the active user's finance backup from desktop Settings, create a profile on the phone, and restore that JSON file in phone Settings.
- Export backup and CSV actions use Android's sharing menu. Choose a file-saving app or another destination to keep a copy.
- Export before uninstalling the app or clearing its app data. Those actions remove private records. Finance exports are unencrypted.
- Admin sign-in appears separately on the Android landing page. Only an unlocked admin can manage other profiles. The browser edition keeps its /admin URL.

## Project files

- capacitor.config.ts: app identity, bundled web directory, local HTTPS origin.
- android/: native Gradle project, manifest, original app icon, and splash artwork.
- src/services/nativeProfiles.ts: offline operations using the shared profile vault.
- src/services/snapshotDisk.ts: transactional file generations.
- src/services/nativeAppApi.ts: Capacitor Filesystem adapter.
- src/services/exportFile.ts: native sharing and browser downloads.
- scripts/build-android.mjs: environment checks and APK packaging.

The APK bundles frontend code and native plugins only. Computer profiles and the .savingsos-data directory are never copied into it.
