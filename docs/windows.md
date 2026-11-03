# Portable Windows app

## Open savingsOS

Double-click savingsOS-Portable.exe. It includes its own runtime and local app server, so Node.js, a browser, and Android Studio are not required.

The first start may take a few seconds while the portable executable unpacks its runtime into a temporary folder. The app then opens in its own window.

## Keep your records

A writable savingsOS-data folder is created beside the portable executable:

```text
Your folder/
  savingsOS-Portable.exe
  savingsOS-data/
    .savingsos-data/
      profiles.json
    browser/
    logs/
```

Close the app before moving it. Keep the executable and savingsOS-data together when moving to a USB drive or another computer. Replacing the executable to update the app preserves the data folder. Removing that folder deletes that portable copy's records.

Protected profiles retain password encryption. Settings can export and restore a separate finance backup. When closing the window, the app waits for queued saves. If saving fails, it keeps the window open so you can resolve it or export a backup.

The desktop app has a separate Admin sign-in on its landing page. Ordinary profiles do not gain administrative access.

## Existing development profiles

The standalone executable contains no personal records. For your own PC, after building it you can run:

```powershell
npm run windows:use-existing
```

This validates and copies the current computer profile registry into the separate portable data folder, preserving profiles, passwords, and encrypted payloads. It never overwrites an existing portable profile registry or changes the source records.

After that copy, the development app, portable app, and Android app have independent records. Use backups to transfer later changes between them.

## Build another copy

```powershell
npm install
npm run windows:portable
```

The result is output/windows/savingsOS-Portable.exe. The builder uses a temporary staging directory outside OneDrive, bundles only the frontend and desktop server, and tests both the unpacked app and the portable executable twice to verify startup, encryption, and records surviving a restart.

This build targets Windows x64. It runs without an installation wizard or administrator privileges. It is a locally built executable without a commercial publisher signing certificate.

## Source files

- desktop/main.ts: window, portable data paths, local server, downloads, close handling.
- desktop/preload.ts: narrowly scoped save-before-close bridge.
- desktop/paths.ts: portable directory selection.
- server/portableHost.ts: bundled static UI and existing private storage API.
- scripts/build-windows.mjs: Electron packaging and packaged-app checks.
- scripts/prepare-windows-data.mjs: optional personal profile copy.
