import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { accessSync, closeSync, constants, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { randomUUID, webcrypto } from "node:crypto";
import { startPortableHost } from "../server/portableHost";
import { portableDataDirectory } from "./paths";

if (typeof globalThis.crypto === "undefined") Object.defineProperty(globalThis, "crypto", { value: webcrypto });
const smoke = process.argv.includes("--portable-smoke-test");
const smokeDirectory = process.env.SAVINGSOS_SMOKE_DIRECTORY;
if (smoke && (!smokeDirectory || !isAbsolute(smokeDirectory))) throw new Error("A separate absolute smoke-test directory is required.");
const dataRoot = smoke ? smokeDirectory! : portableDataDirectory({
  executable: app.getPath("exe"),
  portableDirectory: process.env.PORTABLE_EXECUTABLE_DIR,
  developmentDirectory: app.isPackaged ? undefined : join(process.cwd(), "output/windows/development"),
});
app.setName("savingsOS");
app.setAppUserModelId("com.savingsos.desktop");
try {
  mkdirSync(dataRoot, { recursive: true });
  accessSync(dataRoot, constants.W_OK);
  const probe = join(dataRoot, ".write-test-" + randomUUID());
  closeSync(openSync(probe, "wx", 0o600)); unlinkSync(probe);
  mkdirSync(join(dataRoot, "browser"), { recursive: true });
  app.setPath("userData", join(dataRoot, "browser"));
  app.setAppLogsPath(join(dataRoot, "logs"));
} catch (error) {
  dialog.showErrorBox("savingsOS could not open its data folder", "Move the portable app to a writable folder, then open it again. Your existing records have been kept.\n\n" + (error instanceof Error ? error.message : String(error)));
  app.exit(1);
}
let host: Awaited<ReturnType<typeof startPortableHost>> | undefined;
let window: BrowserWindow | null = null;
const locked = app.requestSingleInstanceLock();
if (!locked) app.quit();
else {
  app.on("second-instance", () => { if (window) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.on("window-all-closed", () => { if (!smoke) app.quit(); });
  app.on("will-quit", () => { void host?.close(); });
  void app.whenReady().then(async () => {
    host = await startPortableHost(join(__dirname, "web"), join(dataRoot, ".savingsos-data"));
    window = new BrowserWindow({
      width: 1440, height: 960, minWidth: 390, minHeight: 600, show: false,
      title: "savingsOS", backgroundColor: "#111813",
      icon: join(__dirname, "icon.png"), autoHideMenuBar: true,
      webPreferences: { preload: join(__dirname, "preload.cjs"), contextIsolation: true, sandbox: true, nodeIntegration: false, webSecurity: true },
    });
    const view = window;
    view.setMenuBarVisibility(false);
    view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    view.webContents.on("will-navigate", (event, url) => { if (new URL(url).origin !== host!.url) event.preventDefault(); });
    view.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    view.webContents.session.setPermissionCheckHandler(() => false);
    view.webContents.session.on("will-download", (_event, item) => {
      item.setSaveDialogOptions({ title: "Save savingsOS export", defaultPath: join(dataRoot, item.getFilename()) });
    });
    let closing = false, allowClose = false;
    let token = "";
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const closeFailed = (message: string) => {
      if (timeout) clearTimeout(timeout);
      closing = false;
      if (!view.isDestroyed()) void dialog.showMessageBox(view, { type: "error", title: "Your changes need attention", message: "Your latest changes could not be saved.", detail: message + "\nKeep the app open and export a backup from Settings.", buttons: ["Keep app open"] });
    };
    ipcMain.on("savingsos:close-result", (event, result: { token?: string; success?: boolean; message?: string }) => {
      if (event.sender !== view.webContents || event.senderFrame?.url?.split("/").slice(0, 3).join("/") !== host!.url || !closing || result?.token !== token) return;
      if (result.success !== true) { closeFailed(String(result.message || "Try saving again.").slice(0, 1500)); return; }
      if (timeout) clearTimeout(timeout);
      allowClose = true; view.close();
    });
    view.on("close", event => {
      if (allowClose || smoke) return;
      event.preventDefault();
      if (closing) return;
      closing = true; token = randomUUID();
      timeout = setTimeout(() => closeFailed("The app did not finish saving in time."), 20000);
      view.webContents.send("savingsos:prepare-close", token);
    });
    view.on("closed", () => { if (timeout) clearTimeout(timeout); window = null; });
    await view.loadURL(host.url);
    if (smoke) {
      let cookie = "";
      const request = async (route: string, input?: object) => {
        const response = await fetch(host!.url + "/api/" + route, { method: input ? "POST" : "GET", headers: { Origin: host!.url, ...(cookie ? { Cookie: cookie } : {}), ...(input ? { "Content-Type": "application/json", "X-SavingsOS-Client": "1" } : {}) }, body: input ? JSON.stringify(input) : undefined });
        const next = response.headers.get("set-cookie"); if (next) cookie = next.split(";")[0];
        const value = await response.json();
        if (!response.ok) throw new Error(value.error || "Packaged API check failed.");
        return value;
      };
      let state = await request("state");
      const existing = state.users.find((user: { name: string }) => user.name === "Portable test");
      state = existing ? await request("sign-in", { id: existing.id, password: "portable test password" }) : await request("register", { name: "Portable test", password: "portable test password" });
      if (!existing) {
        const data = { ...state.session.data, income: [{ id: "portable-salary", name: "Portable test salary", amount: 1250, date: "2026-10-01", accountId: "moey" }] };
        state = await request("save", { revision: state.session.revision, data });
      }
      if (state.session.data.income[0]?.amount !== 1250) throw new Error("The portable records did not persist.");
      const stored = readFileSync(join(dataRoot, ".savingsos-data/profiles.json"), "utf8");
      if (stored.includes("Portable test salary")) throw new Error("Protected records were not encrypted.");
      writeFileSync(join(dataRoot, "smoke-result.json"), JSON.stringify({ ok: true, resumed: !!existing, encrypted: true, version: app.getVersion(), portableDirectory: process.env.PORTABLE_EXECUTABLE_DIR || null }, null, 2));
      await host.close(); host = undefined; app.exit(0);
    } else view.show();
  }).catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    if (smoke) writeFileSync(join(dataRoot, "smoke-result.json"), JSON.stringify({ ok: false, error: message }));
    else dialog.showErrorBox("savingsOS could not start", message);
    app.exit(1);
  });
}
