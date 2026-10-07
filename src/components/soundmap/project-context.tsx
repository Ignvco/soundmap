import { Link, useLocation } from "react-router-dom";
import {
  FolderOpen,
  Map,
  SlidersHorizontal,
  ArrowUpRight,
  Save,
} from "lucide-react";
import { useAppStore, hasUnsavedRevision } from "@/store/app";

/** Shared project orientation; status describes persistence, not acoustic approval. */
export function ProjectContext() {
  const room = useAppStore((s) => s.room);
  const dirty = useAppStore(hasUnsavedRevision);
  const saveRevision = useAppStore((s) => s.saveRevision);
  const lastStep = useAppStore((s) => s.lastWizardStep);
  const { pathname, search } = useLocation();
  const dspActive =
    pathname === "/dsp" ||
    (pathname === "/design" &&
      (new URLSearchParams(search).get("step") ?? lastStep) === "dsp");
  const views = [
    { to: "/", label: "Resumen", Icon: FolderOpen, active: pathname === "/" },
    {
      to: "/stage-map",
      label: "Plano",
      Icon: Map,
      active: pathname === "/stage-map",
    },
    {
      to: "/design?step=dsp",
      label: "DSP",
      Icon: SlidersHorizontal,
      active: dspActive,
    },
    {
      to: "/audit",
      label: "Expediente",
      Icon: ArrowUpRight,
      active: pathname === "/audit",
    },
  ];
  return (
    <div className="project-context" data-testid="project-context">
      <div className="project-context__identity">
        <span className="project-context__icon">
          <FolderOpen size={18} />
        </span>
        <div>
          <span className="project-eyebrow">PROYECTO ACTIVO</span>
          <p>{room?.name || "Tu próximo recinto"}</p>
        </div>
      </div>
      {room && (
        <div className="project-context__save">
          <span
            className="project-state"
            data-dirty={dirty}
            data-testid="project-state"
          >
            {dirty ? "Borrador" : "Guardado"}
          </span>
          <button
            type="button"
            onClick={() => saveRevision()}
            disabled={!dirty}
            className="project-save"
            data-testid="project-save"
            aria-label="Guardar revisión"
          >
            <Save size={15} />
            <span>Guardar</span>
          </button>
        </div>
      )}
      <nav aria-label="Vistas del proyecto" className="project-nav">
        {views.map(({ to, label, Icon, active }) => (
          <Link
            key={to}
            to={to}
            className={active ? "active" : undefined}
            aria-current={active ? "page" : undefined}
            data-testid={`project-view-${label.toLowerCase()}`}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
