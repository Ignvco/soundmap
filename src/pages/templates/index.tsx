import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Church,
  Music,
  Presentation,
  Tent,
  Drama,
  ArrowUpRight,
  Search,
} from "lucide-react";
import { PremiumShell } from "@/components/soundmap/premium";
import {
  LibraryNav,
  ReplaceDraftActions,
} from "@/components/soundmap/library-controls";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAppStore } from "@/store/app";
import { TEMPLATES, type Template } from "@/lib/audio/templates";
import { calculateAcoustics } from "@/lib/audio/acoustics";
import { toast } from "sonner";

const CATEGORIES = {
  church: { label: "Iglesia", Icon: Church },
  club: { label: "Club", Icon: Music },
  corporate: { label: "Corporativo", Icon: Presentation },
  festival: { label: "Festival", Icon: Tent },
  theater: { label: "Teatro", Icon: Drama },
} as const;
const GROUPS = [
  { key: "tops", label: "Tops" },
  { key: "subs", label: "Subs" },
  { key: "monitors", label: "Monitores" },
  { key: "amps", label: "Amplificadores" },
  { key: "dspUnits", label: "Procesadores" },
  { key: "mixers", label: "Consolas" },
  { key: "mics", label: "Micrófonos" },
] as const;
const count = (tpl: Template) =>
  GROUPS.reduce(
    (n, { key }) => n + tpl[key].reduce((s, g) => s + (g.quantity ?? 1), 0),
    0,
  );

export default function Templates() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState<Template | null>(null);
  const visible = useMemo(
    () =>
      TEMPLATES.filter(
        (tpl) =>
          (category === "all" || tpl.category === category) &&
          `${tpl.name} ${tpl.description} ${tpl.serviceType}`
            .toLocaleLowerCase("es")
            .includes(query.trim().toLocaleLowerCase("es")),
      ),
    [category, query],
  );
  const apply = () => {
    if (!selected) return;
    useAppStore.getState().applyTemplate(selected);
    toast.success(`Plantilla aplicada: ${selected.name}`);
    setSelected(null);
    navigate("/design?step=room");
  };
  return (
    <PremiumShell
      eyebrow="BIBLIOTECA"
      title="Un punto de partida"
      subtitle="Elige un tipo de montaje, revisa su inventario y ajústalo a tu recinto."
      wrapperClassName="max-w-6xl"
      data-testid="glow-templates"
    >
      <LibraryNav />
      <div className="library-summary">
        <span>
          <strong>{TEMPLATES.length}</strong> plantillas editables
        </span>
        <p>
          Configuraciones de ejemplo. Confirma medidas y fichas técnicas antes
          de diseñar el montaje real.
        </p>
      </div>
      <div className="library-toolbar">
        <label className="library-search">
          <Search size={17} />
          <input
            aria-label="Buscar plantillas"
            placeholder="Buscar por uso o recinto…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="library-sort">
          Tipo de montaje
          <select
            aria-label="Tipo de montaje"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(CATEGORIES).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="library-result-count" role="status">
        {visible.length} de {TEMPLATES.length} plantillas
      </p>
      <div className="library-templates">
        {visible.map((tpl) => {
          const { Icon, label } = CATEGORIES[tpl.category];
          return (
            <article className="workspace-card library-template" key={tpl.id}>
              <div className="library-template-heading">
                <span className="library-icon">
                  <Icon size={23} />
                </span>
                <span className="project-eyebrow">{label}</span>
              </div>
              <h2 data-testid={`tpl-name-${tpl.id}`}>{tpl.name}</h2>
              <p>{tpl.description}</p>
              <dl className="library-metrics">
                <div>
                  <dt>Capacidad</dt>
                  <dd>
                    {tpl.room.capacity}
                    <small> pers.</small>
                  </dd>
                </div>
                <div>
                  <dt>Inventario</dt>
                  <dd>
                    {count(tpl)}
                    <small> uds.</small>
                  </dd>
                </div>
              </dl>
              <p className="library-template-dimensions">
                {tpl.room.length} × {tpl.room.width} × {tpl.room.height} m{" "}
                <span>· largo, ancho y alto</span>
              </p>
              <button
                className="audit-button"
                data-testid={`tpl-apply-${tpl.id}`}
                onClick={() => setSelected(tpl)}
              >
                Revisar plantilla <ArrowUpRight size={16} />
              </button>
            </article>
          );
        })}
      </div>
      {visible.length === 0 && (
        <div className="library-empty">
          <Search size={28} />
          <h2>Sin plantillas con esos filtros</h2>
          <p>Cambia el tipo de montaje o la búsqueda.</p>
          <button
            className="audit-button"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Restablecer filtros
          </button>
        </div>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="library-dialog library-template-dialog">
          <DialogTitle>{selected?.name}</DialogTitle>
          <DialogDescription>
            Revisa el punto de partida antes de reemplazar el proyecto activo.
            Al aplicarlo se iniciará un expediente nuevo, sin el plano ni las
            mediciones actuales.
          </DialogDescription>
          {selected && (
            <>
              <dl className="library-metrics">
                <div>
                  <dt>Dimensiones</dt>
                  <dd>
                    {selected.room.length} × {selected.room.width} ×{" "}
                    {selected.room.height}
                    <small> m</small>
                  </dd>
                </div>
                <div>
                  <dt>RT60 estimado</dt>
                  <dd>
                    {calculateAcoustics(selected.room).rt60Audience}
                    <small> s</small>
                  </dd>
                </div>
              </dl>
              <section className="library-template-ideal">
                <h3>Uso previsto</h3>
                <ul>
                  {selected.ideal.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <details className="library-inventory">
                <summary>
                  Inventario incluido · {count(selected)} unidades
                </summary>
                <div>
                  {GROUPS.filter(({ key }) => selected[key].length).map(
                    ({ key, label }) => (
                      <section key={key}>
                        <h3>{label}</h3>
                        <ul>
                          {selected[key].map((g, index) => (
                            <li key={`${g.id}-${index}`}>
                              <span>
                                {g.brand} {g.model}
                              </span>
                              <strong>×{g.quantity ?? 1}</strong>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ),
                  )}
                </div>
              </details>
              <p className="workspace-note">
                Los valores son estimaciones y datos de ejemplo, no mediciones
                del recinto.
              </p>
              <ReplaceDraftActions
                onConfirm={apply}
                onCancel={() => setSelected(null)}
                actionLabel="Aplicar plantilla"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </PremiumShell>
  );
}
