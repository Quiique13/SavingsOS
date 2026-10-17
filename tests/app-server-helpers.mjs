import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
const nativeFetch = globalThis.fetch;
export function temporaryAppDirectory() { return mkdtempSync(join(tmpdir(), "savingsos-test-")); }
export function removeTemporaryAppDirectory(directory) {
  if (resolve(dirname(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith("savingsos-test-")) throw new Error("Refusing to remove a directory outside the test temporary root.");
  rmSync(directory, { recursive: true, force: true });
}
export async function startApp(createAppServer, directory) {
  const app = createAppServer(directory);
  const http = createServer((request, response) => app.middleware(request, response, () => { response.statusCode = 404; response.end(); }));
  await new Promise(resolve => http.listen(0, "127.0.0.1", resolve));
  return { app, base: "http://127.0.0.1:" + http.address().port, async close() { app.close(); http.closeAllConnections(); await new Promise(resolve => http.close(resolve)); } };
}
export function appClient(base) {
  let cookie = "";
  const client = {
    state: null,
    async fetch(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("Origin", base);
      if (cookie) headers.set("Cookie", cookie);
      const response = await nativeFetch(new URL(path, base), { ...init, headers });
      const next = response.headers.get("set-cookie");
      if (next) cookie = next.split(";")[0];
      return response;
    },
    async request(path, input) {
      const response = await client.fetch("/api/" + path, input === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-SavingsOS-Client": "1" }, body: JSON.stringify({ revision: client.state?.session?.revision, ...input }) });
      const value = await response.json();
      if (response.ok && Array.isArray(value.users)) client.state = value;
      return { status: response.status, value, response };
    },
  };
  return client;
}
