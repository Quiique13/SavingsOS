# savingsOS

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

- **Overview:** monthly income, planned spending, payment progress, categories, next payments, per-account money in/out, and transfer history.
- **Expenses:** add, edit, and delete one-time, monthly, and annual bills. Assign an account and category, set due dates, and record the actual payment date. Search, filter, export CSV, or switch to a payment calendar.
- **Income:** record income sources, receiving accounts, amounts, and dates. Saving waits for confirmation from the app server and opens the month of the received date. Errors keep the form and entered values available for retry; an empty month links to the latest saved income month.
- **Accounts:** Bleap, moey! by Crédito Agrícola, and Trading 212 are preconfigured. Accounts can be added and edited. Move money updates both recorded account balances.
- **Transfers:** record money moved between your own accounts, choose source/destination, amount, date, and notes; review monthly history, edit transfers, or delete and reverse them.
- **Savings & investments:** reported balances for savings accounts, including Trading 212.
- **Insights:** annual scheduled and paid expense totals, monthly charts, and monthly set-aside amounts for annual bills.
- **Settings:** a dedicated page loaded with the main app, with appearance controls, the current profile, and finance backups. Rename the current user, add/change/remove passwords, switch profiles, export and restore a JSON backup, remove sample expenses, and review storage details.

## Storage and payment behavior

Users, profiles, balances, expenses, income, payments, and admin settings are stored in **`.savingsos-data/profiles.json`** on the computer running the app. They are not saved in browser local storage or IndexedDB. The same local server exposes the UI and storage API during both `npm run dev` and `npm run preview`. A static-only host does not provide this storage service. For a production preview, run `npm run build`, then `npm run preview`.

The **entire `.savingsos-data/` folder**, `backups/`, and the app's exported `savingsos-*-backup-*.json` files are ignored by Git. The private data folder is also blocked from web requests and is never included in the frontend build. Copy this folder separately when moving the app to another computer; a Git clone contains code only. Account balances are manual snapshots adjusted when you record internal transfers; income and bill payment records do not automatically adjust those snapshots. There is no bank connection, payment execution, or cloud sync.

On the first visit after upgrading, open the app in the browser that held your previous profiles. Its `savings-os-users-v1` registry is migrated into app files, with an original copy retained under `.savingsos-data/migrations/`. Only after the server confirms a successful save is the old browser registry removed. Migration preserves passwords, encrypted finance records, admin roles, existing users, and archived default profiles. Repeated migration does not duplicate or resurrect deleted profiles. Conflicting names, different admin accounts, or invalid data leave the original browser copy intact and display a migration notice. Older `savings-os-planner-v1` and legacy IndexedDB sources remain untouched; active records use app files exclusively.

The landing page still offers **Add user**, and a fresh installation creates no default profile. New planners start with no expenses or income and the three default account names. The old unprotected Personal default is archived during migration rather than shown in the chooser.

Each recurring expense has a separate payment record for each due date. Paying one month does not mark future months paid. Month-end bills fall on the last valid day of shorter months and return to their original day afterward. Annual leap-day bills fall on 28 February in non-leap years. Future occurrences are generated from each expense's first due date.

Editing an expense updates its schedule and details across the planner; deleting it removes its payment history. Export a backup before major changes. Finance backups restore only the active user profile and are validated before replacement. Other users and passwords are unchanged. These JSON exports are unencrypted and should be stored securely. Clearing browser data does not delete app files. Keep backups somewhere separate from the app folder.

## Moving money between accounts

Use **Move money** in Overview, Accounts, Savings, or the **Transfers** page. For example, recording €300 from moey! to Bleap subtracts €300 from the recorded moey! balance and adds €300 to Bleap. The combined balance stays unchanged, and no income or expense entry is created. The form previews both balances before saving and waits for the app to confirm the save. Negative recorded balances are allowed because snapshots may be out of date; refresh those snapshots on Accounts when needed.

Overview shows each account's income, paid expenses, transfers in, transfers out, and net movement for the selected month. Expenses use their actual payment date for this cash-flow view, including late payments for an earlier month. Income and planned expense summary totals continue to exclude transfers. Current recorded balances are snapshots, not historical month-end balances.

Transfer history is stored per profile and included in both finance and full-profile backups. Older backups without a transfers array remain valid. Editing reverses the old transfer effect and applies the new one once. Deleting a transfer requires confirmation and reverses its effect on current recorded balances. Accounts linked to transfer history cannot be removed until the transfers are reassigned or reversed. Recording a transfer does not execute a bank payment.

## Local users and passwords

New users can create their own profile with **Add user** on the landing page. Signed-in regular users can rename their own profile and manage their own password under Settings, but cannot create or manage other profiles from their planner. The admin can create and manage regular profiles under **/admin → Local users**. Switch or sign out using the sidebar profile controls. New users have separate accounts, balances, expenses, payment history, and income; no existing user data is copied into their planners. Names must be unique without regard to case.

Passwords are optional and must be 8–128 characters. Protected profiles encrypt their saved finance payload with AES-256-GCM, a random 96-bit nonce on every save, and an authenticated binding to the profile ID. Keys are derived with PBKDF2-SHA-256 (600,000 iterations) and a random per-password 128-bit salt using the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey). Passwords are never saved, and derived keys are non-extractable and held in server memory for the unlocked session. An opaque HttpOnly, SameSite=Strict session cookie identifies the signed-in profile; finance records and passwords are never stored in that cookie. Theme preference may still use browser local storage.

