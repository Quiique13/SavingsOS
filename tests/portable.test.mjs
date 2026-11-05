import test from "node:test";
import assert from "node:assert/strict";
import { fixtureAccounts } from "./account-fixtures.mjs";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "vite";
import { appClient, temporaryAppDirectory, removeTemporaryAppDirectory } from "./app-server-helpers.mjs";
import ts from "typescript";
import vm from "node:vm";

test("portable desktop serves only its bundled UI and preserves private profiles", async t => {
  const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom", logLevel: "error" });
  const root = temporaryAppDirectory();
  let running;
  try {
    const { startPortableHost } = await vite.ssrLoadModule("/server/portableHost.ts");
    const { portableDataDirectory } = await vite.ssrLoadModule("/desktop/paths.ts");
    const web = join(root, "web"), data = join(root, "private");
    mkdirSync(web);
    writeFileSync(join(web, "index.html"), '<!doctype html><html><head><script>window.theme="light"</script></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
    writeFileSync(join(web, "app.js"), 'console.log("bundled UI")');
    running = await startPortableHost(web, data);
    await t.test("SPA routes, assets, methods, and CSP remain correct", async () => {
      const page = await fetch(running.url + "/settings");
      assert.equal(page.status, 200);
      assert.match(page.headers.get("content-security-policy"), /script-src 'self' 'sha256-/);
      assert.ok(!page.headers.get("content-security-policy").includes("script-src 'self' 'unsafe-inline'"));
      assert.match(await page.text(), /id="root"/);
      assert.match((await fetch(running.url + "/app.js")).headers.get("content-type"), /javascript/);
      assert.equal((await fetch(running.url + "/missing.js")).status, 404);
      assert.equal((await fetch(running.url + "/assets/missing")).status, 404);
      assert.equal((await fetch(running.url + "/%2e%2e%5csecret.txt")).status, 404);
      assert.equal((await fetch(running.url + "/.savingsos-data/profiles.json")).status, 404);
      assert.equal((await fetch(running.url + "/private/profiles.json")).status, 404);
      assert.equal((await fetch(running.url + "/settings", { method: "POST" })).status, 405);
      assert.equal((await fetch(running.url + "/settings", { method: "HEAD" })).status, 200);
      assert.equal((await fetch(running.url + "/api/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.com", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ name: "Blocked" }) })).status, 403);
    });
    await t.test("password-protected records survive a portable server restart", async () => {
      let client = appClient(running.url);
      let result = await client.request("register", { name: "Portable Alice", password: "portable password" });
      assert.equal(result.status, 200);
      const id = result.value.session.user.id;
      const next = { ...result.value.session.data, accounts: fixtureAccounts(), income: [{ id: "salary", name: "Private salary", amount: 1450, date: "2026-10-01", accountId: "moey" }] };
      result = await client.request("save", { data: next });
      assert.equal(result.status, 200);
      assert.ok(!readFileSync(join(data, "profiles.json"), "utf8").includes("Private salary"));
      await running.close();
      running = await startPortableHost(web, data);
      client = appClient(running.url);
      assert.equal((await client.request("state")).value.session, null);
      assert.equal((await client.request("sign-in", { id, password: "wrong" })).status, 401);
      result = await client.request("sign-in", { id, password: "portable password" });
      assert.deepEqual(result.value.session.data, next);
    });
    await t.test("portable storage follows the executable directory, not the extraction directory", () => {
      const actual = portableDataDirectory({ executable: join(root, "extracted/app.exe"), portableDirectory: join(root, "USB") });
      assert.equal(actual, join(root, "USB/savingsOS-data"));
      assert.equal(portableDataDirectory({ executable: join(root, "unpacked/app.exe") }), join(root, "unpacked/savingsOS-data"));
    });
  } finally { if (running) await running.close(); await vite.close(); removeTemporaryAppDirectory(root); }
});

test("desktop close waits for saves and reports failures without closing", async () => {
  let exposed, listener;
  const sent = [];
  const source = ts.transpileModule(readFileSync(new URL("../desktop/preload.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023 } }).outputText;
  vm.runInNewContext(source, { exports: {}, require(name) { assert.equal(name, "electron"); return { contextBridge: { exposeInMainWorld(_name, api) { exposed = api; } }, ipcRenderer: { on(_event, handler) { listener = handler; }, send(_event, result) { sent.push(result); } } }; } });
  let finish;
  const unsubscribe = exposed.onBeforeClose(() => new Promise(resolve => { finish = resolve; }));
  listener({}, "save-token");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 0);
  finish();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent[0].success, true);
  assert.equal(sent[0].token, "save-token");
  unsubscribe();
  exposed.onBeforeClose(async () => { throw Error("Disk full"); });
  listener({}, "failed-token");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent[1].success, false);
});
