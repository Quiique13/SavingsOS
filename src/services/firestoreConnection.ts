export const firestoreSetupMessage = "Cloud Firestore is not enabled for this project. Create the Firestore database in Firebase Console, publish its security rules, then try again.";

// The SDK can report a disabled API as "unavailable" or "client is offline".
// Diagnose that case through the database metadata endpoint, without reading any
// finance documents or sending account credentials. Other failures retain their
// original meaning, including denied access and real connection failures.
export async function firestoreConnectionError(error: unknown, projectId: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code !== "unavailable" && code !== "firestore/unavailable") return error;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetcher(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)?key=${encodeURIComponent(apiKey)}`, {
      signal: controller.signal, credentials: "omit", cache: "no-store",
    });
    if (response.ok) return error;
    const body = await response.json() as { error?: { details?: { reason?: string }[] } };
    if (body.error?.details?.some(detail => detail.reason === "SERVICE_DISABLED"))
      return new Error(firestoreSetupMessage, { cause: error });
  } catch {
    // Diagnostics must not hide or replace the original failure when offline.
  } finally { clearTimeout(timeout); }
  return error;
}
