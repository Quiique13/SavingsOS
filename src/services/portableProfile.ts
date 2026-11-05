import type { ProfileRecord } from "./profileVault";
import { isValidBackup } from "../utils/finance";

export type PortableProfile = {
  format: "savingsos-portable-profile";
  version: 1;
  exportedAt: string;
  profile: ProfileRecord;
};

// Rebuild the record from known fields. A transfer cannot import admin privileges,
// migration metadata, or an arbitrary registry alongside the selected profile.
export function parsePortableProfile(value: unknown): PortableProfile {
  const fail = () => { throw new Error("This file is not a valid portable savingsOS profile. No data was changed."); };
  if (!value || typeof value !== "object") return fail();
  const input = value as Partial<PortableProfile>;
  const record = input.profile;
  const user = record?.user;
  if (input.format !== "savingsos-portable-profile" || input.version !== 1 ||
      typeof input.exportedAt !== "string" || !Number.isFinite(Date.parse(input.exportedAt)) ||
      !user || typeof user.id !== "string" || !user.id.length || user.id.length > 128 ||
      typeof user.name !== "string" || !user.name.trim() || user.name.trim().length > 50 ||
      (user.role !== undefined && user.role !== "user") || typeof user.hasPassword !== "boolean" ||
      typeof user.createdAt !== "string" || !Number.isFinite(Date.parse(user.createdAt)) ||
      !Number.isSafeInteger(record.revision) || record.revision < 1 || !record.payload) return fail();
  const payload = record.payload;
  if (user.hasPassword) {
    if (payload.kind !== "encrypted" || payload.iterations !== 600000) return fail();
    try {
      if (typeof payload.salt !== "string" || atob(payload.salt).length !== 16 ||
          typeof payload.iv !== "string" || atob(payload.iv).length !== 12 ||
          typeof payload.ciphertext !== "string" || payload.ciphertext.length > 14000000 ||
          atob(payload.ciphertext).length < 16) return fail();
    } catch { return fail(); }
  } else if (payload.kind !== "plain" || !isValidBackup(payload.data)) return fail();
  return {
    format: "savingsos-portable-profile", version: 1, exportedAt: input.exportedAt,
    profile: {
      origin: "created", revision: record.revision,
      user: { id: user.id, name: user.name.trim(), role: "user", hasPassword: user.hasPassword, createdAt: user.createdAt },
      payload: payload.kind === "plain" ? { kind: "plain", data: structuredClone(payload.data) } : {
        kind: "encrypted", salt: payload.salt, iterations: payload.iterations, iv: payload.iv, ciphertext: payload.ciphertext,
      },
    },
  };
}
