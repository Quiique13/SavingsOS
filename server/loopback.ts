import type { Server } from "node:http";

// Windows can allocate a port that Chromium and fetch block (for example 6000).
// The blocked unprivileged ports are defined by https://fetch.spec.whatwg.org/#port-blocking.
const blocked = new Set([
  1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666,
  6667, 6668, 6669, 6679, 6697, 10080,
]);
export async function listenLoopback(server: Server): Promise<number> {
  for (let attempt = 0; attempt < 100; attempt++) {
    await new Promise<void>((ready, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        ready();
      });
    });
    const address = server.address();
    if (
      address &&
      typeof address !== "string" &&
      address.port > 1023 &&
      !blocked.has(address.port)
    )
      return address.port;
    await new Promise<void>((done, reject) =>
      server.close((error) => (error ? reject(error) : done())),
    );
  }
  throw new Error(
    "A browser-compatible local app port could not be allocated. Try opening savingsOS again.",
  );
}