Protected profiles require their password after sign-out, session expiry, or a server restart. An existing session can resume after a page reload. Password changes and removal require the current password. There is no password recovery; if a password is forgotten, create a new user and restore an existing finance backup. Passwordless profiles can be opened by anyone with access to the app. Regular profile names remain visible in the chooser. Selecting a profile without a password opens its planner immediately; password-protected profiles show the password form before opening. Failed sign-ins keep the chooser available and show an error.

The local server enforces profile access and admin permissions. Requests use same-origin checks, and private records are not served as static files. Protected profile payloads are encrypted on disk; passwordless profiles have plaintext payloads. Anyone with filesystem access can copy or alter app files. Legacy browser copies and exported finance backups are separate. The default local server runs on localhost; use HTTPS and appropriate access controls before exposing it beyond a trusted local environment.

Saves are queued before switching users, and per-profile revision checks reject stale writes from another tab instead of overwriting a newer profile or password. If a conflict occurs, export the unsaved planner from Settings, then reload.

## Admin account and placeholder settings

Open **/admin** directly to access the separate admin portal. Admin profiles, setup actions, and navigation links are hidden from the regular user chooser and app. On the first visit, select **Set up admin account**, enter a name (prefilled with Admin), and choose an 8–128 character password. Later visits show the admin password form. Setup creates one password-protected admin in this app; existing users and admin settings are preserved. The portal includes admin name/password controls, and Sign out returns to the regular app. Removing the admin password is blocked.

The admin page has editable placeholder app name, support email, announcement, monthly budget, reminder lead time, and experimental-feature switch. **Save admin settings** encrypts these values with the admin profile; reloads retain them. **Reset placeholders** changes the form and requires Save to persist. These values do not yet change app branding, send messages, schedule reminders, enforce budgets, or enable features. The Local users section lets the admin create profiles, rename regular profiles without changing their passwords or finance records, refresh the list, and delete regular profiles. Creating a user keeps the admin signed in. Deletion requires typing the exact profile name and removes that profile and its saved finance records. The admin account cannot be deleted. Changed profiles must be refreshed before retrying a stale rename or delete; failed writes keep the stored data intact.

Only an unlocked admin session can manage other profiles or save admin settings. Landing-page registration creates only a separate regular profile and does not grant access to existing profiles. Ordinary users see the separate admin sign-in screen at its URL, and storage operations check the stored role and encryption key. These checks run on the local app server, including role and unlocked-session validation. Finance backups for the admin include their placeholder settings.

## Backup exports and recovery

**Settings → Export backup** downloads the active profile's finance records, including transfers and recorded balances, as an unencrypted JSON file. **Restore backup** continues to validate and replace only that profile's finance records.

**/admin → Local users → Export all profiles** downloads all users, credentials, encrypted payloads, admin settings, and migration markers as a `savingsos-profiles-backup` file. Password-protected payloads remain encrypted and still require their passwords. Passwordless payloads and names remain readable. Keep exports in a safe location.

To restore an entire app backup on the server computer, stop the app, keep a copy of the current private data folder, and write the export's `registry` object to `.savingsos-data/profiles.json`. Restart the app and sign in again. Do not place backups in `public/` or `dist/`.

## Appearance

Use the moon/sun button in the top bar, or choose **Light mode** / **Dark mode** under **Settings → Appearance**. The sign-in screen also has a theme toggle. The choice is saved on this browser under `savings-os-theme` and synchronizes across open tabs. On a first visit, the app uses the device color preference. The saved theme is applied before the app renders to avoid a bright flash when opening dark mode.

The sidebar and mobile header share the original `public/SOSLogo.svg` logo and wordmark, with the desktop logo row aligned to the top bar.

## Smartphone layout

Below 768px, the app uses a sticky header and bottom navigation for Overview, Expenses, Accounts, and More. More opens the complete navigation drawer, including Income, Savings, Insights, Settings, and user switching. The drawer supports Escape, keeps keyboard focus inside while open, and restores focus when closed.

Expenses use phone cards with the account, due date, payment status, actual payment date, edit action, and paid/unpaid action. Larger screens keep the table. Filters, calendars, summaries, accounts, income, and settings adapt to a single-column phone layout. Forms become bottom sheets with larger fields and buttons. Safe-area padding accommodates the home indicator and display cutouts.

## Styling with Tailwind

Tailwind v4 is already connected through the Vite plugin. Active components now use utility classes for responsive grids, flex layout, spacing, visibility, and theme-aware colors.

| File | Purpose |
| --- | --- |
| `src/styles/globals.css` | Single CSS entry point, Tailwind imports, font, global base rules, `@theme inline` tokens, and the `dark:` variant. |
| `src/planner/planner.css` | Shared component details and numbered, commented sections for every page and screen. |
| `src/planner/mobile.css` | Smartphone rules in matching page sections, plus compact-phone and accessibility adjustments. |
| `src/planner/transfers.css` | Commented sections for transfer history, balance previews, Overview account activity, and smartphone rules. |
| `src/planner/theme/theme.css` | Light/dark palettes, logo styles, chart colors, and the Appearance selector. |

Use complete Tailwind class names in JSX. For example:

```tsx
<section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
  <article className="min-w-0 rounded-xl border border-finance-border bg-finance-surface p-4 text-finance-ink">
    Account details
  </article>
</section>
```

The `finance-*` colors use the existing theme variables, so they follow the light/dark setting. The `dark:` variant uses the app's `data-theme="dark"` attribute. Keep reusable visual details inside `@layer components` so Tailwind utilities can override layout without extra specificity or `!important`. Put new page CSS under its labeled section; keep phone-only rules in the corresponding section in `mobile.css`.

See the official [Tailwind theme documentation](https://tailwindcss.com/docs/theme) and [dark mode documentation](https://tailwindcss.com/docs/dark-mode) for extending these conventions.
