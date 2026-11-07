import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

test("online sign-in UI and live profile state", async t => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: "http://localhost/" });
  const previous = new Map();
  for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLFormElement", "FormData", "Event", "MouseEvent", "localStorage", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === "window" ? dom.window : name === "IS_REACT_ACT_ENVIRONMENT" ? true : dom.window[name] });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  const { createElement: e, act, useContext } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  let root;
  try {
    const { AuthenticationContext } = await vite.ssrLoadModule("/src/context/AuthenticationContext.ts");
    const { OnlineSignIn } = await vite.ssrLoadModule("/src/components/users/OnlineSignIn.tsx");
    const { OnlineAccountSettings } = await vite.ssrLoadModule("/src/components/users/OnlineAccountSettings.tsx");
    const { UsersProvider } = await vite.ssrLoadModule("/src/context/UsersProvider.tsx");
    const { UsersContext } = await vite.ssrLoadModule("/src/context/UsersContext.ts");
    const { FinanceContext } = await vite.ssrLoadModule("/src/context/FinanceContext.ts");
    const { createInitialData } = await vite.ssrLoadModule("/src/utils/initialData.ts");
    const container = document.getElementById("root");
    const calls = [];
    const auth = { enabled: true, user: null, busy: false, error: "", async google() { calls.push(["google"]); }, async email(...args) { calls.push(["email", ...args]); }, async register(...args) { calls.push(["register", ...args]); }, async resetPassword(email) { calls.push(["reset", email]); }, async verifyEmail() {}, async leave() {} };
    async function mount(component, value = auth) {
      if (root) await act(async () => root.unmount());
      root = createRoot(container);
      await act(async () => root.render(e(AuthenticationContext.Provider, { value }, component)));
    }
    const button = text => [...container.querySelectorAll("button")].find(button => button.textContent === text);
    const click = async element => { assert.ok(element); await act(async () => element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }))); };
    async function fill(name, value) {
      const input = container.querySelector(`input[name="${name}"]`);
      assert.ok(input, name);
      await act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value").set.call(input, value);
        input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      });
    }
    async function submit() { await act(async () => container.querySelector("form").dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true }))); }
    await t.test("Google and email sign-in call the selected provider with the entered credentials", async () => {
      await mount(e(OnlineSignIn));
      await click(button("Continue with Google"));
      assert.deepEqual(calls.pop(), ["google"]);
      await fill("email", "ana@example.test"); await fill("password", "strong password"); await submit();
      assert.deepEqual(calls.pop(), ["email", "ana@example.test", "strong password"]);
    });
    await t.test("registration requires matching passwords and provides the display name", async () => {
      await mount(e(OnlineSignIn)); await click(button("Create an account"));
      await fill("name", "Ana"); await fill("email", "ana@example.test"); await fill("password", "strong password"); await fill("confirm", "wrong password");
      await submit();
      assert.equal(calls.length, 0); assert.match(container.querySelector('[role="alert"]').textContent, /don't match/);
      await fill("confirm", "strong password"); await submit();
      assert.deepEqual(calls.pop(), ["register", "Ana", "ana@example.test", "strong password"]);
    });
    await t.test("password reset gives a generic confirmation and sign-in errors remain actionable", async () => {
      await mount(e(OnlineSignIn)); await click(button("Forgot password?"));
      assert.equal(container.querySelector('input[name="password"]'), null);
      await fill("email", "ana@example.test"); await submit();
      assert.deepEqual(calls.pop(), ["reset", "ana@example.test"]);
      assert.match(container.querySelector('[role="status"]').textContent, /If an account exists/);
      await mount(e(OnlineSignIn), { ...auth, async google() { throw new Error("Allow pop-ups for savingsOS, then try Google sign-in again."); } });
      await click(button("Continue with Google"));
      assert.match(container.querySelector('[role="alert"]').textContent, /pop-ups/);
    });
    await t.test("disabled and local-only modes do not allow authentication actions", async () => {
      await mount(e(OnlineSignIn), { ...auth, busy: true });
      assert.ok([...container.querySelectorAll("button, input")].every(control => control.disabled));
      await mount(e(OnlineSignIn), { ...auth, enabled: false });
      assert.equal(container.textContent, "");
    });
    await t.test("online settings do not offer local password removal and deletion requires confirmation", async () => {
      const user = { id: "online-uid", name: "Ana", authProvider: "firebase", hasPassword: false };
      const users = { currentUser: user, busy: false, saving: false, configureUser() {}, signOut() {}, async deleteOnlineAccount() { calls.push(["delete"]); } };
      await mount(e(UsersContext.Provider, { value: users }, e(OnlineAccountSettings)), { ...auth, user: { email: "ana@example.test", emailVerified: false, providerData: [{ providerId: "password" }] } });
      assert.ok(button("Reset password")); assert.ok(button("Verify email address"));
      assert.equal(button("Remove password"), undefined);
      await click(button("Delete online account"));
      assert.ok(container.querySelector('dialog[open] input[type="checkbox"][required]'));
      assert.ok(container.querySelector('dialog[open] input[name="password"][required]'));
      assert.equal(calls.length, 0);
    });
    await t.test("remote snapshots never replace pending edits, and failed form saves can sign out without overwriting cloud data", async () => {
      let finance, users, receive;
      let rejectSave;
      let state = { users: [], session: { user: { id: "uid", name: "Ana", authProvider: "firebase", hasPassword: false }, revision: 1, data: createInitialData() } };
      let stopped = false;
      let saves = 0;
      const backend = {
        async request(path, input) {
          if (path === "state") return state;
          if (path === "save") { saves++; await new Promise((_, reject) => { rejectSave = reject; }); }
          if (path === "sign-out") return { users: [], session: null };
          throw new Error(`Unexpected request ${path}: ${JSON.stringify(input)}`);
        },
        subscribe(next) { receive = next; return () => { stopped = true; }; },
      };
      function Capture() { finance = useContext(FinanceContext); users = useContext(UsersContext); return e("p", null, finance.ready ? "ready" : "loading"); }
      await mount(e(UsersProvider, { backend }, e(Capture)));
      assert.equal(finance.ready, true);
      const remoteData = { ...createInitialData(), initialized: false };
      await act(async () => receive({ ...state, session: { ...state.session, revision: 2, data: remoteData } }));
      assert.deepEqual(finance.data, remoteData);
      let pending;
      await act(async () => { pending = finance.save(data => ({ ...data, initialized: true })); pending.catch(() => {}); });
      await act(async () => receive({ ...state, session: { ...state.session, revision: 3, data: createInitialData() } }));
      assert.equal(finance.data.initialized, true);
      await act(async () => { rejectSave(new Error("Your planner changed on another device. Export unsaved records, then reload before trying again.")); await assert.rejects(pending, /another device/); });
      assert.equal(finance.data.initialized, false, "The failed edit rolls back to its previous data");
      assert.match(finance.error, /another device/);
      await act(async () => users.signOut());
      assert.equal(users.currentUser, null);
      assert.equal(saves, 1, "Sign-out must not retry a rejected edit over another device's data");
      await act(async () => root.unmount()); root = null;
      assert.ok(stopped);
    });
    await t.test("a failed cloud startup can retry after setup without reloading or writing an empty planner", async () => {
      let users, finance;
      let reads = 0;
      const recovered = { users: [], session: { user: { id: "uid", name: "Ana", authProvider: "firebase", hasPassword: false }, revision: 7, data: { ...createInitialData(), initialized: false } } };
      const backend = {
        async request(path) {
          assert.equal(path, "state", "Recovery must never write replacement data");
          if (++reads === 1) throw new Error("Cloud Firestore is not enabled for this project. Create the Firestore database in Firebase Console, publish its security rules, then try again.");
          return recovered;
        },
      };
      function Capture() { users = useContext(UsersContext); finance = useContext(FinanceContext); return null; }
      await mount(e(UsersProvider, { backend }, e(Capture)));
      assert.equal(finance.ready, true);
      assert.match(users.error, /not enabled/);
      assert.equal(users.currentUser, null);
      await act(async () => users.retryLoad());
      assert.equal(reads, 2);
      assert.equal(users.error, "");
      assert.equal(users.currentUser.id, "uid");
      assert.deepEqual(finance.data, recovered.session.data);
      await act(async () => users.retryLoad());
      assert.equal(reads, 2, "Recovery must not reload an already-open planner and discard edits");
    });
  } finally {
    if (root) await act(async () => root.unmount());
    await vite.close(); dom.window.close();
    for (const [name, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name]; }
  }
});
