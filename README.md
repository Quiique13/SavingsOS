# savingsOS

Plan spending, track bills and income, and manage your accounts.

## [Open the web app](https://quiique13.github.io/SavingsOS/)

| How would you like to use it? | Download or open |
| --- | --- |
| Web browser | **[Open savingsOS](https://quiique13.github.io/SavingsOS/)** |
| Windows x64, no installation | **[Download portable executable](https://github.com/Quiique13/SavingsOS/releases/download/v1.3.0/savingsOS-1.3.0-windows-x64-portable.exe)** |
| Windows x64, with shortcuts | **[Download installer](https://github.com/Quiique13/SavingsOS/releases/download/v1.3.0/savingsOS-1.3.0-windows-x64-setup.exe)** |
| Android | **[Download APK](https://github.com/Quiique13/SavingsOS/releases/latest/download/savingsOS.apk)** |
| All versions and checksums | [GitHub Releases](https://github.com/Quiique13/SavingsOS/releases) |

On Windows, double-click the executable to open the bundled app in your default browser. No Node.js or npm installation is needed. Keep its console window open while using the app; close it when finished. Local profiles work offline. Google and email accounts require internet.

The portable edition keeps local profiles in `data/` beside the executable; keep that folder when updating. The installer stores local profiles in `%APPDATA%\savingsOS\data`. See the [Windows guide](docs/windows.md) for backups and moving between editions. Windows downloads are unsigned.

Sign in with Google or email/password to sync your planner across devices, or use local profiles. The Android APK is a debug-signed test build; install updates over the existing app to retain its data.

## Development

Use Node.js 24.12 or newer:

```sh
git clone https://github.com/Quiique13/SavingsOS.git
cd SavingsOS
npm ci
npm run dev
```

On another computer, run `git pull --ff-only` and `npm ci` in your existing checkout. Private records, backups, environment files, and signing keys are excluded from Git. Sign in to your online account or transfer local profiles through a private backup.

[User guide](docs/guide.md) · [Windows setup](docs/windows.md) · [Android setup](docs/android.md) · [Firebase setup](docs/firebase.md)
