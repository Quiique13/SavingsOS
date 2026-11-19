import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement as e, lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Routes, Route } from "react-router-dom";

test("skeleton reveals lazy content and returns for subsequent suspensions", async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: "http://localhost/" });
  const previous = new Map();
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage, HTMLElement: dom.window.HTMLElement, MutationObserver: dom.window.MutationObserver, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  const container = document.getElementById("root");
  const root = createRoot(container);
  try {
    const { SkeletonSuspense } = await server.ssrLoadModule("/src/components/common/LoadingSkeleton.tsx");
    // Cached content must be visible on the very first render, before effects.
    // Otherwise every nested boundary briefly hides it and starts another fade.
    const cached = renderToStaticMarkup(e(SkeletonSuspense, null, e("button", null, "Cached page")));
    assert.ok(cached.includes('data-loading="false"'));
    assert.ok(!cached.includes('aria-busy="true"'));
    const render = async children => {
      await act(async () => { root.render(e(StrictMode, null, e(SkeletonSuspense, null, children))); });
    };
    for (const text of ["First page", "Second page"]) {
      let resolve;
      const Page = lazy(() => new Promise(done => { resolve = done; }));
      await render(e(Page));
      const boundary = container.querySelector(".loading-reveal");
      assert.equal(boundary.getAttribute("aria-busy"), "true");
      assert.equal(container.querySelector(".loading-reveal-placeholder").getAttribute("aria-hidden"), "false");
      assert.ok(container.querySelector('[role="status"]').getAttribute("aria-label"));
      await act(async () => { resolve({ default: () => e("button", null, text) }); });
      assert.equal(boundary.getAttribute("aria-busy"), "false");
      assert.equal(container.querySelector(".loading-reveal-placeholder").getAttribute("aria-hidden"), "true");
      assert.equal(container.querySelector(".loading-reveal-content").hasAttribute("inert"), false);
      assert.equal(container.querySelector("button").textContent, text);
    }
    let resolveAbandoned;
    const Abandoned = lazy(() => new Promise(done => { resolveAbandoned = done; }));
    await render(e(Abandoned));
    assert.equal(container.querySelector(".loading-reveal").getAttribute("aria-busy"), "true");
    await render(e("button", null, "Cached page"));
    assert.equal(container.querySelector(".loading-reveal").getAttribute("aria-busy"), "false");
    await act(async () => { resolveAbandoned({ default: () => e("button", null, "Old page") }); });
    assert.equal(container.querySelector("button").textContent, "Cached page");
    assert.equal(container.querySelector(".loading-reveal").getAttribute("aria-busy"), "false");

    const { PageSkeleton } = await server.ssrLoadModule("/src/components/common/PageSkeleton.tsx");
    for (const theme of ["default", "flow", "paper-ledger", "signal-studio"]) {
      const markup = page => renderToStaticMarkup(e(PageSkeleton, { page, uiTheme: theme }));
      const settings = markup("/settings");
      assert.ok(settings.includes('data-skeleton-part="appearance"'));
      assert.ok(!settings.includes('data-skeleton-part="metrics"'), "settings must not show dashboard totals");
      assert.ok(markup("/accounts").includes("account-cards full-accounts"));
      assert.ok(markup("/expenses").includes('data-skeleton-part="records"'));
      assert.ok(markup("/simulator").includes('data-skeleton-part="simulator"'));
      assert.ok(markup("/insights").includes('data-skeleton-part="chart"'));
      if (theme === "paper-ledger" || theme === "signal-studio") assert.ok(markup("/dashboard").includes("concept-overview"));
    }

    const { ThemeProvider } = await server.ssrLoadModule("/src/context/ThemeProvider.tsx");
    const { UsersContext } = await server.ssrLoadModule("/src/context/UsersContext.ts");
    const { FinanceContext } = await server.ssrLoadModule("/src/context/FinanceContext.ts");
    const { AppLayout } = await server.ssrLoadModule("/src/components/layout/AppLayout.tsx");
    const { UserGate } = await server.ssrLoadModule("/src/components/users/UserGate.tsx");
    const { createInitialData } = await server.ssrLoadModule("/src/utils/initialData.ts");
    const data = createInitialData();
    localStorage.setItem("savingsos-tour-v1:owner", "done");
    let resolveAccount;
    const Account = lazy(() => new Promise(resolve => { resolveAccount = resolve; }));
    const mountWorkspace = async ready => {
      const user = ready ? { id: "owner", name: "Owner", role: "user", hasPassword: false } : null;
      await act(async () => { root.render(e(ThemeProvider, null,
        e(UsersContext.Provider, { value: { currentUser: user, users: [], busy: false, saving: false, error: "", signOut: async () => {} } },
          e(FinanceContext.Provider, { value: { data, ready, error: "", clearDemo() {} } },
            e(MemoryRouter, { initialEntries: ["/accounts"] }, e(Routes, null,
              e(Route, { element: e(UserGate, null, e(AppLayout)) },
                e(Route, { path: "/accounts", element: e(Account) }),
                e(Route, { path: "/expenses", element: e("section", null, "Expenses") }),
              ),
            )),
          ),
        ),
      )); });
    };
    await mountWorkspace(false);
    const header = container.querySelector(".topbar");
    const sidebar = container.querySelector(".sidebar");
    const mobileNav = container.querySelector(".mobile-nav");
    const placeholder = container.querySelector(".workspace-skeleton");
    assert.ok(header && sidebar && mobileNav);
    assert.equal(container.querySelectorAll(".workspace-skeleton").length, 1);
    assert.equal(placeholder.dataset.skeletonPage, "/accounts");
    assert.equal(container.querySelector(".loading-reveal-fullscreen"), null);
    assert.ok(container.querySelector("main .workspace-skeleton"));
    assert.equal(resolveAccount, undefined, "do not render finance pages before records are ready");
    await act(async () => { sidebar.querySelector('a[href="/expenses"]').dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); });
    assert.equal(placeholder.dataset.skeletonPage, "/expenses");
    await act(async () => { sidebar.querySelector('a[href="/accounts"]').dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })); });
    await mountWorkspace(true);
    assert.equal(container.querySelector(".topbar"), header, "record completion must not remount navigation");
    assert.equal(container.querySelector(".sidebar"), sidebar);
    assert.equal(container.querySelector(".mobile-nav"), mobileNav);
    assert.equal(container.querySelector(".workspace-skeleton"), placeholder, "records and lazy-code loading share the same placeholder");
    assert.equal(container.querySelectorAll(".workspace-skeleton").length, 1);
    assert.equal(container.querySelector(".loading-reveal").getAttribute("aria-busy"), "true");
    await act(async () => { resolveAccount({ default: () => e("section", { className: "accounts-page" }, "Ready accounts") }); });
    assert.ok(container.querySelector(".accounts-page"));
    assert.equal(container.querySelector(".topbar"), header);
    assert.equal(container.querySelector(".loading-reveal").getAttribute("aria-busy"), "false");
    assert.equal(container.querySelectorAll('.loading-reveal[data-loading="true"]').length, 0);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 260)); });
    assert.equal(container.querySelector(".workspace-skeleton"), null, "remove the outgoing skeleton when its fade completes");

    const { UsersProvider } = await server.ssrLoadModule("/src/context/UsersProvider.tsx");
    let recordRequests = 0;
    const backend = { request: async () => { recordRequests++; return { users: [], session: null }; } };
    await act(async () => { root.render(e(UsersProvider, { enabled: false, backend }, e("div", null, "Persistent shell"))); });
    assert.equal(recordRequests, 0, "authentication must finish before a profile backend is read");
    assert.equal(container.textContent, "Persistent shell");
    await act(async () => { root.render(e(UsersProvider, { enabled: true, backend }, e("div", null, "Persistent shell"))); });
    assert.equal(recordRequests, 1);
    assert.equal(container.textContent, "Persistent shell");
  } finally {
    await act(async () => { root.unmount(); });
    await server.close();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
