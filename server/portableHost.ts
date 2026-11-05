import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { createAppServer } from "./appServer";
import { listenLoopback } from "./loopback";

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};
export async function startPortableHost(webDirectory: string, dataDirectory: string) {
  const web = resolve(webDirectory);
  const index = await readFile(resolve(web, "index.html"));
  const inline = [...index.toString("utf8").matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => "'sha256-" + createHash("sha256").update(match[1]).digest("base64") + "'");
  const policy = "default-src 'self'; script-src 'self' " + inline.join(" ") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
  const api = createAppServer(resolve(dataDirectory));
  function plain(response: ServerResponse, status: number, message: string) {
    response.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }); response.end(message);
  }
  async function serve(request: IncomingMessage, response: ServerResponse) {
    if (!["GET", "HEAD"].includes(request.method || "")) { plain(response, 405, "Method not allowed."); return; }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname); }
    catch { plain(response, 400, "Invalid URL."); return; }
    if (pathname.includes(String.fromCharCode(0)) || pathname.split(/[/\\\\]/).includes("..")) { plain(response, 404, "Not found."); return; }
    const filename = resolve(web, "." + pathname);
    const within = relative(web, filename);
    if (isAbsolute(within) || within === ".." || within.startsWith(".." + sep)) { plain(response, 404, "Not found."); return; }
    let bytes: Buffer;
    let extension = extname(filename);
    try { bytes = await readFile(filename); }
    catch {
      if (extension || pathname.startsWith("/assets/") || pathname === "/api") { plain(response, 404, "Not found."); return; }
      bytes = index; extension = ".html";
    }
    response.writeHead(200, { "Content-Type": mime[extension] || "application/octet-stream", "Content-Length": bytes.length, "Cache-Control": extension === ".html" ? "no-store" : "public, max-age=3600" });
    response.end(request.method === "HEAD" ? undefined : bytes);
  }
  const http = createServer((request, response) => {
    response.setHeader("Content-Security-Policy", policy);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    api.middleware(request, response, () => {
      void serve(request, response).catch(() => { if (!response.headersSent) plain(response, 500, "The app could not load this file."); else response.end(); });
    });
  });
  const port = await listenLoopback(http);
  return {
    url: "http://127.0.0.1:" + port,
    async close() { api.close(); http.closeAllConnections(); await new Promise<void>(done => http.close(() => done())); },
  };
}
