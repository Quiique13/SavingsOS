import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { resolve } from "node:path";
import type { Plugin } from "vite";
import { FileStore } from "./fileStore";
import { UserVault, USERS_KEY, type UserSession } from "../src/planner/users/vault";
import { createInitialData } from "../src/planner/initialData";
import { isValidBackup, type AdminSettings } from "../src/planner/model";

const COOKIE = "savingsos_session";
const MAX_BODY = 25 * 1024 * 1024;
const SESSION_LIFETIME = 12 * 60 * 60 * 1000;
class HttpError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
type Session = { value: UserSession; expires: number };
async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw new HttpError(415, "Use a JSON request.");
  let length = 0; const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk); length += buffer.length;
    if (length > MAX_BODY) throw new HttpError(413, "This request is too large.");
    chunks.push(buffer);
  }
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(); return parsed; }
  catch { throw new HttpError(400, "This request is not valid JSON."); }
}
const textField = (value: unknown, name: string, optional = false) => {
  if (optional && value === undefined) return "";
  if (typeof value !== "string") throw new HttpError(400, "A valid " + name + " is required.");
  return value;
};
const revisionField = (value: unknown) => {
  if (!Number.isInteger(value) || Number(value) < 1) throw new HttpError(400, "A valid profile revision is required.");
  return Number(value);
};
export function createAppServer(directory: string) {
  const store = new FileStore(directory);
  const vault = new UserVault(store);
  const sessions = new Map<string, Session>();
  function tokenFrom(request: IncomingMessage): string | undefined {
    return request.headers.cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  }
  function cookie(response: ServerResponse, value: string, secure: boolean) {
    response.setHeader("Set-Cookie", COOKIE + "=" + value + "; Path=/api; HttpOnly; SameSite=Strict" + (secure ? "; Secure" : "") + (value ? "; Max-Age=43200" : "; Max-Age=0"));
  }
  function actor(token?: string): UserSession | null { return token ? sessions.get(token)?.value ?? null : null; }
  function authenticated(token: string | undefined, expectedRevision?: unknown): UserSession {
    const session = actor(token);
    if (!session) throw new HttpError(401, "Sign in before changing this profile.");
    if (expectedRevision !== undefined && revisionField(expectedRevision) !== session.revision) throw new HttpError(409, "This profile changed in another tab. Export unsaved changes, then reload.");
    return session;
  }
  function state(token?: string) {
    const session = actor(token);
    return { users: vault.list(), session: session ? { user: session.user, revision: session.revision, data: session.data } : null };
  }
  function send(response: ServerResponse, value: unknown, status = 200) {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify(value));
  }
  async function handle(request: IncomingMessage, response: ServerResponse) {
    response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Content-Type-Options", "nosniff");
    const host = request.headers.host || "";
    let hostname: string;
    try { hostname = new URL("http://" + host).hostname.replace(/^\[|\]$/g, ""); } catch { throw new HttpError(403, "Invalid app host."); }
    if (hostname !== "localhost" && !isIP(hostname)) throw new HttpError(403, "Use the local app address.");
    if (request.headers["sec-fetch-site"] === "cross-site") throw new HttpError(403, "Cross-site access is not allowed.");
    if (request.headers.origin) {
      try { if (new URL(request.headers.origin).host !== host) throw new Error(); }
      catch { throw new HttpError(403, "This request must come from the app."); }
    }
    if (request.method !== "GET" && request.headers["x-savingsos-client"] !== "1") throw new HttpError(403, "This request must come from the app.");
    const path = new URL(request.url || "/", "http://localhost").pathname;
    let token = tokenFrom(request);
    const secure = !!(request.socket as typeof request.socket & { encrypted?: boolean }).encrypted;
    for (const [key, session] of sessions) if (session.expires < Date.now()) sessions.delete(key);
    if (token && !sessions.has(token)) { cookie(response, "", secure); token = undefined; }
    if (request.method === "GET" && path === "/api/state") {
      if (token) {
        const session = sessions.get(token)!;
        try { session.value = await vault.refresh(session.value); session.expires = Date.now() + SESSION_LIFETIME; }
        catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (/no longer exists|password changed|Sign in again/.test(message)) { sessions.delete(token); cookie(response, "", secure); token = undefined; }
          else throw error;
        }
      }
      send(response, state(token)); return;
    }
    if (request.method === "GET" && path === "/api/profiles-backup") {
      const session = authenticated(token);
      await vault.listManagedUsers(session);
      response.setHeader("Content-Disposition", 'attachment; filename="savingsos-profiles-backup.json"');
      send(response, { format: "savingsos-profiles-backup", version: 1, registry: JSON.parse(store.getItem(USERS_KEY)!) }); return;
    }
    if (request.method !== "POST") throw new HttpError(404, "App endpoint not found.");
    const input = await body(request);
    await store.locked(async () => {
      if (path === "/api/migrate") {
        store.importBrowserRegistry(textField(input.registry, "browser registry"));
        vault.removeDefaultProfile();
      } else if (path === "/api/sign-in" || path === "/api/register" || path === "/api/setup-admin") {
        if (path === "/api/register" && actor(token)) throw new HttpError(403, "Sign out to create a new profile, or use admin profile management.");
        const password = textField(input.password, "password", true);
        const session = path === "/api/sign-in" ? await vault.open(textField(input.id, "profile ID"), password)
          : path === "/api/register" ? await vault.register(textField(input.name, "name"), createInitialData(), password)
          : await vault.createAdmin(textField(input.name, "name"), createInitialData(), password);
        if (token) sessions.delete(token);
        token = randomBytes(32).toString("hex"); sessions.set(token, { value: session, expires: Date.now() + SESSION_LIFETIME }); cookie(response, token, secure);
      } else if (path === "/api/sign-out") {
        if (token) sessions.delete(token); token = undefined; cookie(response, "", secure);
      } else if (path === "/api/save") {
        const session = authenticated(token, revisionField(input.revision));
        if (!isValidBackup(input.data)) throw new HttpError(400, "The finance records are invalid. Existing records have not been replaced.");
        sessions.get(token!)!.value = await vault.save(session, input.data);
      } else if (path === "/api/configure") {
        const session = authenticated(token, revisionField(input.revision));
        const password = input.password === null ? null : textField(input.password, "new password");
        sessions.get(token!)!.value = await vault.configure(session, textField(input.name, "name"), password, textField(input.currentPassword, "current password", true));
      } else if (path === "/api/admin/settings") {
        const session = authenticated(token, revisionField(input.revision));
        sessions.get(token!)!.value = await vault.saveAdminSettings(session, input.settings as AdminSettings);
      } else if (path === "/api/admin/create-user") {
        await vault.create(authenticated(token, revisionField(input.revision)), textField(input.name, "name"), createInitialData(), textField(input.password, "password", true));
      } else if (path === "/api/admin/rename-user" || path === "/api/admin/delete-user") {
        const session = authenticated(token, revisionField(input.revision));
        const id = textField(input.id, "profile ID"), revision = revisionField(input.targetRevision);
        if (path.endsWith("rename-user")) await vault.renameUser(session, id, revision, textField(input.name, "name"));
        else await vault.deleteUser(session, id, revision);
      } else if (path === "/api/admin/refresh-users") {
        await vault.listManagedUsers(authenticated(token, revisionField(input.revision)));
      } else throw new HttpError(404, "App endpoint not found.");
      send(response, state(token));
    });
  }
  function middleware(request: IncomingMessage, response: ServerResponse, next: () => void) {
    let path: string;
    try { path = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname); } catch { response.statusCode = 400; response.end(); return; }
    if (path.toLowerCase().includes(".savingsos-data")) { response.statusCode = 404; response.end(); return; }
    if (!path.startsWith("/api/")) { next(); return; }
    void handle(request, response).catch(error => {
      const message = error instanceof Error ? error.message : "App storage is unavailable. Saved records have not been changed.";
      const status = error instanceof HttpError ? error.status : /another tab|already exists|conflict/.test(message) ? 409 : /password is incorrect|Enter this user/.test(message) ? 401 : /Sign in|Unlock the admin/.test(message) ? 403 : /could not be (read|saved)|damaged or unsupported/.test(message) ? 500 : 400;
      if (!response.headersSent) send(response, { error: message }, status); else response.end();
    });
  }
  return { middleware, store, vault, close: () => sessions.clear() };
}
export function localAppStorage(): Plugin {
  let root = process.cwd();
  let app: ReturnType<typeof createAppServer>;
  return {
    name: "savingsos-local-storage",
    configResolved(config) { root = config.root; },
    configureServer(server) { app = createAppServer(resolve(root, ".savingsos-data")); server.middlewares.use(app.middleware); server.httpServer?.once("close", () => app.close()); },
    configurePreviewServer(server) { app = createAppServer(resolve(root, ".savingsos-data")); server.middlewares.use(app.middleware); server.httpServer.once("close", () => app.close()); },
  };
}
