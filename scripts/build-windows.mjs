import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { build as bundle } from "esbuild";
import { build as packageApp } from "electron-builder";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "win32") throw new Error("Run this Windows portable build on Windows.");
const temporaryRoot = fs.realpathSync(os.tmpdir());
const stage = fs.mkdtempSync(path.join(temporaryRoot, "savingsos-windows-"));
const application = path.join(stage, "application");
const artifacts = path.join(stage, "artifacts");
fs.mkdirSync(application, { recursive: true });
fs.mkdirSync(artifacts);
const desktopVersion = "1.0.0";
const electronVersion = JSON.parse(fs.readFileSync(path.join(root, "node_modules/electron/package.json"), "utf8")).version;
fs.writeFileSync(path.join(stage, "package.json"), JSON.stringify({ name: "savingsos-build", version: desktopVersion, devDependencies: { electron: electronVersion } }));
fs.writeFileSync(path.join(application, "package.json"), JSON.stringify({
  name: "savingsos-desktop", productName: "savingsOS", version: desktopVersion,
  description: "Personal finance for everyday spending, bills and savings",
  author: "savingsOS", main: "main.cjs",
}, null, 2));
await bundle({
  entryPoints: [path.join(root, "desktop/main.ts")], outfile: path.join(application, "main.cjs"),
  bundle: true, platform: "node", target: "node22", format: "cjs", external: ["electron"],
  legalComments: "eof",
});
await bundle({
  entryPoints: [path.join(root, "desktop/preload.ts")], outfile: path.join(application, "preload.cjs"),
  bundle: true, platform: "node", target: "node22", format: "cjs", external: ["electron"],
});
fs.cpSync(path.join(root, "dist"), path.join(application, "web"), { recursive: true });
for (const name of ["icon.png", "icon.ico"]) fs.copyFileSync(path.join(root, "desktop/assets", name), path.join(application, name));
const config = {
  appId: "com.savingsos.desktop", productName: "savingsOS", electronVersion,
  directories: { app: application, output: artifacts, buildResources: path.join(root, "desktop/assets") },
  files: ["main.cjs", "preload.cjs", "package.json", "web/**/*", "web/.vite/license.md", "icon.png", "icon.ico"],
  asar: true, compression: "normal", npmRebuild: false,
  win: { target: [{ target: "portable", arch: ["x64"] }], icon: path.join(root, "desktop/assets/icon.ico"), artifactName: "savingsOS-Portable.exe", requestedExecutionLevel: "asInvoker" },
  portable: { requestExecutionLevel: "user" },
};
console.log("Building portable savingsOS " + desktopVersion + " with Electron " + electronVersion);
await packageApp({ projectDir: stage, config, publish: "never" });

async function smoke(executable, directory, portable) {
  fs.mkdirSync(directory, { recursive: true });
  for (let run = 0; run < 2; run++) {
    const resultFile = path.join(directory, "smoke-result.json");
    if (fs.existsSync(resultFile)) fs.unlinkSync(resultFile);
    const env = { ...process.env, SAVINGSOS_SMOKE_DIRECTORY: directory };
    delete env.ELECTRON_RUN_AS_NODE;
    let log = "";
    const child = spawn(executable, ["--portable-smoke-test"], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", data => { log = (log + data).slice(-8000); });
    child.stderr.on("data", data => { log = (log + data).slice(-8000); });
    const code = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.kill(); reject(new Error("The packaged app startup check timed out. " + log)); }, 60000);
      child.once("error", error => { clearTimeout(timer); reject(error); });
      child.once("exit", code => { clearTimeout(timer); resolve(code); });
    });
    assert.equal(code, 0, "Packaged application failed: " + log);
    const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
    assert.equal(result.ok, true, result.error);
    assert.equal(result.resumed, run === 1, "Profile persistence across restarts failed");
    assert.equal(result.encrypted, true);
    if (portable) assert.equal(path.resolve(result.portableDirectory).toLowerCase(), path.dirname(executable).toLowerCase());
    console.log((portable ? "Portable" : "Desktop") + " startup, encryption and " + (run ? "restart" : "first-save") + " check passed");
  }
}
await smoke(path.join(artifacts, "win-unpacked/savingsOS.exe"), path.join(stage, "smoke-unpacked"), false);
const executable = path.join(artifacts, "savingsOS-Portable.exe");
await smoke(executable, path.join(stage, "smoke-portable"), true);
const output = path.join(root, "output/windows");
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(executable, path.join(output, "savingsOS-Portable.exe"));
console.log("Portable app ready: " + path.join(output, "savingsOS-Portable.exe"));
const resolved = fs.realpathSync(stage);
if (path.dirname(resolved) !== temporaryRoot || !path.basename(resolved).startsWith("savingsos-windows-")) throw new Error("Unexpected staging path. Cleanup cancelled.");
try { fs.rmSync(resolved, { recursive: true, force: true }); }
catch { console.log("Temporary build files remain at " + stage); }
