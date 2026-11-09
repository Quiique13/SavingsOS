import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { once } from "node:events";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const executable = resolve(`output/windows/savingsOS-${version}-windows-x64-portable.exe`);
const prefix = join(tmpdir(), "savingsos-windows-smoke-");
const directory = mkdtempSync(prefix);
let child;
async function start() {
  child = spawn(executable, ["--no-browser", `--data-dir=${directory}`], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stderr.on("data", chunk => { output += chunk; });
  return await new Promise((done, reject) => {
    const timeout = setTimeout(() => reject(Error("App startup timed out: " + output)), 20000);
    child.on("error", error => { clearTimeout(timeout); reject(error); });
    child.on("exit", code => { clearTimeout(timeout); reject(Error(`App exited (${code}): ${output}`)); });
    child.stdout.on("data", chunk => {
      output += chunk;
      const match = output.match(/savingsOS is ready: (http:\/\/localhost:\d+)/);
      if (match) { clearTimeout(timeout); done(match[1]); }
    });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const exited = once(child, "exit");
  child.kill();
  await exited;
}
try {
  let url = await start();
  const page = await fetch(url);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /savingsOS/);
  const script = html.match(/src="([^"]+\.js)"/)[1];
  const javascript = await fetch(url + script).then(response => response.text());
  assert.ok(javascript.length > 10000);
  assert.ok(!javascript.includes("/SavingsOS/assets/"), "Desktop assets use the local origin");
  assert.equal((await fetch(url + "/settings")).status, 200);
  for (const path of ["/data/profiles.json", "/.savingsos-data/profiles.json", "/package.json", "/api/not-a-route"]) {
    assert.equal((await fetch(url + path)).status, 404, path);
  }
  const denied = await fetch(url + "/api/register", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://example.com", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ name: "Unwanted" }) });
  assert.equal(denied.status, 403);
  const registered = await fetch(url + "/api/register", { method: "POST", headers: { "Content-Type": "application/json", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ name: "Windows smoke profile", password: "smoke-password-123" }) });
  assert.equal(registered.status, 200);
  const state = await registered.json();
  const profile = state.session.user;
  assert.equal(profile.name, "Windows smoke profile");
  assert.ok(!readFileSync(join(directory, "profiles.json"), "utf8").includes("smoke-password-123"));
  await stop();
  url = await start();
  const restored = await fetch(url + "/api/sign-in", { method: "POST", headers: { "Content-Type": "application/json", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ id: profile.id, password: "smoke-password-123" }) });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).session.user.id, profile.id);
  console.log("Windows executable passed: embedded UI, routes, private files, cross-site rejection, encrypted profile, restart and sign-in.");
} finally {
  await stop();
  if (!resolve(directory).startsWith(resolve(tmpdir()) + sep) || !directory.startsWith(prefix)) throw Error("Unexpected test directory.");
  rmSync(directory, { recursive: true, force: true });
}
