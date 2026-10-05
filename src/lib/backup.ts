import { useAppStore } from "@/store/app";
import { toast } from "sonner";
import {
  MAX_BACKUP_BYTES,
  sceneSchema,
  validatePersistedKey,
  validateTree,
} from "./audit/validation";
import { DATA_KEYS, localDatabase, restoreAtomically } from "./persistence";
export const BACKUP_VERSION = 2;
export const BACKUP_KEYS = DATA_KEYS;
export interface BackupPayload {
  _kind: "soundmap.backup";
  _version: number;
  exportedAt: string;
  data: Record<string, unknown>;
  recoveryWarnings?: string[];
}
export async function buildBackup(): Promise<BackupPayload> {
  const values = await Promise.allSettled(
    DATA_KEYS.map((k) => localDatabase.getItem(k)),
  );
  const data: Record<string, unknown> = {},
    recoveryWarnings: string[] = [];
  values.forEach((result, i) => {
    if (result.status === "fulfilled" && result.value !== null)
      data[DATA_KEYS[i]] = JSON.parse(result.value);
    else if (result.status === "rejected")
      recoveryWarnings.push(
        `No se pudo recuperar ${DATA_KEYS[i]} del dispositivo; conserva también el backup anterior.`,
      );
  });
  // Include current memory state even when disk storage has failed.
  data["soundmap-store"] = {
    state: JSON.parse(JSON.stringify(useAppStore.getState())),
    version: 4,
  };
  return {
    _kind: "soundmap.backup",
    _version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data,
    recoveryWarnings,
  };
}
export function isValidBackup(input: unknown): input is BackupPayload {
  try {
    parseBackup(input);
    return true;
  } catch {
    return false;
  }
}
export function parseBackup(input: unknown): BackupPayload {
  validateTree(input);
  const p = input as BackupPayload;
  if (
    !p ||
    p._kind !== "soundmap.backup" ||
    !Number.isInteger(p._version) ||
    p._version < 1 ||
    p._version > BACKUP_VERSION ||
    !p.data ||
    Array.isArray(p.data) ||
    typeof p.data !== "object"
  )
    throw new Error("Backup inválido o de una versión más nueva.");
  return {
    ...p,
    data: Object.fromEntries(
      Object.entries(p.data).map(([k, v]) => [k, validatePersistedKey(k, v)]),
    ),
  };
}
export async function applyBackup(payload: BackupPayload): Promise<number> {
  const p = parseBackup(payload);
  await restoreAtomically(
    Object.fromEntries(
      Object.entries(p.data).map(([k, v]) => [k, JSON.stringify(v)]),
    ),
  );
  return Object.keys(p.data).length;
}
export async function readBackupFile(file: File): Promise<BackupPayload> {
  if (file.size > MAX_BACKUP_BYTES)
    throw new Error("El archivo supera 32 MiB.");
  const parsed: unknown = JSON.parse(await file.text());
  if (
    parsed &&
    typeof parsed === "object" &&
    "_kind" in parsed &&
    parsed._kind === "soundmap.scene" &&
    "scene" in parsed
  ) {
    validateTree(parsed);
    const scene = sceneSchema.parse(parsed.scene),
      backup = await buildBackup();
    const main = backup.data["soundmap-store"] as {
      state: { scenes: unknown[] };
    };
    if (!main.state.scenes.some((s) => (s as { id: string }).id === scene.id))
      main.state.scenes.push(scene);
    return parseBackup(backup);
  }
  return parseBackup(parsed);
}
export async function downloadBackup() {
  const payload = await buildBackup();
  if (payload.recoveryWarnings?.length)
    toast.warning(payload.recoveryWarnings.join(" "));
  const { downloadData } = await import("./audit/report");
  downloadData(
    JSON.stringify(payload),
    `soundmap-backup-${new Date().toISOString().slice(0, 10)}.json`,
  );
}
export async function exportBackupWithToast() {
  try {
    await downloadBackup();
    toast.success("Backup descargado");
  } catch (e) {
    toast.error((e as Error).message);
  }
}
export async function importBackupWithToast(file: File) {
  try {
    const backup = await readBackupFile(file);
    if (
      !window.confirm(
        `Archivo válido: ${Object.keys(backup.data).length} secciones. ¿Reemplazar estos datos locales? Puedes deshacer desde Ajustes → Restaurar anterior.`,
      )
    )
      return;
    const count = await applyBackup(backup);
    toast.success(`Backup importado: ${count} secciones`);
    window.location.reload();
  } catch (e) {
    toast.error((e as Error).message || "No se pudo importar");
  }
}
