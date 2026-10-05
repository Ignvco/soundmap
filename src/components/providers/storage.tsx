import { persistenceStatus, undoLastImport } from "@/lib/persistence";
import { useAppStore } from "@/store/app";
import { useSettingsStore } from "@/store/settings";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
export function StorageProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false),
    error = useSyncExternalStore(
      persistenceStatus.subscribe,
      persistenceStatus.getSnapshot,
    );
  useEffect(() => {
    let alive = true;
    Promise.all([
      useAppStore.persist.rehydrate(),
      useSettingsStore.persist.rehydrate(),
    ]).finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!ready)
    return (
      <div role="status" className="p-8">
        Recuperando el expediente local…
      </div>
    );
  return (
    <>
      {error && (
        <div role="alert" className="p-4 bg-destructive/15 text-sm">
          {error}
          <button
            className="audit-button ml-3"
            onClick={() =>
              import("@/lib/backup").then((m) => m.exportBackupWithToast())
            }
          >
            Exportar recuperación
          </button>
          <button
            className="audit-button ml-3"
            onClick={() =>
              undoLastImport()
                .then(() => location.reload())
                .catch((e) => window.alert(e.message))
            }
          >
            Restaurar antes de importar
          </button>
        </div>
      )}
      {children}
    </>
  );
}
