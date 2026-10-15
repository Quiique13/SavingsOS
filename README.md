# SavingsOS

A personal finance planner for everyday purchases, monthly bills, and annual expenses. Built with React, TypeScript, Vite, and Recharts.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The home page opens the expense workspace.

```sh
npm test
npm run build
```

## Pages

- **Overview:** monthly income, planned spending, payment progress, categories, and next payments.
- **Expenses:** add, edit, and delete one-time, monthly, and annual bills. Assign an account and category, set due dates, and record the actual payment date. Search, filter, export CSV, or switch to a payment calendar.
- **Income:** record income sources, receiving accounts, amounts, and dates.
- **Accounts:** Bleap, moey! by Crédito Agrícola, and Trading 212 are preconfigured. Accounts can be added and edited.
- **Savings & investments:** reported balances for savings accounts, including Trading 212.
- **Insights:** annual scheduled and paid expense totals, monthly charts, and monthly set-aside amounts for annual bills.
- **Settings:** create users, rename the current user, add/change/remove passwords, switch profiles, export and restore a JSON backup, remove sample expenses, and review storage details.

## Storage and payment behavior

Records are saved in this browser under `savings-os-users-v1`, with separate finance records for each local user. There is no bank connection, online user account, cloud sync, or automatic payment execution. Account balances are manual snapshots and are independent of bill payments.

Existing planner records are migrated into a **Personal** user profile. The old `savings-os-planner-v1` local-storage copy is removed only after the new profile is successfully stored. When no current planner exists, the app reads existing accounts and income/expense transactions from the original `savings-os-db` IndexedDB database. Original IndexedDB records are not modified. Existing expense transactions are imported as paid one-time purchases using their transaction dates. Transfers remain preserved in the original database.

The initial Personal profile without existing expense transactions includes clearly labeled sample expenses. Additional users start with empty planners and the three default account names. **Start fresh** removes only sample records; personal entries are kept.

Each recurring expense has a separate payment record for each due date. Paying one month does not mark future months paid. Month-end bills fall on the last valid day of shorter months and return to their original day afterward. Annual leap-day bills fall on 28 February in non-leap years. Future occurrences are generated from each expense's first due date.

Editing an expense updates its schedule and details across the planner; deleting it removes its payment history. Export a backup before major changes. Finance backups restore only the active user profile and are validated before replacement. Other users and passwords are unchanged. These JSON exports are unencrypted and should be stored securely. Clearing browser data removes the planner; keep backups somewhere safe.

## Local users and passwords

Create users under **Settings → Users & passwords** or from the user chooser. Switch or sign out using the sidebar profile controls. New users have separate accounts, balances, expenses, payment history, and income; no existing user data is copied into their planners. Names must be unique without regard to case.

Passwords are optional and must be 8–128 characters. Protected profiles encrypt their saved finance payload with AES-256-GCM, a random 96-bit nonce on every save, and an authenticated binding to the profile ID. Keys are derived with PBKDF2-SHA-256 (600,000 iterations) and a random per-password 128-bit salt using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey). Passwords are never saved, and derived keys are non-extractable and held in memory for the unlocked session. HTTPS or localhost is required for password protection.

Protected profiles require their password after a page reload or sign-out. Password changes and removal require the current password. There is no password recovery; if a password is forgotten, create a new user and restore an existing finance backup. Passwordless profiles can be opened by anyone using the same browser. Profile names remain visible in the chooser.

This is local profile protection, not server-backed authentication or protection from malicious code running in an unlocked app. Original legacy IndexedDB records, older exports, and external copies are not encrypted by setting a profile password. Clearing browser storage removes local users and finance data.

Saves are queued before switching users, and per-profile revision checks reject stale writes from another tab instead of overwriting a newer profile or password. If a conflict occurs, export the unsaved planner from Settings, then reload.

## Appearance

Use the moon/sun button in the top bar, or choose **Light mode** / **Dark mode** under **Settings → Appearance**. The sign-in screen also has a theme toggle. The choice is saved on this browser under `savings-os-theme` and synchronizes across open tabs. On a first visit, the app uses the device color preference. The saved theme is applied before the app renders to avoid a bright flash when opening dark mode.

The sidebar and mobile header share the original `public/SOSLogo.svg` logo and wordmark, with the desktop logo row aligned to the top bar.
