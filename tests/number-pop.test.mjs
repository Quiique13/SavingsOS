import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement as e } from "react";
import { createRoot } from "react-dom/client";

test("financial highlights preserve formatting and animate only changed digits", async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = new Map();
  for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, IS_REACT_ACT_ENVIRONMENT: true })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  const container = document.getElementById("root");
  const root = createRoot(container);
  try {
    const { NumberPop } = await server.ssrLoadModule("/src/components/common/NumberPop.tsx");
    const render = async value => { await act(async () => { root.render(e(NumberPop, { value })); }); };
    const accessibleText = () => container.querySelector(".sr-only").textContent;
    const currentText = () => [...container.querySelectorAll(".t-digit")].map(node => node.getAttribute("data-digit")).join("");
    await render("€1,299.00");
    assert.equal(accessibleText(), "€1,299.00");
    assert.equal(currentText(), "€1,299.00");
    assert.equal(container.textContent, "€1,299.00", "copyable text contains exactly one current amount");
    assert.equal(container.querySelector(".t-digit-group").getAttribute("aria-hidden"), "true");
    assert.equal(container.querySelectorAll(".t-digit-slot").length, 6);
    const firstDigit = container.querySelector(".t-digit-slot");
    await render("€1,299.00");
    assert.equal(container.querySelector(".t-digit-slot"), firstDigit, "unrelated renders must not replay motion");
    await render("€1,305.00");
    assert.equal(accessibleText(), "€1,305.00");
    assert.equal(currentText(), "€1,305.00");
    assert.equal(container.querySelectorAll(".t-digit-slot").length, 3);
    assert.equal([...container.querySelectorAll(".t-digit-old")].map(node => node.getAttribute("data-digit")).join(""), "299");
    for (const value of ["-1\u00a0234,56\u00a0€", "CHF\u00a0123’456.78", "￥0", "—", "€10.00", "€9.99"]) {
      await render(value);
      assert.equal(accessibleText(), value);
      assert.equal(currentText(), value);
      assert.equal(container.textContent, value);
      assert.ok(container.querySelectorAll(".t-digit-old").length <= value.length);
    }
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
