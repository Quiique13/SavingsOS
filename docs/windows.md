# savingsOS for Windows

[Download the portable executable](https://github.com/Quiique13/SavingsOS/releases/download/v1.3.1/savingsOS-1.3.1-windows-x64-portable.exe) · [Download the installer](https://github.com/Quiique13/SavingsOS/releases/download/v1.3.1/savingsOS-1.3.1-windows-x64-setup.exe) · [All releases and SHA-256 checksums](https://github.com/Quiique13/SavingsOS/releases)

Requires Windows x64 and a modern browser. Node.js is bundled: users do not need to install development tools. The downloads are unsigned.

## Portable edition

1. Save the `.exe` in a folder where you can write files.
2. Double-click it. A console window opens and launches savingsOS in your default browser.
3. Keep the console open while using the app. Close it when finished. Closing only the browser tab leaves the local server running.

The executable includes the interface, fonts, and local storage server. Local profiles work without internet. Their records are stored in `data/profiles.json` beside the executable. To update, close the old executable, replace it with the new one, and retain `data/`. To move to another computer, close the app and copy the executable and its entire `data/` folder together.

Third-party license notices are bundled at `/THIRD_PARTY_NOTICES.txt` on the local address printed by the executable.

## Installer

The installer runs for the current Windows user and adds desktop and Start menu shortcuts. App files default to `%LOCALAPPDATA%\Programs\savingsOS`; local records are kept separately in `%APPDATA%\savingsOS\data`. Updates and uninstallation retain that data folder. Remove it yourself only if you intend to erase the local records.

Portable and installed editions have separate local profiles. Use **Settings → Export portable profile** and **Import profile** to transfer them. Existing browser profiles are also separate; they are never silently moved or replaced. Keep private backups.

## Online accounts and Firebase

Google sign-in opens a popup in your normal browser. The desktop app uses `http://localhost` on a loopback-only port; it does not use `file://` or an embedded login browser. The port can change between launches, so you may need to sign in again and reselect appearance preferences. Local profile files remain in the same folder regardless of port.

The Firebase project's **Authentication → Settings → Authorized domains** must contain `localhost`. The supplied savingsOS project already authorizes it. Other Firebase projects must add that hostname without a scheme, port, or path. See [Firebase setup](firebase.md). Google and email accounts need internet and the configured Firestore database; local profiles remain available offline. Cloud data is not automatically copied into `data/`.

The server accepts only its exact `localhost` hostname and port, listens only on loopback, serves embedded build assets, and rejects cross-site profile changes. Private profile files are not web assets and are not included in the download. Password-protected profiles retain the existing encrypted storage format.

## Build from source

Use Windows x64 and Node.js 24.12 or newer:

```sh
npm ci
npm run build:windows
npm run test:windows
```

Downloads appear in `output/windows/`, with `SHA256SUMS.txt`. The executable embeds the production web build and the existing local API using Node.js single-executable applications.

For an installer, install [NSIS](https://nsis.sourceforge.io/Download), then run:

```sh
npm run build
node scripts/build-windows.mjs --installer
npm run test:windows
```

The default compiler path is `C:/Program Files (x86)/NSIS/makensis.exe`; set `MAKENSIS` to override it. The Windows GitHub Actions workflow builds and tests both downloads. Version tags must match `package.json`; a manual run produces downloadable workflow artifacts without publishing a release.

The smoke test runs the real packaged executable with an isolated temporary profile directory. It checks embedded assets, navigation, private file denial, cross-site rejection, password protection, and profile persistence across process restarts. Completing Google OAuth or email login with a real account remains a manual check.
