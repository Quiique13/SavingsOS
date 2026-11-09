const { spawn } = require("node:child_process");
const { mkdirSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");
const { getAsset } = require("node:sea");
const { startDesktopServer } = require("../server/desktopServer.ts");

(async () => {
  const installed = process.argv.includes("--installed");
  const dataArgument = process.argv.find(argument => argument.startsWith("--data-dir="));
  const directory = dataArgument ? resolve(dataArgument.slice(11)) : installed
    ? join(process.env.APPDATA || dirname(process.execPath), "savingsOS", "data")
    : join(dirname(process.execPath), "data");
  mkdirSync(directory, { recursive: true });
  const assets = JSON.parse(getAsset("web-assets", "utf8"));
  const app = await startDesktopServer(assets, directory);
  console.log(`savingsOS is ready: ${app.url}`);
  console.log(`Local profiles: ${directory}`);
  console.log("Keep this window open while using savingsOS. Close it to stop the app.");
  if (!process.argv.includes("--no-browser")) {
    const browser = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", app.url], { detached: true, stdio: "ignore", windowsHide: true });
    browser.on("error", () => console.error(`Open ${app.url} in your browser.`));
    browser.unref();
  }
  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    await app.close();
  }
  process.on("SIGINT", () => void close());
  process.on("SIGTERM", () => void close());
})().catch(error => {
  console.error("savingsOS could not start:", error.message);
  process.exitCode = 1;
});
