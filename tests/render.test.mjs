import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

test("finance pages render with the shared context and coherent monthly totals", async (t) => {
  // This is a server render smoke check; it does not claim browser interaction coverage.
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  try {
    const { ThemeContext } = await server.ssrLoadModule("/src/planner/theme/context.ts");
    const { ThemeToggle, AppearanceSettings } = await server.ssrLoadModule("/src/planner/theme/ThemeControls.tsx");
    const { Brand } = await server.ssrLoadModule("/src/planner/Brand.tsx");
    const { AdminPortal } = await server.ssrLoadModule("/src/planner/AdminPortal.tsx");
    const { Admin } = await server.ssrLoadModule("/src/planner/Admin.tsx");
    const { UsersContext } = await server.ssrLoadModule("/src/planner/users/context.ts");
    const { UserChooser, CreateUserDialog, UserSettings, UserGate } = await server.ssrLoadModule("/src/planner/users/Users.tsx");
    const { FinanceContext } = await server.ssrLoadModule("/src/planner/context.ts");
    const { ExpenseCards } = await server.ssrLoadModule("/src/planner/ExpenseCards.tsx");
    const { MobileNav } = await server.ssrLoadModule("/src/planner/MobileNav.tsx");
    const { Expenses, ExpenseForm, PaymentDialog } = await server.ssrLoadModule("/src/planner/Expenses.tsx");
    const { Overview, Accounts, IncomePage, Insights, Settings } = await server.ssrLoadModule("/src/planner/Pages.tsx");
    const { today, getRows } = await server.ssrLoadModule("/src/planner/model.ts");
    const month = today().slice(0, 7);
    const data = {
      initialized: true,
      accounts: [
        { id: "bleap", name: "Bleap", provider: "Everyday spending", kind: "Spending", balance: 1234, color: "#a4d17a" },
        { id: "moey", name: "moey!", provider: "Crédito Agrícola", kind: "Subscriptions", balance: 50, color: "#ae9cda" },
        { id: "trading", name: "Trading 212", provider: "Savings", kind: "Savings", balance: 5000, color: "#b2cbd5" },
      ],
      expenses: [
        { id: "rent", name: "Apartment rent", amount: 650, category: "Housing", accountId: "bleap", due: month + "-01", frequency: "monthly", notes: "" },
        { id: "spotify", name: "Spotify Premium", amount: 7.99, category: "Subscriptions", accountId: "moey", due: month + "-03", frequency: "monthly", notes: "" },
      ],
      payments: { ["rent:" + month + "-01"]: today() },
      income: [{ id: "salary", name: "Monthly salary", amount: 1500, date: today(), accountId: "bleap" }],
    };
    const state = { data, ready: true, error: "", update() {}, async save() {}, clearDemo() {} };
    const user = { id: "personal", name: "Personal", hasPassword: false, createdAt: "2026-10-01" };
    const protectedUser = { id: "ana", name: "Ana", hasPassword: true, createdAt: "2026-10-01" };
    const userState = { users: [user, protectedUser], currentUser: user, busy: false, saving: false, error: "", async signIn() {}, async createUser() {}, async signOut() {}, async configureUser() {}, async createAdmin() {}, async saveAdminSettings() {}, async renameUser() {}, async deleteUser() {}, async refreshUsers() {}, async exportProfiles() {} };
    const render = (component, props = {}, overrides = {}, theme = "light", path = "/") => renderToStaticMarkup(createElement(ThemeContext.Provider, { value: { theme, setTheme() {} } }, createElement(UsersContext.Provider, { value: { ...userState, ...overrides } }, createElement(FinanceContext.Provider, { value: state }, createElement(MemoryRouter, { initialEntries: [path] }, createElement(component, props))))));
    await t.test("expenses show correct paid, unpaid and total amounts", () => {
      const html = render(Expenses);
      for (const text of ["Apartment rent", "Spotify Premium", "€657.99", "€650.00", "€7.99", "Payment calendar"]) assert.ok(html.includes(text), text);
    });
    await t.test("phone expense cards keep account, status, due date and payment actions visible", () => {
      const html = render(ExpenseCards, { rows: getRows(data, month), accounts: data.accounts, onEdit() {}, onTogglePayment() {} });
      assert.ok(html.includes("Bleap"));
      assert.ok(html.includes("moey!"));
      assert.ok(html.includes("Pay from"));
      assert.ok(html.includes("Due date"));
      assert.ok(html.includes("Paid on"));
      assert.ok(html.includes("Mark unpaid: Apartment rent"));
      assert.ok(html.includes("Mark paid: Spotify Premium"));
      assert.ok(html.includes("Edit Spotify Premium"));
    });
    await t.test("overview and income use the same records", () => {
      const html = render(Overview);
      assert.ok(html.includes("€1,500.00"));
      assert.ok(html.includes("€842.01"));
      assert.ok(render(IncomePage).includes("Monthly salary"));
    });
    await t.test("accounts, savings, insights, and backup settings are available", () => {
      assert.ok(render(Accounts).includes("Bleap"));
      const savings = render(Accounts, { savings: true });
      assert.ok(savings.includes("Trading 212"));
      assert.ok(savings.includes("€5,000.00"));
      assert.ok(!savings.includes(">moey!</h2>"));
      assert.ok(render(Insights).includes("A year of little decisions"));
      const settings = render(Settings);
      assert.ok(settings.includes("Export backup"));
      assert.ok(settings.includes("Appearance"));
      assert.ok(settings.includes("Light mode"));
      assert.ok(settings.includes("Dark mode"));
      assert.ok(render(ThemeToggle).includes("Switch to dark mode"));
      assert.ok(render(ThemeToggle, {}, {}, "dark").includes("Switch to light mode"));
      assert.ok(render(AppearanceSettings, {}, {}, "dark").includes('aria-pressed="true"'));
      assert.ok(render(Brand).includes("/SOSLogo.svg"));
      assert.ok(render(Brand).includes("savingsOS overview"));
      const nav = render(MobileNav, { menuOpen: false, onOpenMenu() {} });
      assert.ok(nav.includes('aria-label="Mobile navigation"'));
      for (const route of ["/dashboard", "/expenses", "/accounts"]) assert.ok(nav.includes('href="' + route + '"'));
      assert.ok(nav.includes("More pages and user options"));
    });
    await t.test("expense and payment forms have named dialogs and payment dates", () => {
      assert.ok(render(ExpenseForm, { month, onClose() {} }).includes('aria-label="Add an expense"'));
      assert.ok(render(PaymentDialog, { row: getRows(data, month)[1], onClose() {} }).includes('name="paidDate"'));
    });
    await t.test("user controls are available and the gate hides finance pages when signed out", () => {
      const chooser = render(UserChooser, {}, { currentUser: null });
      assert.ok(chooser.includes("Ana"));
      assert.ok(chooser.includes("Password protected"));
      assert.ok(!chooser.includes("Apartment rent"));
      assert.ok(render(CreateUserDialog, { onClose() {} }, { currentUser: null }).includes("Protect with a password"));
      assert.ok(render(UserSettings).includes("Set a password"));
      assert.ok(render(UserSettings, {}, { currentUser: protectedUser }).includes("Change password"));
      assert.ok(render(UserSettings, {}, { currentUser: protectedUser }).includes("Remove password"));
      assert.ok(!render(UserGate, { children: createElement(Expenses) }, { currentUser: null }).includes("Apartment rent"));
      assert.ok(render(UserGate, { children: createElement(Expenses) }).includes("Apartment rent"));
    });

    await t.test("first visit offers Add user without a default profile", () => {
      const html = render(UserChooser, {}, { users: [], currentUser: null });
      assert.ok(html.includes("Add your first user"));
      assert.ok(html.includes("Add user"));
      assert.ok(!html.includes("user-choice"));
      assert.ok(!html.includes("Choose a user to open"));
      const returning = render(UserChooser, {}, { users: [protectedUser], currentUser: null });
      assert.ok(returning.includes("Ana"));
      assert.ok(returning.includes("Add user"));
      assert.ok(returning.includes("Choose a user to open"));
    });

    await t.test("admin setup and settings are restricted to the admin role", () => {
      const admin = { ...protectedUser, name: "Admin", role: "admin" };
      const chooser = render(UserChooser, {}, { users: [user], currentUser: null });
      assert.ok(!chooser.includes("Set up admin account"));
      const configured = render(UserChooser, {}, { users: [user, admin], currentUser: null });
      assert.ok(!configured.includes("Set up admin account"));
      assert.ok(!configured.includes("Admin · Admin"));
      assert.ok(!configured.includes(">Admin<"));
      const setup = render(CreateUserDialog, { admin: true, onClose() {} });
      assert.ok(setup.includes("Create admin account"));
      assert.ok(setup.includes("Confirm password"));
      assert.ok(setup.includes('value="Admin"'));
      const denied = render(Admin);
      assert.ok(denied.includes("Admin access required"));
      assert.ok(!denied.includes("Save admin settings"));
      const allowed = render(Admin, {}, { currentUser: admin, users: [user, admin] });
      for (const text of ["Placeholder settings", "admin@example.com", "Planning defaults", "Experimental features", "Local users", "Save admin settings"]) assert.ok(allowed.includes(text), text);
      const account = render(UserSettings, {}, { currentUser: admin });
      assert.ok(account.includes("Change password"));
      assert.ok(!account.includes("Remove password"));
    });

    await t.test("admin setup and sign-in live only at the dedicated admin entry", () => {
      const admin = { id: "admin-id", name: "Hidden owner", hasPassword: true, role: "admin", createdAt: "2026-10-01" };
      const regularUsers = { users: [protectedUser, admin], currentUser: protectedUser };
      const chooser = render(UserChooser, {}, regularUsers);
      assert.ok(chooser.includes("Ana"));
      assert.ok(!chooser.includes("Hidden owner"));
      assert.ok(!chooser.includes("admin account"));
      const regularSettings = render(UserSettings, {}, regularUsers);
      assert.ok(!regularSettings.includes("Hidden owner"));
      assert.ok(!regularSettings.includes("Create user"));
      assert.ok(!regularSettings.includes("Delete profile"));
      assert.equal(render(CreateUserDialog, { onClose() {} }), "");
      const onlyAdmin = render(UserChooser, {}, { users: [admin], currentUser: null });
      assert.ok(onlyAdmin.includes("Add your first user"));
      assert.ok(!onlyAdmin.includes("user-choice"));
      assert.ok(!onlyAdmin.includes("Hidden owner"));
      const setup = render(AdminPortal, {}, { users: [protectedUser], currentUser: null }, "light", "/admin");
      assert.ok(setup.includes("Set up admin account"));
      assert.ok(!setup.includes("Save admin settings"));
      for (const currentUser of [null, protectedUser]) {
        const login = render(AdminPortal, {}, { users: [protectedUser, admin], currentUser }, "light", "/admin");
        assert.ok(login.includes("Admin sign-in"));
        assert.ok(login.includes("Sign in as admin"));
        assert.match(login, /autocomplete="current-password"/i);
        assert.ok(!login.includes("Save admin settings"));
        assert.ok(!login.includes("Set up admin account"));
      }
      const console = render(AdminPortal, {}, { users: [protectedUser, admin], currentUser: admin }, "dark", "/admin");
      assert.ok(console.includes("Save admin settings"));
      assert.ok(console.includes("Sign out"));
      assert.ok(console.includes("Admin account"));
      assert.ok(!console.includes("Main navigation"));
      assert.ok(console.includes("Create user"));
      assert.ok(console.includes("Export all profiles"));
      assert.ok(console.includes("Delete profile Ana"));
      const failed = render(AdminPortal, {}, { users: [], currentUser: null, error: "Storage unavailable" }, "light", "/admin");
      assert.ok(failed.includes("Storage unavailable"));
      assert.ok(!failed.includes(">Set up admin account</button>"));
    });

    await t.test("existing planner data is preserved and new user planners start empty", async () => {
      const { createInitialData, loadExistingPlanner } = await server.ssrLoadModule("/src/planner/users/initialData.ts");
      const fresh = createInitialData();
      assert.equal(fresh.expenses.length, 0);
      assert.equal(fresh.income.length, 0);
      assert.equal(Object.keys(fresh.payments).length, 0);
      assert.deepEqual(fresh.accounts.map(a => a.name), ["Bleap", "moey!", "Trading 212"]);
      const raw = JSON.stringify(data);
      const previousStorage = globalThis.localStorage;
      const entries = new Map([["savings-os-planner-v1", raw]]);
      globalThis.localStorage = { getItem: key => entries.get(key) ?? null };
      try {
        assert.deepEqual(JSON.parse(JSON.stringify(await loadExistingPlanner())), data);
        assert.equal(entries.get("savings-os-planner-v1"), raw);
        entries.set("savings-os-planner-v1", "{broken");
        await assert.rejects(loadExistingPlanner(), /not been changed/);
        assert.equal(entries.get("savings-os-planner-v1"), "{broken");
      } finally {
        if (previousStorage === undefined) delete globalThis.localStorage;
        else globalThis.localStorage = previousStorage;
      }
    });
  } finally {
    await server.close();
  }
});
