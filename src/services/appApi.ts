import { Capacitor } from "@capacitor/core";
import { type Data } from "../types/finance";
import { type ListedUser, type User } from "./profileVault";
import { browserStorage } from "./runtime";
export type AppSession = { user: User; revision: number; data: Data };
export type AppState = { users: ListedUser[]; session: AppSession | null };
export async function appRequest<T = AppState>(path: string, input?: object): Promise<T> {
  if (Capacitor.isNativePlatform()) {
    const { nativeProfiles } = await import("./nativeAppApi");
    return nativeProfiles.request<T>(path, input);
  }
  if (browserStorage) {
    const { browserProfiles } = await import("./browserProfiles");
    return browserProfiles.request<T>(path, input);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("/api/" + path, { method: input ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: input ? { "Content-Type": "application/json", "X-SavingsOS-Client": "1" } : {}, body: input ? JSON.stringify(input) : undefined, signal: controller.signal });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("The local app server is unavailable. Start savingsOS with npm run dev or npm run preview.");
    const value = await response.json();
    if (!response.ok) throw new Error(typeof value.error === "string" ? value.error : "The app could not save this change.");
    return value as T;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error("The app server took too long to respond. Your last saved records have been kept.", { cause: error });
    if (error instanceof TypeError) throw new Error("The app server could not be reached. Reopen savingsOS with the local server running.", { cause: error });
    throw error;
  } finally { clearTimeout(timeout); }
}
