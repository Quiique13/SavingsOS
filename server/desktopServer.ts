import { createServer } from "node:http";
import { extname } from "node:path";
import { createAppServer } from "./appServer";
import { listenLoopback } from "./loopback";

export type DesktopAssets = Record<string, string>;
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
};

export async function startDesktopServer(assets: DesktopAssets, directory: string) {
  const storage = createAppServer(directory);
  const server = createServer((request, response) => {
    const address = server.address();
    if (!address || typeof address === "string" || request.headers.host !== `localhost:${address.port}`) {
      response.writeHead(403).end();
      return;
    }
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Cache-Control", "no-store");
    storage.middleware(request, response, () => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      let path: string;
      try { path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname); }
      catch { response.writeHead(400).end(); return; }
      if (path.includes("\\") || path.includes("\0") || path.split("/").some(part => part.startsWith("."))) {
        response.writeHead(404).end();
        return;
      }
      // Only embedded build assets are public. BrowserRouter routes use index.html.
      const key = Object.hasOwn(assets, path) ? path : extname(path) ? "" : "/index.html";
      if (!Object.hasOwn(assets, key)) { response.writeHead(404).end(); return; }
      response.setHeader("Content-Type", types[extname(key)] ?? "application/octet-stream");
      response.end(request.method === "HEAD" ? undefined : Buffer.from(assets[key], "base64"));
    });
  });
  const port = await listenLoopback(server);
  return {
    server,
    url: `http://localhost:${port}`,
    async close() {
      storage.close();
      server.closeAllConnections();
      await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    },
  };
}
