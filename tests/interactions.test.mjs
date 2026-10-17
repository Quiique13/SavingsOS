import { appClient, startApp, temporaryAppDirectory, removeTemporaryAppDirectory } from "./app-server-helpers.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

// A DOM simulation exercises React events and routes without reading browser profiles.
test("profile selection and settings navigation", async t => {
  const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color"></head><body><div id="root"></div></body></html>', { url: "http://localhost/" });
  const previous = new Map();
  for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLFormElement", "FormData", "Event", "MouseEvent", "localStorage"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === "window" ? dom.window : name === "document" ? dom.window.document : dom.window[name] });
  }
  previous.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  const { createElement: e, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { MemoryRouter } = await import("react-router-dom");
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  let root;
  let runningApp;
  let appDirectory;
  let appStore;
  const previousFetch = globalThis.fetch;
  try {
    const { createAppServer } = await server.ssrLoadModule("/server/appServer.ts");
    const { PlannerRoutes } = await server.ssrLoadModule("/src/planner/Planner.tsx");
    const { UsersProvider } = await server.ssrLoadModule("/src/planner/data.tsx");
    const { ThemeProvider } = await server.ssrLoadModule("/src/planner/theme/ThemeProvider.tsx");
    const { UserVault, USERS_KEY } = await server.ssrLoadModule("/src/planner/users/vault.ts");
    const { createInitialData } = await server.ssrLoadModule("/src/planner/users/initialData.ts");
    const container = document.getElementById("root");
    const password = "test profile password";
    const find = (selector, text) => [...container.querySelectorAll(selector)].find(el => el.textContent.includes(text));
    const click = async element => {
      assert.ok(element, "Expected clickable element");
      await act(async () => { element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); });
    };
    const fill = async (selector, value) => {
      const element = container.querySelector(selector);
      assert.ok(element, selector);
      const prototype = element.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : element.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
      await act(async () => {
        Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, value);
        element.dispatchEvent(new dom.window.Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      });
    };
    const waitFor = async predicate => {
      const deadline = Date.now() + 5000;
      while (!predicate()) {
        assert.ok(Date.now() < deadline, "Timed out waiting for UI update: " + container.textContent.slice(0, 300));
        await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
      }
    };
    async function mount(path = "/settings") {
      if (root) { await act(async () => root.unmount()); root = null; }
      if (runningApp) await runningApp.close();
      if (appDirectory) removeTemporaryAppDirectory(appDirectory);
      appDirectory = temporaryAppDirectory();
      runningApp = await startApp(createAppServer, appDirectory);
      const client = appClient(runningApp.base);
      globalThis.fetch = (path, init) => typeof path === "string" && path.startsWith("/api/") ? client.fetch(path, init) : previousFetch(path, init);
      appStore = runningApp.app.store;
      localStorage.clear();
      const vault = new UserVault(localStorage);
      const admin = await vault.createAdmin("Hidden admin", createInitialData(), password);
      const regular = await vault.create(admin, "Miguel", createInitialData());
      const protectedProfile = await vault.create(admin, "Ana", createInitialData(), password);
      root = createRoot(container);
      await act(async () => root.render(e(ThemeProvider, null, e(UsersProvider, null, e(MemoryRouter, { initialEntries: [path] }, e(PlannerRoutes))))));
      await waitFor(() => container.querySelector(path === "/admin" ? ".admin-signin-screen" : ".user-choice"));
      assert.ok(!container.textContent.includes("Hidden admin"));
      assert.equal(localStorage.getItem(USERS_KEY), null);
      return { vault: runningApp.app.vault, regular, protectedProfile, admin, store: appStore };
    }
    await t.test("selecting a passwordless profile opens Settings immediately", async () => {
      const { vault, regular } = await mount();
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(!container.querySelector(".sign-in-form"));
      for (const text of ["Appearance", "Users & passwords", "Export backup", "Restore backup", "Set a password"]) assert.ok(container.textContent.includes(text), text);
      assert.ok(!find("button", "Create user"));
      assert.ok(!find("button", "Delete profile"));
      assert.equal((await vault.open(regular.user.id)).user.name, "Miguel");
      await click(find("button", "Dark mode"));
      assert.equal(document.documentElement.dataset.theme, "dark");
      await click(find("button", "Light mode"));
      assert.equal(document.documentElement.dataset.theme, "light");
      await click(find("button", "Set a password"));
      assert.ok(container.querySelector('dialog[open][aria-label="Set a password"]'));
      await click(find("dialog button", "Cancel"));
      assert.equal((await vault.open(regular.user.id)).user.hasPassword, false);
    });
    await t.test("clearing browser storage does not remove app profiles or finance records", async () => {
      const { vault, regular } = await mount();
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".settings-page"));
      const saved = await vault.open(regular.user.id);
      const records = { ...saved.data, income: [{ id: "salary", name: "Saved salary", amount: 1500, date: "2026-10-16", accountId: "bleap" }] };
      await vault.save(saved, records);
      localStorage.clear();
      await act(async () => root.unmount());
      root = createRoot(container);
      await act(async () => root.render(e(ThemeProvider, null, e(UsersProvider, null, e(MemoryRouter, { initialEntries: ["/settings"] }, e(PlannerRoutes))))));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(container.querySelector(".current-user-card").textContent.includes("Miguel"));
      assert.deepEqual((await vault.open(regular.user.id)).data.income, records.income);
      assert.equal(localStorage.getItem(USERS_KEY), null);
    });
    await t.test("protected profiles require their password before Settings appears", async () => {
      await mount();
      await click(find(".user-choice", "Ana"));
      assert.ok(!container.querySelector(".settings-page"));
      assert.ok(container.querySelector('input[type="password"]'));
      const input = container.querySelector('input[name="password"]');
      await act(async () => {
        input.value = password;
        container.querySelector(".sign-in-form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }));
      });
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(container.textContent.includes("Change password"));
      assert.ok(container.querySelector(".current-user-card").textContent.includes("Ana"));
    });
    await t.test("Settings remains populated after sidebar navigation and switching users", async () => {
      await mount();
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".settings-page"));
      await click(container.querySelector('nav[aria-label="Main navigation"] a[href="/expenses"]'));
      await waitFor(() => container.querySelector(".expenses-page"));
      assert.ok(!container.querySelector(".settings-page"));
      await click(container.querySelector('.sidebar a[href="/settings"]'));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(container.textContent.includes("Export backup"));
      await click(find("button", "Switch user"));
      await waitFor(() => container.querySelector(".user-choice"));
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(!container.querySelector(".sign-in-form"));
    });
    await t.test("direct Settings URL with a trailing slash also renders", async () => {
      await mount("/settings/");
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(container.textContent.includes("Appearance"));
    });
    await t.test("September income into moey is confirmed on disk and shown in its received month", async () => {
      const { vault, regular } = await mount("/income");
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".income-page"));
      await click(find("button", "Add income"));
      const form = container.querySelector("dialog form");
      form.querySelector('input[name="name"]').value = "Sogenave";
      form.querySelector('input[name="amount"]').value = "1367.29";
      form.querySelector('input[name="date"]').value = "2026-09-30";
      form.querySelector('select[name="account"]').value = "moey";
      const request = globalThis.fetch;
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      globalThis.fetch = async (path, input) => {
        if (path === "/api/save") await gate;
        return request(path, input);
      };
      try {
        await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
        assert.ok(container.querySelector("dialog[open]"));
        assert.ok(find("dialog button", "Saving").disabled);
        assert.equal((await vault.open(regular.user.id)).data.income.length, 0);
      } finally { release(); globalThis.fetch = request; }
      await waitFor(() => !container.querySelector("dialog"));
      assert.equal(container.querySelector('input[aria-label="Select month"]').value, "2026-09");
      const row = find(".income-row", "Sogenave");
      assert.ok(row); assert.ok(row.textContent.includes("€1,367.29")); assert.ok(row.textContent.includes("moey!"));
      assert.ok(container.textContent.includes("Sogenave saved for September 2026"));
      const income = (await vault.open(regular.user.id)).data.income;
      assert.equal(income.length, 1);
      assert.deepEqual({ ...income[0], id: "saved-id" }, { id: "saved-id", name: "Sogenave", amount: 1367.29, date: "2026-09-30", accountId: "moey" });
      await act(async () => root.unmount()); root = createRoot(container);
      await act(async () => root.render(e(ThemeProvider, null, e(UsersProvider, null, e(MemoryRouter, { initialEntries: ["/income"] }, e(PlannerRoutes))))));
      await waitFor(() => find("button", "View September 2026"));
      await click(find("button", "View September 2026"));
      assert.ok(find(".income-row", "Sogenave"));
    });
    await t.test("failed income saves preserve the form and retry without adding duplicates", async () => {
      const { vault, regular } = await mount("/income");
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".income-page"));
      await click(find("button", "Add income"));
      let form = container.querySelector("dialog form");
      form.querySelector('input[name="name"]').value = "Sogenave";
      form.querySelector('input[name="amount"]').value = "1367.29";
      form.querySelector('input[name="date"]').value = "2026-09-30";
      form.querySelector('select[name="account"]').value = "moey";
      const request = globalThis.fetch;
      globalThis.fetch = (path, input) => path === "/api/save" ? Promise.resolve(new Response(JSON.stringify({ error: "The app data file could not be saved." }), { status: 503, headers: { "Content-Type": "application/json" } })) : request(path, input);
      try {
        await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
        await waitFor(() => container.querySelector('dialog [role="alert"]'));
        form = container.querySelector("dialog form");
        assert.equal(form.querySelector('input[name="name"]').value, "Sogenave");
        assert.equal(form.querySelector('input[name="amount"]').value, "1367.29");
        assert.equal(form.querySelector('input[name="date"]').value, "2026-09-30");
        assert.equal(form.querySelector('select[name="account"]').value, "moey");
        assert.equal((await vault.open(regular.user.id)).data.income.length, 0);
      } finally { globalThis.fetch = request; }
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog"));
      assert.equal((await vault.open(regular.user.id)).data.income.length, 1);
      assert.ok(find(".income-row", "Sogenave"));
    });
    await t.test("existing older income has a month shortcut and is never removed automatically", async () => {
      const { vault, regular } = await mount("/income");
      const session = await vault.open(regular.user.id);
      const entries = [1, 2, 3].map(id => ({ id: "saved-" + id, name: "Sogenave", amount: 1367.29, date: "2026-09-30", accountId: "moey" }));
      await vault.save(session, { ...session.data, income: entries });
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => find("button", "View September 2026"));
      await click(find("button", "View September 2026"));
      assert.equal(container.querySelectorAll(".income-row").length, 3);
      assert.deepEqual((await vault.open(regular.user.id)).data.income, entries);
    });
    await t.test("moving 300 from moey to Bleap persists and appears in Overview without inflating income", async () => {
      const { vault, regular } = await mount("/dashboard");
      const session = await vault.open(regular.user.id);
      const income = [{ id: "salary-transfer", name: "Salary", amount: 1367.29, date: "2026-09-30", accountId: "moey" }];
      await vault.save(session, { ...session.data, accounts: session.data.accounts.map(account => ({ ...account, balance: account.id === "moey" ? 1000 : account.id === "bleap" ? 100 : 0 })), income });
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".overview-page"));
      await click(find("button", "Move money"));
      await fill('select[name="fromAccount"]', "moey");
      await fill('select[name="toAccount"]', "bleap");
      await fill('input[name="amount"]', "300");
      await fill('input[name="date"]', "2026-09-30");
      await fill('textarea[name="notes"]', "Everyday spending");
      assert.ok(container.querySelector(".transfer-balance-preview").textContent.includes("€700.00"));
      await act(async () => container.querySelector("dialog form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog"));
      const saved = (await vault.open(regular.user.id)).data;
      assert.equal(saved.transfers.length, 1);
      assert.equal(saved.transfers[0].amount, 300);
      assert.equal(saved.accounts.find(account => account.id === "moey").balance, 700);
      assert.equal(saved.accounts.find(account => account.id === "bleap").balance, 400);
      assert.deepEqual(saved.income, income); assert.deepEqual(saved.expenses, []);
      assert.equal(container.querySelector('input[aria-label="Select month"]').value, "2026-09");
      assert.equal(container.querySelector(".stats-grid .stat-value").textContent, "€1,367.29");
      const cardValues = name => Object.fromEntries([...container.querySelector('[aria-label="' + name + ' account activity"]').querySelectorAll("dl > div")].map(row => [row.querySelector("dt").textContent, row.querySelector("dd").textContent]));
      assert.equal(cardValues("moey!")["Transfers out"], "−€300.00");
      assert.equal(cardValues("moey!")["Income"], "+€1,367.29");
      assert.equal(cardValues("Bleap")["Transfers in"], "+€300.00");
      assert.equal(cardValues("Bleap")["Income"], "€0.00");
      await click(container.querySelector('.overview-transfer-history a[href^="/transfers"]'));
      await waitFor(() => container.querySelector(".transfers-page"));
      assert.equal(container.querySelectorAll(".transfer-row").length, 1);
      assert.equal(container.querySelector('input[aria-label="Select month"]').value, "2026-09");
      await act(async () => root.unmount()); root = createRoot(container);
      await act(async () => root.render(e(ThemeProvider, null, e(UsersProvider, null, e(MemoryRouter, { initialEntries: ["/transfers?month=2026-09"] }, e(PlannerRoutes))))));
      await waitFor(() => container.querySelector(".transfer-row"));
      assert.ok(container.querySelector(".transfer-row").textContent.includes("€300.00"));
      assert.ok(container.querySelector(".transfer-row").textContent.includes("Everyday spending"));
    });
    await t.test("transfer editing and confirmed reversal preserve balances and protect linked accounts", async () => {
      const { vault, regular } = await mount("/transfers?month=2026-09");
      const { saveTransfer } = await server.ssrLoadModule("/src/planner/model.ts");
      const session = await vault.open(regular.user.id);
      const base = { ...session.data, accounts: session.data.accounts.map(account => ({ ...account, balance: account.id === "moey" ? 1000 : account.id === "bleap" ? 100 : 0 })) };
      await vault.save(session, saveTransfer(base, { id: "existing-transfer", fromAccountId: "moey", toAccountId: "bleap", amount: 300, date: "2026-09-30", notes: "" }));
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".transfer-row"));
      await click(container.querySelector('[aria-label="Edit transfer from moey! to Bleap"]'));
      await fill('input[name="amount"]', "250");
      await act(async () => container.querySelector("dialog form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog"));
      let saved = (await vault.open(regular.user.id)).data;
      assert.equal(saved.transfers.length, 1); assert.equal(saved.transfers[0].amount, 250);
      assert.equal(saved.accounts.find(account => account.id === "moey").balance, 750);
      assert.equal(saved.accounts.find(account => account.id === "bleap").balance, 350);
      await click(container.querySelector('.sidebar a[href="/accounts"]'));
      await waitFor(() => container.querySelector(".accounts-page"));
      await click(container.querySelector('[aria-label="Edit Bleap"]'));
      assert.ok(container.querySelector("dialog").textContent.includes("transfer history"));
      assert.ok(!find("dialog button", "Remove account"));
      await click(find("dialog button", "Cancel"));
      await click(container.querySelector('.sidebar a[href="/transfers"]'));
      await waitFor(() => container.querySelector(".transfers-page"));
      const shortcut = find("button", "View September 2026"); if (shortcut) await click(shortcut);
      await click(container.querySelector('[aria-label="Edit transfer from moey! to Bleap"]'));
      await click(find("dialog button", "Delete transfer"));
      await click(find("dialog button", "Keep transfer"));
      assert.equal((await vault.open(regular.user.id)).data.transfers.length, 1);
      await click(find("dialog button", "Delete transfer"));
      await click(find("dialog button", "Delete and reverse transfer"));
      await waitFor(() => !container.querySelector("dialog"));
      saved = (await vault.open(regular.user.id)).data;
      assert.deepEqual(saved.transfers, []); assert.deepEqual(saved.accounts, base.accounts);
    });
    await t.test("failed transfer saves retain the form and leave persisted balances untouched", async () => {
      const { vault, regular } = await mount("/accounts");
      const session = await vault.open(regular.user.id);
      await vault.save(session, { ...session.data, accounts: session.data.accounts.map(account => ({ ...account, balance: account.id === "moey" ? 1000 : 0 })) });
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector(".accounts-page"));
      await click(find("button", "Move money"));
      await fill('select[name="fromAccount"]', "moey");
      await fill('input[name="amount"]', "300");
      await fill('input[name="date"]', "2026-09-30");
      const request = globalThis.fetch;
      globalThis.fetch = (path, input) => path === "/api/save" ? Promise.resolve(new Response(JSON.stringify({ error: "The app data file could not be saved." }), { status: 503, headers: { "Content-Type": "application/json" } })) : request(path, input);
      try {
        await act(async () => container.querySelector("dialog form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
        await waitFor(() => container.querySelector('dialog [role="alert"]'));
        assert.equal(container.querySelector('input[name="amount"]').value, "300");
        assert.equal(container.querySelector('select[name="fromAccount"]').value, "moey");
        const unchanged = (await vault.open(regular.user.id)).data;
        assert.equal(unchanged.accounts.find(account => account.id === "moey").balance, 1000);
        assert.equal((unchanged.transfers ?? []).length, 0);
      } finally { globalThis.fetch = request; }
      await act(async () => container.querySelector("dialog form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog"));
      const saved = (await vault.open(regular.user.id)).data;
      assert.equal(saved.transfers.length, 1); assert.equal(saved.accounts.find(account => account.id === "moey").balance, 700);
    });
    await t.test("a new user can still create their own profile from the landing page", async () => {
      const { vault, admin } = await mount();
      await click(find("button", "Add user"));
      const form = container.querySelector("dialog form");
      assert.ok(form);
      form.querySelector('input[name="name"]').value = "New person";
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => container.querySelector(".settings-page"));
      assert.ok(container.querySelector(".current-user-card").textContent.includes("New person"));
      assert.ok(!find("button", "Create user"));
      const created = vault.list().find(user => user.name === "New person");
      assert.equal(created.role, undefined);
      assert.deepEqual((await vault.open(created.id)).data.expenses, []);
      assert.equal((await vault.open(admin.user.id, password)).user.role, "admin");
    });
    await t.test("admin can create, rename and delete profiles while keeping the admin session", async () => {
      const { vault, protectedProfile } = await mount("/admin");
      const signInForm = container.querySelector(".sign-in-form");
      signInForm.querySelector('input[name="password"]').value = password;
      await act(async () => signInForm.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => container.querySelector(".admin-profile-manager"));
      assert.ok(!container.querySelector('[aria-label="Delete profile Hidden admin"]'));
      await click(find("button", "Create user"));
      let form = container.querySelector("dialog form");
      form.querySelector('input[name="name"]').value = "Managed person";
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog") && find(".admin-profile-details", "Managed person"));
      assert.ok(container.querySelector(".admin-portal"));
      assert.ok(!container.querySelector(".settings-page"));
      await click(container.querySelector('[aria-label="Rename profile Ana"]'));
      form = container.querySelector("dialog form");
      form.querySelector('input[name="name"]').value = "Anabela";
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog") && find(".admin-profile-details", "Anabela"));
      assert.deepEqual((await vault.open(protectedProfile.user.id, password)).data, protectedProfile.data);
      await click(container.querySelector('[aria-label="Delete profile Managed person"]'));
      assert.ok(find("dialog button", "Delete profile").disabled);
      await click(find("dialog button", "Cancel"));
      assert.ok(vault.list().some(user => user.name === "Managed person"));
      await click(container.querySelector('[aria-label="Delete profile Managed person"]'));
      form = container.querySelector("dialog form");
      const confirmation = form.querySelector("input");
      const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set;
      await act(async () => {
        setter.call(confirmation, "Wrong name");
        confirmation.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
      assert.ok(find("dialog button", "Delete profile").disabled);
      await act(async () => {
        setter.call(confirmation, "Managed person");
        confirmation.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
      assert.ok(!find("dialog button", "Delete profile").disabled);
      await act(async () => form.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
      await waitFor(() => !container.querySelector("dialog"));
      assert.ok(!vault.list().some(user => user.name === "Managed person"));
      assert.ok(container.querySelector(".admin-profile-manager"));
      assert.ok(vault.list().some(user => user.name === "Anabela"));
    });
    await t.test("failed direct profile opens show an error without trapping the chooser", async () => {
      const { regular, store } = await mount();
      const registry = JSON.parse(store.getItem(USERS_KEY));
      registry.records.find(record => record.user.id === regular.user.id).payload.data.expenses = "invalid";
      store.setItem(USERS_KEY, JSON.stringify(registry));
      await click(find(".user-choice", "Miguel"));
      await waitFor(() => container.querySelector('[role="alert"]'));
      assert.ok(container.textContent.includes("finance data is invalid"));
      assert.ok(container.querySelector(".user-choice"));
      assert.ok(!container.querySelector(".sign-in-form"));
    });
  } finally {
    if (root) await act(async () => root.unmount());
    if (runningApp) await runningApp.close();
    if (appDirectory) removeTemporaryAppDirectory(appDirectory);
    globalThis.fetch = previousFetch;
    await server.close();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
