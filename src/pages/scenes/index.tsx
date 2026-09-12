import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
// Scenes v5 — Premium archive of saved system configurations.
// Notion-style list with typography-first cards, quiet sync badges and
// progressive disclosure on delete confirms.
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { PremiumShell } from "@/components/soundmap/premium.tsx";
import { SyncIndicator } from "@/components/soundmap/sync-indicator.tsx";
import { useSyncContext } from "@/components/providers/sync.tsx";
import { feedback } from "@/lib/feedback.ts";
import {
  Archive, Trash2, Box,
  ChevronRight, AlertTriangle, Cloud, CloudUpload, HardDrive,
  ArrowLeftRight, Share2,
} from "lucide-react";
import { ShareSceneModal } from "@/components/soundmap/share-scene-modal.tsx";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import type { Scene } from "@/store/app.ts";

const HUE_DANGER = "var(--sm-warm)";

const RISK_META: Record<string, { label: string; hue: string }> = {
  low:    { label: "Bajo",   hue: "var(--sm-accent)" },
  medium: { label: "Medio",  hue: "var(--sm-amber)" },
  high:   { label: "Alto",   hue: "var(--sm-warm)" },
};

// ── Scene card — quiet Notion-style row ─────────────────────────────────────
function SceneCard({
  scene, isSynced, canSync, onLoad, onDelete, onPush, onShare, onPreview,
}: {
  scene: Scene; isSynced: boolean; canSync: boolean;
  onPreview: () => void; onLoad: () => void; onDelete: () => void; onPush: () => void; onShare: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const totalGear = scene.tops.length + scene.subs.length + scene.monitors.length + scene.amps.length;
  const risk = RISK_META[scene.acoustics.echoRisk] ?? RISK_META.low;
  const id = scene.clientId ?? scene.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden"
      style={{
        borderRadius: "var(--radius-card)",
        background: "transparent",
        transition: "background var(--dur) var(--ease)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      data-testid={`scene-card-${id}`}
    >
      {/* Fila única. El rediseño pide biblioteca profesional, no grilla de
          tarjetas: antes cada escena era una card con encabezado, cuatro stats
          en grilla, timestamp y botonera — cinco bloques para un ítem de lista.
          Ahora todo entra en una fila escaneable y las acciones aparecen al
          pasar el mouse. */}
      <div className="flex flex-wrap items-center gap-3 px-3 md:px-4 py-3.5 border-b border-border">
        <button className="v6-button" onClick={onPreview} aria-label={`Ver ${scene.name} en 3D`}><Box size={15} /></button>
        <button
          onClick={() => { feedback("success"); onLoad(); }}
          data-testid={`scene-load-btn-${id}`}
          className="flex items-center gap-4 min-w-0 flex-1 cursor-pointer text-left"
        >
          <span
            className="h-9 w-9 flex items-center justify-center shrink-0"
            style={{
              borderRadius: "var(--radius-chip)",
              background: "var(--surface-2)",
              color: isSynced ? "var(--accent)" : "var(--muted-foreground)",
            }}
            title={isSynced ? "Sincronizada" : "Sólo local"}
          >
            {isSynced ? <Cloud size={14} strokeWidth={1.75} /> : <HardDrive size={14} strokeWidth={1.75} />}
          </span>

          <span className="min-w-0 flex-1">
            <span
              className="block text-[14px] font-medium text-foreground truncate leading-tight"
              data-testid={`scene-name-${id}`}
            >
              {scene.name}
            </span>
            <span className="block text-[11px] truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {scene.room.name} · {format(new Date(scene.createdAt), "d MMM yyyy")}
              <span className="hidden sm:inline"> · {formatDistanceToNow(new Date(scene.createdAt), { addSuffix: true })}</span>
            </span>
          </span>

          {/* Datos técnicos en mono, alineados a la derecha. Se ocultan en
              pantallas chicas para que el nombre nunca se corte. */}
          <span className="hidden md:flex items-center gap-6 shrink-0 mr-2">
            <span className="text-right">
              <span className="block font-mono tabular-nums text-[13px] text-foreground">
                {scene.room.capacity}
              </span>
              <span className="block text-[9px] uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
                Pax
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono tabular-nums text-[13px] text-foreground">
                {scene.acoustics.rt60Audience}s
              </span>
              <span className="block text-[9px] uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
                RT60
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono tabular-nums text-[13px] text-foreground">{totalGear}</span>
              <span className="block text-[9px] uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
                Equipo
              </span>
            </span>
          </span>

          <span
            className="hidden sm:inline-flex items-center px-2 py-1 text-[10px] font-medium shrink-0"
            style={{
              borderRadius: "var(--radius-chip)",
              color: risk.hue,
              background: `${risk.hue}12`,
            }}
          >
            Eco {risk.label}
          </span>
        </button>

        {/* Acciones: visibles siempre en táctil, al hover en escritorio. */}
        <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100"
             style={{ transition: "opacity var(--dur) var(--ease)" }}>
          {!isSynced && canSync && (
            <button
              onClick={() => { feedback("select"); onPush(); }}
              data-testid={`scene-push-btn-${id}`}
              aria-label="Subir a la nube"
              title="Subir a la nube"
              className="h-8 w-8 flex items-center justify-center cursor-pointer"
              style={{ borderRadius: "var(--radius-chip)", color: "var(--muted-foreground)" }}
            >
              <CloudUpload size={14} strokeWidth={1.75} />
            </button>
          )}
          {isSynced && (
            <button
              onClick={() => { feedback("tap"); onShare(); }}
              data-testid={`scene-share-btn-${id}`}
              aria-label="Compartir escena"
              title="Compartir"
              className="h-8 w-8 flex items-center justify-center cursor-pointer"
              style={{ borderRadius: "var(--radius-chip)", color: "var(--muted-foreground)" }}
            >
              <Share2 size={14} strokeWidth={1.75} />
            </button>
          )}
          <button
            onClick={() => { feedback("warning"); setConfirmDelete(c => !c); }}
            data-testid={`scene-delete-btn-${id}`}
            aria-label="Eliminar escena"
            className="h-8 w-8 flex items-center justify-center cursor-pointer"
            style={{ borderRadius: "var(--radius-chip)", color: "var(--muted-foreground)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = HUE_DANGER; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
          >
            <Trash2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
            style={{ background: `${HUE_DANGER}08`, borderTop: `1px solid ${HUE_DANGER}22` }}
          >
            <div className="flex items-center gap-3 px-5 py-3">
              <AlertTriangle size={13} strokeWidth={1.75} style={{ color: HUE_DANGER }} className="shrink-0" />
              <p className="text-[12px] flex-1" style={{ color: HUE_DANGER }}>
                ¿Eliminar{isSynced ? " local + nube" : ""}?
              </p>
              <button
                onClick={() => setConfirmDelete(false)}
                data-testid={`scene-delete-cancel-${id}`}
                className="text-[12px] text-muted-foreground hover:text-foreground px-2 py-1 cursor-pointer"
                style={{ transition: "color 0.3s ease" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { feedback("error"); onDelete(); }}
                data-testid={`scene-delete-confirm-${id}`}
                className="text-[12px] font-medium rounded-full px-3 py-1 cursor-pointer"
                style={{
                  background: HUE_DANGER,
                  color: "var(--background)",
                  transition: "background-color 0.3s ease",
                }}
              >
                Eliminar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Scenes() {
  const { scenes, loadScene, deleteScene } = useAppStore();
  const { isAuthenticated, deleteOne, pushOne, cloudCount } = useSyncContext();
  const navigate = useNavigate();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [shareTarget, setShareTarget] = useState<Scene | null>(null);

  const handleLoad = (id: string, name: string) => {
    loadScene(id);
    toast.success(`Cargado: ${name}`);
    navigate("/");
  };

  const handleDelete = async (id: string) => {
    deleteScene(id);
    await deleteOne(id);
    toast.success("Escena eliminada");
  };

  const handlePush = async (scene: Scene) => {
    await pushOne(scene);
    toast.success(`"${scene.name}" subida a la nube`);
  };

  const sorted = [...scenes].sort((a, b) => {
    const bt = b.updatedAt ?? new Date(b.createdAt).getTime();
    const at = a.updatedAt ?? new Date(a.createdAt).getTime();
    return bt - at;
  });

  const preview = sorted.find(s => s.id === previewId) ?? sorted[0];
  const visible = sorted.filter(s => `${s.name} ${s.room.name}`.toLowerCase().includes(query.toLowerCase()));
  const isSceneSynced = (s: Scene) => isAuthenticated && !!s.clientId;

  return (
    <PremiumShell
      eyebrow="Escenas"
      title="Tu biblioteca de sistemas"
      subtitle={
        scenes.length === 0
          ? "Guardá configuraciones completas de recinto + gear para reutilizarlas."
          : `${scenes.length} local · ${isAuthenticated ? `${cloudCount} en la nube` : "solo local"}. Cargá cualquiera con un tap.`
      }
      wrapperClassName="max-w-5xl"
      right={
        <div className="flex items-center gap-3">
          {scenes.length >= 2 && (
            <button
              onClick={() => { feedback("select"); navigate("/compare"); }}
              data-testid="scenes-compare-btn"
              title="Comparar A/B"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.03)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
                color: "var(--foreground)",
                transition: "background-color 0.3s ease",
              }}
            >
              <ArrowLeftRight size={13} strokeWidth={1.75} />
              Comparar
            </button>
          )}
          <SyncIndicator />
        </div>
      }
    >
      {preview && <div className="mb-6"><VenuePreview room={preview.room} tops={preview.tops} subs={preview.subs} monitors={preview.monitors} /><p className="text-xs text-muted-foreground mt-2">Vista previa · {preview.name}</p></div>}
      {scenes.length > 0 && <input className="v6-panel w-full px-3 py-2 text-sm mb-4" aria-label="Buscar escenas" placeholder="Buscar escenas…" value={query} onChange={e => setQuery(e.target.value)} />}
      {/* Empty */}
      {sorted.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="py-16 text-center"
          data-testid="scenes-empty"
        >
          <div className="inline-flex h-14 w-14 rounded-full items-center justify-center mb-5"
            style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}
          >
            <Archive size={20} strokeWidth={1.5} className="text-muted-foreground" />
          </div>
          <p className="text-[15px] font-medium text-foreground mb-2">Sin escenas guardadas</p>
          <p className="text-[13px] text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
            Completá un escaneo de sala, configurá el gear y guardá una instantánea desde Exportar.
          </p>
          <button
            onClick={() => { feedback("select"); navigate("/export-page"); }}
            data-testid="scenes-empty-go-export"
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#09090b] hover:bg-white/90 px-5 py-2.5 text-[13px] font-medium cursor-pointer"
            style={{ transition: "background-color 0.3s ease" }}
          >
            Ir a Exportar
            <ChevronRight size={13} strokeWidth={2} />
          </button>
        </motion.div>
      )}

      {/* Grid */}
      {sorted.length > 0 && (
        <div className="flex flex-col" data-testid="scenes-grid">
          <AnimatePresence>
            {visible.map(scene => (
              <SceneCard
                key={scene.clientId ?? scene.id}
                scene={scene}
                onPreview={() => setPreviewId(scene.id)}
                isSynced={isSceneSynced(scene)}
                canSync={isAuthenticated}
                onLoad={() => handleLoad(scene.clientId ?? scene.id, scene.name)}
                onDelete={() => handleDelete(scene.clientId ?? scene.id)}
                onPush={() => handlePush(scene)}
                onShare={() => setShareTarget(scene)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {sorted.length > 0 && visible.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No hay escenas que coincidan.</p>}
      <ShareSceneModal
        open={!!shareTarget}
        scene={shareTarget}
        onClose={() => setShareTarget(null)}
      />
    </PremiumShell>
  );
}
