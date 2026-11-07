# savingsOS

Plan spending, track bills and income, and manage your accounts.

## [Open the web app](https://quiique13.github.io/SavingsOS/)

**[Download Android APK](https://github.com/Quiique13/SavingsOS/releases/latest/download/savingsOS.apk)** · [All releases](https://github.com/Quiique13/SavingsOS/releases)

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

[User guide](docs/guide.md) · [Android setup](docs/android.md) · [Firebase setup](docs/firebase.md)
