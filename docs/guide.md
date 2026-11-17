# savingsOS guide

A web app for planning everyday purchases, monthly bills, annual expenses, income, accounts, and transfers. Built with React, TypeScript, Vite, and Recharts.

An Android version is available through Capacitor, using the same interface and Firebase accounts. See the [Android build and installation guide](android.md).

A [Windows portable executable and installer](windows.md) bundle the app and its local server. Double-click to open savingsOS in your browser without installing Node.js. Portable local records stay in `data/` beside the executable; the installed edition uses `%APPDATA%\savingsOS\data`.

## Open the web app

[Open savingsOS](https://quiique13.github.io/SavingsOS/) · [Deployment status](https://github.com/Quiique13/SavingsOS/actions/workflows/webapp-pages.yml)

The public link becomes available when the GitHub Pages deployment completes. The hosted edition works in your browser without running a local server. Use your browser's **Install app** or **Add to home screen** option to open savingsOS in its own window. Internet is needed to load the website.

## Run locally

```sh
npm ci
npm run dev
```

Open the address printed by Vite. This local web-server edition preserves existing profiles in `.savingsos-data/profiles.json`.

```sh
npm test
npm run build
npm run preview
```

To build the GitHub Pages edition:

```sh
npm run build:web
npm run preview:web
```

Open `/SavingsOS/` at the preview server's address. Hash routes keep navigation and reloads working on GitHub Pages. The repository uses one branch, `main`. The `savingsOS web app` workflow tests and publishes changes from `main`. Repository Pages settings use **GitHub Actions**.

## Profiles, storage, and backups

**Online accounts:** Google and email/password sign-in can sync a private planner across devices using Firebase. Follow the [Firebase setup and migration guide](firebase.md) before using cloud accounts. The local storage details below apply to local profiles. Cloud saves require internet; existing local profiles remain independent and are not uploaded automatically.

- **GitHub Pages:** profiles and finance records are saved only in this browser's IndexedDB on this device. They are not uploaded to GitHub. Each browser and device has separate records. Clearing site data or ending a private browsing session can remove this copy.
- **Local web server:** profiles are saved in `.savingsos-data/profiles.json`. Clearing browser data does not remove these app files. Keep that private folder when moving the local server.
- **Portable profile backup:** use **Settings → Export portable profile**, then **Import profile** on the user screen in another browser or device. Names, passwords, accounts, expenses, payments, income, and transfers are preserved. Imports add a profile and never overwrite an existing one. Each copy has independent records afterward.
- **Finance backup:** use **Export backup** and **Restore backup** in Settings to transfer finance records into the currently selected profile. Restore requires confirmation and keeps other users. Finance exports are unencrypted.

Password-protected profiles encrypt finance data with AES-256-GCM and keys derived using PBKDF2-SHA-256 with 600,000 iterations. Passwords are never saved. An unlocked key stays in memory until sign-out or reload. Profiles without passwords and their exports are unencrypted. Names remain visible in the user chooser. There is no password recovery; keep backups somewhere safe.

In the local web-server edition, an HttpOnly session cookie identifies the unlocked profile. Server-side checks enforce permissions and reject stale saves. In the hosted edition, a shared profile store and atomic IndexedDB transactions prevent conflicting tabs from overwriting newer records. Browser storage is tied to the site's origin; moving the website does not move saved profiles automatically.

Private app data, exports, local recovery archives, and generated output are excluded from Git and the published web bundle. Existing private profile folders are retained during source cleanup. Local browser-registry migration remains available through the local web-server edition; use a profile export to bring those records to the hosted app.

## Pages and behavior

After the first sign-in for each profile in a browser or app installation, a short
sketch-style tutorial introduces accounts, starting balances, transfers, expenses,
and the monthly overview. Use **Next** and **Back** to move between tips. **Skip
tutorial**, **Finish tutorial**, or Escape returns to Overview and remembers the
dismissal for that profile on this device. Open **About your planner → Replay
tutorial** to see it again. The tour never creates or changes financial records.

- **Overview:** monthly income, spending, payment progress, category totals, next payments, and account activity.
- **Expenses:** one-time, monthly, and annual bills, account/category assignments, due dates, payment dates, search, filters, calendar, and CSV export.
- **Income:** sources, receiving accounts, amounts, and received dates. Forms wait for confirmed saves and retain values on failure.
- **Accounts and savings:** manage your own accounts and manual balance snapshots. New users start with empty planners.
- **Reset month:** on Accounts, choose a month under **Start the month fresh**, then review the confirmation. This clears payment marks for expenses due in that month and removes transfers dated in that month, reversing their effects on recorded account balances. It keeps all income, including the previous month's funding income, all saved expense definitions, and other months. Export a backup before confirming if you want an undo copy.
- **Transfers:** record movements between your accounts, review history, edit, or confirm a reversal. These records adjust both balance snapshots without creating income or expense entries.
- **Insights:** annual expense totals, monthly charts, and annual-bill set-asides.
- **Settings:** appearance, profile name/password, profile exports, finance backup/restore, and storage details.
- **Currency:** Settings includes a display-currency selector with 19 currencies. Symbols, totals, charts, entry labels, and CSV headings follow the choice. Numeric amounts are never converted. The choice is saved for this browser/app installation, separately from the financial records.

Monthly plans use income received in the previous calendar month: October income funds November. The Income page groups receipts by the month they fund while preserving their actual received dates. Account activity keeps receipts in their actual month.

The Monthly simulator lets you vary income, extra income, extra spending, and carryover to estimate the money left at month-end. Default includes it on Overview and Income; the new themes open a dedicated simulator page. It counts every scheduled bill once, including paid bills. Scenarios stay on the current page and never change saved records or account balance snapshots.

Press the month heading to choose a month and year or return to **This month**. On phones, Default's bottom navigation opens Overview, Expenses, and Settings. The new themes show Overview, Expenses, Income, Accounts, and More; More opens the remaining destinations.

Settings includes four themes: **Default**, **Flow**, **Paper Ledger**, and **Signal Studio**. All four support light and dark mode. Default retains its initial layout and six colour schemes; retired theme selections fall back to Default. The new themes follow the supplied screen previews, including responsive page grids, a header month selector, and five-item mobile navigation. Choose **Settings → Appearance → App theme** to switch designs. The original savingsOS logo is used throughout.

Recurring bills have separate payment records for each due date. Month-end bills clamp to the final valid day and return to their original day afterward. Annual leap-day bills fall on 28 February in non-leap years. Income and bill payments do not automatically update manual account balance snapshots. There is no bank connection, payment execution, or automatic sync between profile copies.

The separate admin portal is available only by typing `/admin` after the app URL; there are no admin links in the application UI. Hosted deep links such as `/SavingsOS/admin` resolve to `/#/admin` under the app's base path. The first visit creates one password-protected administrator. Admins can manage regular users and encrypted placeholder settings. Regular users can manage their own name and password. The admin password cannot be removed. Hiding navigation does not replace authentication; existing server-side password and role checks remain in place.

## Public showcase

Open `/demo` after the app URL (for GitHub Pages, `/SavingsOS/demo` or `/SavingsOS/#/demo`). The fictional Alex Morgan profile has four invented accounts, realistic balances, six months of income and bills, payment history, savings, and transfers. Demo navigation stays under `/demo`.

The demo mounts its own providers, without loading the real authentication/profile provider. Financial edits are kept only in memory and disappear on refresh; **Reset demo** restores the starting fixture immediately. It never reads or writes real profiles. Profile security and portable-profile actions are unavailable in demo mode. Appearance and display-currency preferences still follow this browser's settings. **Exit demo** returns to the regular app.

## Project structure

```text
src/
  components/       Shared UI, grouped by feature
  context/          User, finance, and theme state
  hooks/            Shared React hooks
  pages/            Finance pages and the admin portal
  services/         Browser storage, profile vault, backups, and local web API
  styles/           Shared, page, theme, mobile, and motion styles
  types/            Finance and migration types
  utils/            Finance calculations and migration helpers
server/             Local web-server storage API
public/             Browser icons and web app manifest
tests/              Domain, UI, browser persistence, and local API checks
.github/workflows/  Web app testing and GitHub Pages deployment
```

The same web UI supports mobile and larger screens. Keep page composition in `pages`, reusable UI in `components`, and storage logic in `services`.

The product name is always **savingsOS**, with this exact spelling and capitalization in every language. Never translate the name or its individual parts. Surrounding interface text and financial terms such as “Savings” are localized normally. Keep the wordmark marked `translate="no"` to exclude it from browser translation.
