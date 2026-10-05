// SoundMap Sync Provider — DEPRECATED. All-local now.
// Kept as an interface-compatible no-op so existing pages that call
// `useSyncContext()` keep working without needing edits.
import type { Scene } from "@/store/app.ts";
import { createContext, useContext, type ReactNode } from "react";

interface SyncContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  status: "offline" | "syncing" | "synced" | "error";
  lastSyncedAt: number | null;
  cloudCount: number;
  pushOne: (scene: Scene) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
  renameOne: (id: string, name: string) => Promise<void>;
}

const NOOP: SyncContextValue = {
  isAuthenticated: false,
  isLoading: false,
  status: "offline",
  lastSyncedAt: null,
  cloudCount: 0,
  pushOne: async () => {
    throw new Error("Publica revisiones desde Colaboración");
  },
  deleteOne: async () => {
    throw new Error("Las revisiones remotas son inmutables");
  },
  renameOne: async () => {
    throw new Error("Crea una nueva revisión con el nombre actualizado");
  },
};

const SyncContext = createContext<SyncContextValue>(NOOP);

export function SyncProvider({ children }: { children: ReactNode }) {
  return <SyncContext.Provider value={NOOP}>{children}</SyncContext.Provider>;
}

export function useSyncContext(): SyncContextValue {
  return useContext(SyncContext);
}
