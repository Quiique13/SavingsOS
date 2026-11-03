import { contextBridge, ipcRenderer } from "electron";

let beforeClose: () => Promise<void> = async () => {};
ipcRenderer.on("savingsos:prepare-close", (_event, token: string) => {
  void Promise.resolve().then(() => beforeClose()).then(
    () => ipcRenderer.send("savingsos:close-result", { token, success: true }),
    error => ipcRenderer.send("savingsos:close-result", { token, success: false, message: error instanceof Error ? error.message : "The latest changes could not be saved." }),
  );
});
contextBridge.exposeInMainWorld("savingsOSDesktop", {
  onBeforeClose(handler: () => Promise<void>) {
    beforeClose = handler;
    return () => { if (beforeClose === handler) beforeClose = async () => {}; };
  },
});
