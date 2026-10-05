import type { StateStorage } from "zustand/middleware";
import { validatePersistedKey } from "./audit/validation";
export const DATA_KEYS = [
  "soundmap-store",
  "soundmap-settings",
  "soundmap-community-demo",
  "soundmap-calibration",
] as const;
let problem: string | null = null;
const listeners = new Set<() => void>();
export const persistenceStatus = {
  getSnapshot: () => problem,
  subscribe: (f: () => void) => {
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  },
};
function failed(e: unknown) {
  problem = `No se pudo guardar en el dispositivo: ${(e as Error).message}. Exporta el borrador antes de cerrar.`;
  listeners.forEach((f) => f());
}
const testMemory = new Map<string, string>();
let connection: Promise<IDBDatabase> | undefined;
function open() {
  return (connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("soundmap", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("data");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      connection = undefined;
      reject(request.error);
    };
    request.onblocked = () =>
      reject(new Error("Cierra las otras pestañas de SoundMap y reintenta."));
  }));
}
async function read(key: string): Promise<string | null> {
  if (typeof window === "undefined") return testMemory.get(key) ?? null;
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = db.transaction("data").objectStore("data").get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}
let queue = Promise.resolve();
async function transaction(
  values: Record<string, string | null>,
  backup = false,
) {
  if (typeof window === "undefined") {
    if (backup)
      testMemory.set(
        "soundmap-previous-backup",
        JSON.stringify(
          Object.fromEntries(
            DATA_KEYS.map((k) => [k, testMemory.get(k) ?? null]),
          ),
        ),
      );
    for (const [k, v] of Object.entries(values)) {
      if (v === null) testMemory.delete(k);
      else testMemory.set(k, v);
    }
    return;
  }
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("data", "readwrite"),
      store = tx.objectStore("data");
    const write = () => {
      for (const [k, v] of Object.entries(values)) {
        if (v === null) store.delete(k);
        else store.put(v, k);
      }
    };
    if (backup) {
      const before: Record<string, string | null> = {};
      let remaining = DATA_KEYS.length;
      for (const key of DATA_KEYS) {
        const req = store.get(key);
        req.onsuccess = () => {
          before[key] = req.result ?? null;
          if (--remaining === 0) {
            store.put(JSON.stringify(before), "soundmap-previous-backup");
            write();
          }
        };
      }
    } else write();
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error("Transacción cancelada"));
    tx.onerror = () => reject(tx.error);
  });
}
export async function flushPersistence() {
  await queue;
  if (problem) throw new Error(problem);
}
export async function atomicWrite(
  values: Record<string, string | null>,
  backup = false,
) {
  const next = queue.then(() => transaction(values, backup));
  queue = next.catch(failed);
  await next;
}
export const localDatabase: StateStorage = {
  async getItem(key) {
    try {
      await queue;
      const saved = await read(key);
      if (saved !== null) {
        return JSON.stringify(validatePersistedKey(key, JSON.parse(saved)));
      }
      const legacy = globalThis.localStorage?.getItem(key) ?? null;
      if (legacy !== null) {
        const migrated = JSON.stringify(
          validatePersistedKey(key, JSON.parse(legacy)),
        );
        await atomicWrite({ [key]: migrated });
        return migrated;
      }
      return legacy;
    } catch (e) {
      failed(e);
      throw e;
    }
  },
  async setItem(key, value) {
    try {
      await atomicWrite({ [key]: value });
    } catch {
      /* Failure remains visible; keep the working draft in memory. */
    }
  },
  async removeItem(key) {
    await atomicWrite({ [key]: null });
  },
};
export async function readAll() {
  await queue;
  const entries = await Promise.all(
    DATA_KEYS.map(async (k) => [k, await localDatabase.getItem(k)] as const),
  );
  return Object.fromEntries(entries);
}
export async function restoreAtomically(values: Record<string, string>) {
  await Promise.allSettled(DATA_KEYS.map((k) => localDatabase.getItem(k))); // A corrupt current key must not block a valid recovery import.
  await atomicWrite(values, true);
}
export async function undoLastImport() {
  const raw = await read("soundmap-previous-backup");
  if (!raw) throw new Error("No hay una importación anterior para restaurar.");
  await atomicWrite({ ...JSON.parse(raw), "soundmap-previous-backup": null });
}
