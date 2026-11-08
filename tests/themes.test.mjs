import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import postcss from "postcss";

test("High Contrast palettes keep text at least 7:1 against their surfaces", () => {
  const css = postcss.parse(readFileSync("src/styles/ui-themes.css", "utf8"));
  const palette = {};
  const luminance = hex => {
    const channels = hex.replace("#", "").match(/../g).map(value => {
      const channel = parseInt(value, 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const contrast = (a, b) => {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  for (const mode of ["light", "dark"]) {
    const selector = ':root[data-ui-theme="high-contrast"]' + (mode === "dark" ? '[data-theme="dark"]' : "");
    css.walkRules(selector, rule => rule.walkDecls(declaration => { palette[declaration.prop] = declaration.value; }));
    for (const surface of ["--ui-canvas", "--ui-surface", "--ui-soft"]) {
      for (const text of ["--ui-ink", "--ui-muted", "--ui-accent"]) {
        assert.ok(contrast(palette[text], palette[surface]) >= 7, `${mode}: ${text} on ${surface}`);
      }
    }
    assert.ok(contrast(palette["--ui-on-accent"], palette["--ui-accent"]) >= 7, `${mode}: button labels`);
    for (const text of ["--color-success", "--color-warning", "--color-danger"]) {
      assert.ok(contrast(palette[text], palette["--ui-surface"]) >= 7, `${mode}: ${text}`);
    }
    assert.ok(contrast(palette["--ui-border"], palette["--ui-surface"]) >= 3, `${mode}: boundaries`);
    assert.ok(contrast(palette["--color-focus"], palette["--ui-surface"]) >= 3, `${mode}: focus ring`);
  }
});

test("UI themes preserve existing palettes, persist, and synchronize across tabs", async t => {
  const dom = new JSDOM('<!doctype html><html><head><meta name="theme-color"></head><body><div id="root"></div></body></html>', { url: "http://localhost/" });
  const previous = new Map();
  for (const name of ["window", "document", "navigator", "HTMLElement", "Event", "MouseEvent", "localStorage"]) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === "window" ? dom.window : name === "document" ? dom.window.document : dom.window[name] });
  }
  previous.set("IS_REACT_ACT_ENVIRONMENT", Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"));
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createElement: e, act } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  let root;
  try {
    const { ThemeProvider } = await server.ssrLoadModule("/src/context/ThemeProvider.tsx");
    const { AppearanceSettings } = await server.ssrLoadModule("/src/components/theme/ThemeControls.tsx");
    const { uiThemes, colorSchemes } = await server.ssrLoadModule("/src/utils/appearance.ts");
    const { messages } = await server.ssrLoadModule("/src/i18n/messages.ts");
    const container = document.getElementById("root");
    const current = () => document.documentElement.dataset;
    const canvas = () => document.querySelector('meta[name="theme-color"]').content;
    const click = async selector => {
      const button = container.querySelector(selector);
      assert.ok(button, selector);
      await act(async () => button.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
    };
    const mount = async () => {
      if (root) await act(async () => root.unmount());
      root = createRoot(container);
      await act(async () => root.render(e(ThemeProvider, null, e(AppearanceSettings))));
    };
    await t.test("existing installations keep their mode and colour scheme under Default", async () => {
      localStorage.setItem("savings-os-theme", "dark");
      localStorage.setItem("savings-os-color-scheme", "sage");
      await mount();
      assert.equal(current().uiTheme, "default");
      assert.equal(current().theme, "dark");
      assert.equal(current().colorScheme, "sage");
      assert.equal(canvas(), "#19211d");
      assert.equal(container.querySelectorAll(".ui-theme-option").length, 7);
      assert.equal(container.querySelectorAll(".scheme-option").length, 6);
    });
    await t.test("every family supports both modes, selected state, and reload persistence", async () => {
      for (const option of uiThemes) {
        for (const [mode, paletteKey] of [["light", "lightCanvas"], ["dark", "darkCanvas"]]) {
          await click(`.ui-theme-option[data-ui-option="${option.id}"]`);
          await click(`.theme-option:has(.preview-${mode})`);
          assert.equal(current().uiTheme, option.id);
          assert.equal(current().theme, mode);
          assert.equal(current().colorScheme, "sage");
          assert.equal(canvas(), (option.id === "default" ? colorSchemes.find(p => p.id === "sage") : option)[paletteKey]);
          assert.equal(localStorage.getItem("savings-os-ui-theme"), option.id);
          assert.equal(container.querySelectorAll('.ui-theme-option[aria-pressed="true"]').length, 1);
          assert.equal(container.querySelector('.ui-theme-option[aria-pressed="true"]').dataset.uiOption, option.id);
          assert.equal(container.querySelectorAll(".scheme-option").length, option.id === "default" ? 6 : 0);
          await mount();
          assert.equal(current().uiTheme, option.id);
          assert.equal(current().theme, mode);
        }
        assert.ok(messages[option.name], option.name);
        assert.ok(messages[option.description], option.description);
      }
      await click('.ui-theme-option[data-ui-option="default"]');
      assert.equal(container.querySelector('.scheme-option[aria-pressed="true"]').dataset.scheme, "sage");
    });
    await t.test("storage events update all appearance axes, including clearing preferences", async () => {
      localStorage.setItem("savings-os-ui-theme", "terminal");
      await act(async () => dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: "savings-os-ui-theme", newValue: "terminal" })));
      assert.equal(current().uiTheme, "terminal");
      assert.equal(current().theme, "dark");
      assert.equal(canvas(), "#0c1710");
      localStorage.clear();
      await act(async () => dom.window.dispatchEvent(new dom.window.StorageEvent("storage", { key: null })));
      assert.equal(current().uiTheme, "default");
      assert.equal(current().colorScheme, "ocean");
      assert.equal(current().theme, "light");
    });
    await t.test("invalid saved values fall back safely", async () => {
      localStorage.setItem("savings-os-ui-theme", "toString");
      localStorage.setItem("savings-os-color-scheme", "missing");
      await mount();
      assert.equal(current().uiTheme, "default");
      assert.equal(current().colorScheme, "ocean");
    });
    await t.test("blocked storage still allows theme and mode changes for this session", async () => {
      const prototype = dom.window.Storage.prototype;
      const { getItem, setItem } = prototype;
      prototype.getItem = () => { throw new Error("Storage unavailable"); };
      prototype.setItem = () => { throw new Error("Storage unavailable"); };
      try {
        await mount();
        await click('.ui-theme-option[data-ui-option="high-contrast"]');
        await click('.theme-option:has(.preview-dark)');
        assert.equal(current().uiTheme, "high-contrast");
        assert.equal(current().theme, "dark");
        assert.equal(canvas(), "#000000");
      } finally {
        prototype.getItem = getItem;
        prototype.setItem = setItem;
      }
    });
    await t.test("the pre-paint bootstrap agrees with the mounted provider in every combination", () => {
      const html = readFileSync("index.html", "utf8");
      const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
      const startup = new JSDOM(html, { url: "http://localhost/", runScripts: "outside-only" });
      startup.window.matchMedia = () => ({ matches: false });
      try {
        for (const option of uiThemes) {
          for (const scheme of colorSchemes) {
            for (const mode of ["light", "dark"]) {
              startup.window.localStorage.setItem("savings-os-ui-theme", option.id);
              startup.window.localStorage.setItem("savings-os-color-scheme", scheme.id);
              startup.window.localStorage.setItem("savings-os-theme", mode);
              startup.window.eval(script);
              assert.equal(startup.window.document.documentElement.dataset.uiTheme, option.id);
              assert.equal(startup.window.document.documentElement.dataset.colorScheme, scheme.id);
              assert.equal(startup.window.document.querySelector('meta[name="theme-color"]').content, (option.id === "default" ? scheme : option)[mode === "dark" ? "darkCanvas" : "lightCanvas"]);
            }
          }
        }
        startup.window.localStorage.setItem("savings-os-ui-theme", "__proto__");
        startup.window.eval(script);
        assert.equal(startup.window.document.documentElement.dataset.uiTheme, "default");
      } finally { startup.window.close(); }
    });
  } finally {
    if (root) await act(async () => root.unmount());
    await server.close();
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
});
