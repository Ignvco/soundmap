import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Archive,
  ArrowLeftRight,
  ArrowUpRight,
  Box,
  Search,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { PremiumShell } from "@/components/soundmap/premium";
import {
  LibraryNav,
  ReplaceDraftActions,
} from "@/components/soundmap/library-controls";
import { VenuePreview } from "@/components/soundmap/venue-preview";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore, type Scene } from "@/store/app";

const keyOf = (s: Scene) => s.clientId ?? s.id;
const unitCount = (s: Scene) =>
  [s.tops, s.subs, s.monitors, s.amps, s.dspUnits, s.mixers, s.mics]
    .flat()
    .reduce((n, g) => n + (g.quantity ?? 1), 0);
const dateLabel = (s: Scene) => {
  const date = new Date(s.updatedAt ?? s.createdAt);
  return Number.isFinite(date.getTime())
    ? format(date, "d MMM yyyy · HH:mm", { locale: es })
    : "Fecha no disponible";
};

export default function Scenes() {
  const scenes = useAppStore((s) => s.scenes);
  const activeId = useAppStore((s) => s.activeSceneId);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState("recent");
  const [target, setTarget] = useState<{
    id: string;
    action: "load" | "delete" | "preview";
  } | null>(null);
  const selected = scenes.find((s) => keyOf(s) === target?.id);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("es");
    return scenes
      .filter((s) =>
        `${s.name} ${s.room.name}`.toLocaleLowerCase("es").includes(term),
      )
      .sort((a, b) =>
        order === "name"
          ? a.name.localeCompare(b.name, "es")
          : (b.updatedAt ?? Date.parse(b.createdAt)) -
            (a.updatedAt ?? Date.parse(a.createdAt)),
      );
  }, [scenes, query, order]);
  const load = () => {
    if (!selected) return;
    useAppStore.getState().loadScene(keyOf(selected));
    toast.success(`Cargado: ${selected.name}`);
    setTarget(null);
    navigate("/stage-map");
  };
  return (
    <PremiumShell
      eyebrow="BIBLIOTECA"
      title="Tus escenas"
      subtitle="Recupera el recinto, los equipos, el plano y el expediente de cada revisión."
      wrapperClassName="max-w-6xl"
      data-testid="glow-scenes"
      right={
        <Link className="audit-button workspace-primary" to="/design?step=save">
          Guardar escena <ArrowUpRight size={16} />
        </Link>
      }
    >
      <LibraryNav />
      <div className="library-summary">
        <span>
          <strong>{scenes.length}</strong> revisiones locales
        </span>
        <Link to="/settings">
          Ver respaldos <ArrowUpRight size={14} />
        </Link>
      </div>
      {scenes.length > 0 ? (
        <>
          <div className="library-toolbar">
            <label className="library-search">
              <Search size={17} />
              <input
                aria-label="Buscar escenas"
                placeholder="Buscar escena o recinto…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="library-sort">
              Ordenar
              <select
                aria-label="Ordenar escenas"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
              >
                <option value="recent">Más recientes</option>
                <option value="name">Nombre A–Z</option>
              </select>
            </label>
            {scenes.length >= 2 && (
              <Link
                className="audit-button"
                to="/compare"
                data-testid="scenes-compare-btn"
              >
                <ArrowLeftRight size={16} />
                Comparar
              </Link>
            )}
          </div>
          <p className="library-result-count" role="status">
            {visible.length} de {scenes.length} escenas
          </p>
          <div className="library-scenes" data-testid="scenes-grid">
            {visible.map((scene) => {
              const id = keyOf(scene);
              const active = activeId === id || activeId === scene.id;
              return (
                <article
                  className="workspace-card library-scene"
                  key={id}
                  data-testid={`scene-card-${id}`}
                >
                  <div className="library-scene-heading">
                    <span className="library-icon">
                      <Archive size={20} />
                    </span>
                    <div>
                      <p className="project-eyebrow">
                        {scene.revision
                          ? `REVISIÓN ${scene.revision}`
                          : "ESCENA GUARDADA"}{" "}
                        · LOCAL
                      </p>
                      <h2 data-testid={`scene-name-${id}`}>{scene.name}</h2>
                      <p>{scene.room.name}</p>
                    </div>
                    {active && <span className="library-active">Abierta</span>}
                  </div>
                  <dl className="library-metrics">
                    <div>
                      <dt>Recinto</dt>
                      <dd>
                        {scene.room.length} × {scene.room.width}
                        <small> m</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Inventario</dt>
                      <dd>
                        {unitCount(scene)}
                        <small> uds.</small>
                      </dd>
                    </div>
                    <div>
                      <dt>RT60 estimado</dt>
                      <dd>
                        {scene.acoustics.rt60Audience}
                        <small> s</small>
                      </dd>
                    </div>
                  </dl>
                  <p className="library-date">{dateLabel(scene)}</p>
                  <div className="library-scene-actions">
                    <button
                      className="audit-button workspace-primary"
                      onClick={() => setTarget({ id, action: "load" })}
                      data-testid={`scene-load-btn-${id}`}
                    >
                      Abrir escena <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="audit-button"
                      onClick={() => setTarget({ id, action: "preview" })}
                      aria-label={`Ver ${scene.name} en 3D`}
                    >
                      <Box size={16} />
                      <span>Vista 3D</span>
                    </button>
                    <button
                      className="audit-button library-delete"
                      aria-label={`Eliminar ${scene.name}`}
                      data-testid={`scene-delete-btn-${id}`}
                      onClick={() => setTarget({ id, action: "delete" })}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {visible.length === 0 && (
            <div className="library-empty">
              <Search size={28} />
              <h2>No encontramos esa escena</h2>
              <p>Prueba con otro nombre de escena o recinto.</p>
              <button className="audit-button" onClick={() => setQuery("")}>
                Limpiar búsqueda
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="library-empty" data-testid="scenes-empty">
          <Archive size={32} />
          <h2>Tu próximo montaje empieza aquí</h2>
          <p>
            Guarda una revisión del proyecto para volver a su plano, equipos y
            ajustes. También puedes comenzar con una plantilla.
          </p>
          <div className="library-dialog-actions">
            <Link
              className="audit-button workspace-primary"
              to="/design?step=save"
            >
              Guardar proyecto actual
            </Link>
            <Link className="audit-button" to="/templates">
              Explorar plantillas
            </Link>
          </div>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <DialogContent
          className={`library-dialog ${target?.action === "preview" ? "library-preview-dialog" : ""}`}
        >
          <DialogTitle>
            {target?.action === "delete"
              ? "Eliminar escena local"
              : target?.action === "preview"
                ? "Vista previa 3D"
                : "Abrir escena"}
          </DialogTitle>
          <DialogDescription>{selected?.name}</DialogDescription>
          {selected && target?.action === "preview" && (
            <>
              <VenuePreview
                layout={selected.stageLayout}
                room={selected.room}
                tops={selected.tops}
                subs={selected.subs}
                monitors={selected.monitors}
              />
              <button
                className="audit-button workspace-primary"
                onClick={() =>
                  setTarget({ id: keyOf(selected), action: "load" })
                }
              >
                Abrir esta escena
              </button>
            </>
          )}
          {selected && target?.action === "load" && (
            <>
              <p className="workspace-note">
                Esta revisión reemplazará el proyecto activo, incluido su plano
                y expediente. Las demás escenas guardadas se conservan.
              </p>
              <ReplaceDraftActions
                onConfirm={load}
                onCancel={() => setTarget(null)}
                actionLabel="Abrir escena"
              />
            </>
          )}
          {selected && target?.action === "delete" && (
            <>
              <p className="workspace-note">
                Se eliminará esta revisión de la biblioteca local. El proyecto
                que tienes abierto no se borra. Esta acción no elimina
                revisiones publicadas en Colaboración.
              </p>
              <div className="library-dialog-actions">
                <button
                  className="audit-button"
                  data-testid={`scene-delete-cancel-${keyOf(selected)}`}
                  onClick={() => setTarget(null)}
                >
                  Cancelar
                </button>
                <button
                  className="audit-button library-danger"
                  data-testid={`scene-delete-confirm-${keyOf(selected)}`}
                  onClick={() => {
                    useAppStore.getState().deleteScene(keyOf(selected));
                    setTarget(null);
                    toast.success("Escena local eliminada");
                  }}
                >
                  Eliminar escena
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PremiumShell>
  );
}
