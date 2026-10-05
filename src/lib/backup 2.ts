// SoundMap Backup — export & import all app data as a single JSON file.
// Data lives in Zustand-persisted localStorage keys plus a couple of loose
// keys. Import is destructive: it replaces the current state, so we prompt
// for confirmation upstream.
import { toast } from "sonner";

/** Version bump only when the payload shape breaks backwards compat. */
export const BACKUP_VERSION = 1;

/** Every localStorage key SoundMap owns. Add new ones here as we grow. */
export const BACKUP_KEYS = [
  "soundmap-store",        // main app state (scenes, gear, room, acoustics)
  "soundmap-settings",     // units, feedback, venue preset
  "soundmap-community-demo", // community upvotes + user-submitted rows
] as const;

export interface BackupPayload {
  _kind: "soundmap.backup";
  _version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Read all keys from localStorage and return a plain JS payload. */
export function buildBackup(): BackupPayload {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    let raw: string | null = null;
    try { raw = window.localStorage.getItem(key); } catch { continue; }
    if (raw !== null) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  }
  return {
    _kind: "soundmap.backup",
    _version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Download the backup as a .json file. */
export function downloadBackup(): void {
  const payload = buildBackup();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `soundmap-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Basic shape check before applying. */
export function isValidBackup(input: unknown): input is BackupPayload {
  if (!input || typeof input !== "object") return false;
  const o = input as Record<string, unknown>;
  if (o._kind !== "soundmap.backup") return false;
  if (typeof o._version !== "number") return false;
  // Un backup de una versión FUTURA puede tener una forma que esta build no
  // entiende: importarlo igual corrompería el store en silencio.
  if (o._version > BACKUP_VERSION) return false;
  return !!o.data && typeof o.data === "object";
}

/**
 * Sobrescribe las claves de localStorage desde un backup. Devuelve cuántas se
 * aplicaron.
 *
 * Sólo escribe claves que estén en `BACKUP_KEYS`. Antes escribía CUALQUIER
 * clave presente en el archivo, así que un JSON editado a mano podía pisar
 * `theme`, `locale` o cualquier otra cosa del origen.
 */
export function applyBackup(payload: BackupPayload): number {
  let applied = 0;
  const allowed = new Set<string>(BACKUP_KEYS);
  for (const key of Object.keys(payload.data)) {
    if (!allowed.has(key)) {
      console.warn("applyBackup: clave ignorada (fuera del backup de SoundMap):", key);
      continue;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(payload.data[key]));
      applied++;
    } catch (err) {
      console.error("applyBackup: failed to set", key, err);
    }
  }
  return applied;
}

/** Read a File selected by the user and parse it as a BackupPayload. */
export function readBackupFile(file: File): Promise<BackupPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Support single-scene JSON export from ShareSceneModal too.
        if (parsed?._kind === "soundmap.scene" && parsed.scene) {
          // Merge into existing scenes: read current store, push scene.
          const raw = window.localStorage.getItem("soundmap-store");
          const store = raw ? JSON.parse(raw) : { state: { scenes: [] }, version: 0 };
          store.state = store.state ?? {};
          store.state.scenes = store.state.scenes ?? [];
          const exists = store.state.scenes.some((s: { id?: string; clientId?: string }) =>
            (s.clientId ?? s.id) === (parsed.scene.clientId ?? parsed.scene.id));
          if (!exists) store.state.scenes.push(parsed.scene);
          return resolve({
            _kind: "soundmap.backup",
            _version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(),
            data: { "soundmap-store": store },
          });
        }
        if (parsed?._kind === "soundmap.backup" && typeof parsed._version === "number" && parsed._version > BACKUP_VERSION) {
          return reject(new Error(`Este backup es de una versión más nueva de SoundMap (v${parsed._version}). Actualizá la app para importarlo.`));
        }
        if (!isValidBackup(parsed)) return reject(new Error("Archivo inválido"));
        resolve(parsed);
      } catch { reject(new Error("JSON inválido")); }
    };
    reader.readAsText(file);
  });
}

/** UI wrapper — download with toast. */
export function exportBackupWithToast(): void {
  try {
    downloadBackup();
    toast.success("Backup descargado");
  } catch (err) {
    console.error(err);
    toast.error("No se pudo exportar el backup");
  }
}

/** UI wrapper — import from File with toast + reload afterwards. */
export async function importBackupWithToast(file: File): Promise<void> {
  try {
    const payload = await readBackupFile(file);
    const applied = applyBackup(payload);
    toast.success(`Backup importado (${applied} ${applied === 1 ? "sección" : "secciones"})`);
    // Small delay so the toast is visible before the reload.
    setTimeout(() => window.location.reload(), 800);
  } catch (err) {
    console.error(err);
    toast.error((err as Error).message || "No se pudo importar el backup");
  }
}
