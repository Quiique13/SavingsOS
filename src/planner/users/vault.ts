import { isValidBackup, type Data } from "../model";
export const USERS_KEY = "savings-os-users-v1";
const ITERATIONS = 600000;
export type User = {
    id: string;
    name: string;
    hasPassword: boolean;
    createdAt: string;
};
type PlainPayload = {
    kind: "plain";
    data: Data;
};
type EncryptedPayload = {
    kind: "encrypted";
    salt: string;
    iterations: number;
    iv: string;
    ciphertext: string;
};
type Record = {
    user: User;
    revision: number;
    payload: PlainPayload | EncryptedPayload;
};
type Registry = {
    version: 1;
    records: Record[];
};
export type UserSession = {
    user: User;
    revision: number;
    data: Data;
    key: CryptoKey | null;
};
type LocalStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
function encode(bytes: Uint8Array): string {
    let binary = "";
    for (const byte of bytes)
        binary += String.fromCharCode(byte);
    return btoa(binary);
}
function decode(value: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
async function derive(password: string, salt: string): Promise<CryptoKey> {
    if (!globalThis.crypto?.subtle)
        throw new Error("Password protection needs HTTPS or localhost in a supported browser.");
    const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt: decode(salt), iterations: ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
const binding = (id: string) => new TextEncoder().encode("SavingsOS:user:v1:" + id);
async function encrypt(id: string, data: Data, key: CryptoKey, salt: string): Promise<EncryptedPayload> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: binding(id) }, key, new TextEncoder().encode(JSON.stringify(data)));
    return { kind: "encrypted", salt, iterations: ITERATIONS, iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}
function cleanName(name: string) {
    const value = name.trim();
    if (!value || value.length > 50)
        throw new Error("Use a name between 1 and 50 characters.");
    return value;
}
function checkPassword(password: string) {
    if (password.length < 8 || password.length > 128)
        throw new Error("Use a password with 8 to 128 characters.");
}
export class UserVault {
    private storage: LocalStorage;
    constructor(storage: LocalStorage) { this.storage = storage; }
    private read(): Registry {
        const raw = this.storage.getItem(USERS_KEY);
        if (!raw)
            return { version: 1, records: [] };
        let registry: Registry;
        try {
            registry = JSON.parse(raw);
        }
        catch {
            throw new Error("User storage could not be read. Your saved records have not been replaced.");
        }
        if (!registry || typeof registry !== "object" || registry.version !== 1 || !Array.isArray(registry.records) || !registry.records.every(r => r?.user && typeof r.user.id === "string" && typeof r.user.name === "string" &&
            typeof r.user.hasPassword === "boolean" && Number.isInteger(r.revision) && r.revision > 0 &&
            r.payload && (r.user.hasPassword ? r.payload.kind === "encrypted" && typeof r.payload.salt === "string" && r.payload.iterations === ITERATIONS && typeof r.payload.iv === "string" && typeof r.payload.ciphertext === "string" : r.payload.kind === "plain")) || new Set(registry.records.map(r => r.user.id)).size !== registry.records.length)
            throw new Error("User storage is damaged or unsupported. Your saved records have not been replaced.");
        return registry;
    }
    list(): User[] { return this.read().records.map(r => ({ ...r.user })); }
    private commit(record: Record, expectedRevision: number | null) {
        const registry = this.read();
        const existing = registry.records.find(r => r.user.id === record.user.id);
        if (expectedRevision === null ? !!existing : !existing || existing.revision !== expectedRevision)
            throw new Error("This user's records changed in another tab. Export any unsaved changes, then reload the app.");
        if (registry.records.some(r => r.user.id !== record.user.id && r.user.name.toLocaleLowerCase() === record.user.name.toLocaleLowerCase()))
            throw new Error("A user with that name already exists. Choose another name.");
        this.storage.setItem(USERS_KEY, JSON.stringify({ version: 1, records: existing ? registry.records.map(r => r.user.id === record.user.id ? record : r) : [...registry.records, record] }));
    }
    async create(name: string, data: Data, password = ""): Promise<UserSession> {
        name = cleanName(name);
        if (password)
            checkPassword(password);
        if (!isValidBackup(data))
            throw new Error("The starting finance data is invalid.");
        if (this.list().some(u => u.name.toLocaleLowerCase() === name.toLocaleLowerCase()))
            throw new Error("A user with that name already exists. Choose another name.");
        const user: User = { id: crypto.randomUUID(), name, hasPassword: !!password, createdAt: new Date().toISOString() };
        const salt = password ? encode(crypto.getRandomValues(new Uint8Array(16))) : "";
        const key = password ? await derive(password, salt) : null;
        const payload = key ? await encrypt(user.id, data, key, salt) : { kind: "plain" as const, data };
        this.commit({ user, revision: 1, payload }, null);
        return { user, revision: 1, data, key };
    }
    async open(id: string, password = ""): Promise<UserSession> {
        const record = this.read().records.find(r => r.user.id === id);
        if (!record)
            throw new Error("This user could not be found. Reload the user list.");
        let key: CryptoKey | null = null;
        let data: Data;
        if (record.payload.kind === "encrypted") {
            if (!password)
                throw new Error("Enter this user's password.");
            try {
                key = await derive(password, record.payload.salt);
                const bytes = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(record.payload.iv), additionalData: binding(id) }, key, decode(record.payload.ciphertext));
                data = JSON.parse(new TextDecoder().decode(bytes));
            }
            catch {
                throw new Error("The password is incorrect or this user's saved data is damaged.");
            }
        }
        else
            data = record.payload.data;
        if (!isValidBackup(data))
            throw new Error("This user's finance data is invalid. It has not been changed.");
        return { user: { ...record.user }, revision: record.revision, data, key };
    }
    async save(session: UserSession, data: Data): Promise<UserSession> {
        if (!isValidBackup(data))
            throw new Error("Changes contain invalid finance data and could not be saved. Export a backup before closing.");
        const record = this.read().records.find(r => r.user.id === session.user.id);
        if (!record || record.revision !== session.revision)
            throw new Error("This user's records changed in another tab. Export any unsaved changes, then reload the app.");
        const payload = record.payload.kind === "encrypted"
            ? session.key ? await encrypt(session.user.id, data, session.key, record.payload.salt) : null
            : { kind: "plain" as const, data };
        if (!payload)
            throw new Error("Unlock this user before saving.");
        const next = { user: record.user, revision: record.revision + 1, payload };
        this.commit(next, session.revision);
        return { ...session, user: { ...record.user }, revision: next.revision, data };
    }
    async configure(session: UserSession, name: string, newPassword: string | null, currentPassword = ""): Promise<UserSession> {
        name = cleanName(name);
        if (newPassword)
            checkPassword(newPassword);
        // null retains the existing password; an empty string explicitly removes it.
        if (newPassword !== null && session.user.hasPassword)
            await this.open(session.user.id, currentPassword);
        const record = this.read().records.find(r => r.user.id === session.user.id);
        if (!record || record.revision !== session.revision)
            throw new Error("This user's records changed in another tab. Reload before changing user settings.");
        let key = session.key;
        let payload = record.payload;
        if (newPassword !== null) {
            if (newPassword) {
                const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
                key = await derive(newPassword, salt);
                payload = await encrypt(session.user.id, session.data, key, salt);
            }
            else {
                key = null;
                payload = { kind: "plain", data: session.data };
            }
        }
        const user = { ...record.user, name, hasPassword: payload.kind === "encrypted" };
        this.commit({ user, revision: record.revision + 1, payload }, session.revision);
        return { ...session, user, revision: record.revision + 1, key };
    }
}
