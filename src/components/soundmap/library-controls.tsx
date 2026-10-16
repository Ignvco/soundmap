import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Archive, LayoutTemplate, Save } from "lucide-react";
import { hasUnsavedRevision, useAppStore } from "@/store/app";
import { flushPersistence } from "@/lib/persistence";
import { toast } from "sonner";

export function LibraryNav() {
  return (
    <nav className="library-nav" aria-label="Biblioteca del proyecto">
      <NavLink to="/scenes">
        <Archive size={16} />
        Escenas
      </NavLink>
      <NavLink to="/templates">
        <LayoutTemplate size={16} />
        Plantillas
      </NavLink>
    </nav>
  );
}

/** Explicit replacement, with an optional durable revision of the current draft. */
export function ReplaceDraftActions({
  onConfirm,
  onCancel,
  actionLabel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  actionLabel: string;
}) {
  const dirty = useAppStore(hasUnsavedRevision);
  const [busy, setBusy] = useState(false);
  const proceed = async (save: boolean) => {
    setBusy(true);
    try {
      if (save) {
        const before = useAppStore.getState().scenes.length;
        useAppStore.getState().saveRevision();
        if (useAppStore.getState().scenes.length <= before) {
          toast.error(
            "No se pudo guardar la revisión. El borrador sigue abierto.",
          );
          return;
        }
        await flushPersistence();
      }
      onConfirm();
    } catch {
      toast.error(
        "No se pudo completar el cambio. Comprueba el almacenamiento y vuelve a intentar.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="library-replace">
      {dirty && (
        <p role="status" className="library-warning">
          Hay cambios sin guardar en el proyecto activo. Puedes conservarlos
          como una revisión antes de continuar.
        </p>
      )}
      <div className="library-dialog-actions">
        {dirty && (
          <button
            className="audit-button workspace-primary"
            disabled={busy}
            onClick={() => void proceed(true)}
            data-testid="library-save-continue"
          >
            <Save size={16} />
            Guardar y continuar
          </button>
        )}
        <button
          className={`audit-button ${dirty ? "" : "workspace-primary"}`}
          disabled={busy}
          onClick={() => void proceed(false)}
          data-testid="library-confirm-replace"
        >
          {dirty ? `${actionLabel} sin guardar` : actionLabel}
        </button>
        <button className="audit-button" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
