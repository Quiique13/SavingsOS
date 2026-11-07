# savingsOS

Plan your spending, track bills and income, and manage your accounts in one place.

## [Open savingsOS web app](https://quiique13.github.io/SavingsOS/)

Use it directly in your browser on desktop or mobile. No setup required.

Sign in with Google or email/password to use an online planner across devices, or keep using local profiles on this device. Online accounts require the [Firebase setup](docs/firebase.md), including published security rules. Existing local profiles are preserved.

**Android:** build an installable test APK with `npm run android:apk`. See the [Android guide](docs/android.md) for setup, Google sign-in, and existing profile compatibility.

**Continue on another computer:** use Node.js 24.12 or newer, then run `git pull --ff-only`, `npm ci`, and `npm run dev`. Source code and public Firebase app configuration are versioned. Private finance records, backups, local environment files, signing keys, build tools, and generated APKs are excluded. Use the same online account to open your cloud planner; transfer local profiles through a private exported backup. Android builds need the toolchain described in the Android guide and that computer's signing fingerprint registered in Firebase.

[Full guide](docs/guide.md) · [Deployment status](https://github.com/Quiique13/SavingsOS/actions/workflows/webapp-pages.yml)

<details>
<summary>Run locally</summary>

```sh
npm ci
npm run dev
```

Built with React, TypeScript, Vite, and Recharts. See the [guide](docs/guide.md) for builds, storage, backups, and project structure.

</details>
