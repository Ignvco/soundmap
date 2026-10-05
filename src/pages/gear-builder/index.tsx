import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { catalogStatus } from "@/lib/audio/catalog";
import { gearMatchScore } from "@/lib/audio/pa-engine";
import type { LucideIcon } from "lucide-react";
// SoundMap — Armador de Equipo (Gear Builder) — Dark premium configurator
import { PageHeader } from "@/components/soundmap/nav.tsx";
import {
  GlassCard,
  ScreenShell,
  WarningBanner,
} from "@/components/soundmap/ui.tsx";
import {
  AMPS_DATABASE,
  DSP_DATABASE,
  MICS_DATABASE,
  MIXERS_DATABASE,
  MONITORS_DATABASE,
  SUBS_DATABASE,
  TOPS_DATABASE,
} from "@/lib/audio/gear-database.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import { useInWizard } from "@/lib/wizard-context.ts";
import { useAppStore } from "@/store/app.ts";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Gauge,
  Layers,
  Mic2,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Speaker,
  Star,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

type GearTab = "tops" | "subs" | "monitors" | "dsp" | "amp" | "mixer" | "mic";
type SortMode = "match" | "spl" | "power" | "name";
type FilterActive = "all" | "active" | "passive";

interface TabConfig {
  id: GearTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
}

// SoundMap Vitals palette — single lime accent, everything else neutral grayscale
const LIME = "var(--sm-accent)";

const TABS: TabConfig[] = [
  {
    id: "tops",
    label: "Line Arrays / Tops",
    shortLabel: "Tops",
    icon: Speaker,
    color: LIME,
  },
  {
    id: "subs",
    label: "Subwoofers",
    shortLabel: "Subs",
    icon: Gauge,
    color: LIME,
  },
  {
    id: "monitors",
    label: "Monitores de Escenario",
    shortLabel: "Mon",
    icon: Layers,
    color: LIME,
  },
  {
    id: "dsp",
    label: "Procesadores DSP",
    shortLabel: "DSP",
    icon: Cpu,
    color: LIME,
  },
  {
    id: "amp",
    label: "Amplificadores",
    shortLabel: "Amps",
    icon: Zap,
    color: LIME,
  },
  {
    id: "mixer",
    label: "Consolas de Mezcla",
    shortLabel: "Consola",
    icon: SlidersHorizontal,
    color: LIME,
  },
  {
    id: "mic",
    label: "Micrófonos",
    shortLabel: "Mics",
    icon: Mic2,
    color: LIME,
  },
];

const DB_MAP: Record<GearTab, GearItem[]> = {
  tops: TOPS_DATABASE,
  subs: SUBS_DATABASE,
  monitors: MONITORS_DATABASE,
  dsp: DSP_DATABASE,
  amp: AMPS_DATABASE,
  mixer: MIXERS_DATABASE,
  mic: MICS_DATABASE,
};

function getScoreLabel(score: number): string {
  if (score >= 88) return "Afinidad orientativa";
  if (score >= 75) return "Revisar compatibilidad";
  return "Revisar requisitos";
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">
        {label}
      </span>
      <span className="text-[11px] text-foreground font-semibold">{value}</span>
    </div>
  );
}

function GearCard({
  item,
  selected,
  score,
  onToggle,
  onQuantityChange,
  quantity,
  tabIcon: TabIcon,
}: {
  item: GearItem;
  selected: boolean;
  score: number | null;
  onToggle: () => void;
  onQuantityChange: (qty: number) => void;
  quantity: number;
  tabColor: string;
  tabIcon: LucideIcon;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="gear-row" data-selected={selected}>
      <div className="gear-row-main">
        <TabIcon
          size={19}
          strokeWidth={1.5}
          className={
            selected ? "text-accent shrink-0" : "text-muted-foreground shrink-0"
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">{item.brand}</p>
          <p className="text-sm font-medium break-words">{item.model}</p>
          <p className="text-xs text-muted-foreground">{catalogStatus(item)}</p>
        </div>
        <button
          className={`v6-button ${selected ? "text-accent" : ""}`}
          onClick={onToggle}
          aria-label={`${selected ? "Quitar" : "Agregar"} ${item.brand} ${item.model}`}
          aria-pressed={selected}
        >
          {selected ? <Check size={15} /> : <Plus size={15} />}
          <span>{selected ? "En PA" : "Agregar"}</span>
        </button>
        <button
          className="app-icon-button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={`Detalles de ${item.model}`}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      {selected && (
        <div className="gear-row-quantity">
          <span>Cantidad</span>
          <div className="flex items-center">
            <button
              aria-label={`Reducir cantidad de ${item.model}`}
              onClick={() => onQuantityChange(quantity - 1)}
            >
              <Minus size={14} />
            </button>
            <output aria-label={`Cantidad de ${item.model}`}>{quantity}</output>
            <button
              aria-label={`Aumentar cantidad de ${item.model}`}
              onClick={() => onQuantityChange(quantity + 1)}
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}
      {expanded && (
        <div className="gear-row-details">
          <SpecRow
            label="Compatibilidad con recinto"
            value={
              score === null
                ? "Sin recomendación: faltan datos verificados"
                : `${score} / 100 · Heurística de selección`
            }
          />
          {item.splMax > 0 && (
            <SpecRow label="SPL máximo" value={`${item.splMax} dB`} />
          )}
          {!!item.rmsWatts && (
            <SpecRow
              label={
                item.powerKind === "amplifier-module"
                  ? "Potencia del módulo"
                  : "Potencia continua declarada"
              }
              value={`${item.rmsWatts} W`}
            />
          )}
          {!!item.peakWatts && (
            <SpecRow label="Potencia pico" value={`${item.peakWatts} W`} />
          )}
          {item.freqLow != null && item.freqHigh != null && (
            <SpecRow
              label="Frecuencia"
              value={`${item.freqLow}–${item.freqHigh} Hz`}
            />
          )}
          {item.coverageH != null && (
            <SpecRow label="Cobertura H" value={`${item.coverageH}°`} />
          )}
          {item.coverageV != null && (
            <SpecRow label="Cobertura V" value={`${item.coverageV}°`} />
          )}
          {!!item.weight && (
            <SpecRow label="Peso" value={`${item.weight} kg`} />
          )}
          <SpecRow
            label="Amplificación"
            value={item.active ? "Activo" : "Pasivo"}
          />
          <SpecRow
            label="DSP"
            value={item.dspIntegrated ? "Integrado" : "Externo"}
          />
        </div>
      )}
    </div>
  );
}

export default function GearBuilder() {
  const {
    stageLayout,
    tops,
    subs,
    monitors,
    dspUnits,
    amps,
    mixers,
    mics,
    acoustics,
    room,
    toggleGearItem,
    setGearItemQuantity,
  } = useAppStore();
  const inWizard = useInWizard();
  const [activeTab, setActiveTab] = useState<GearTab>("tops");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("match");
  const [filterActive, setFilterActive] = useState<FilterActive>("all");
  const [showFilters, setShowFilters] = useState(false);

  const selectedMap: Record<GearTab, GearItem[]> = {
    tops,
    subs,
    monitors,
    dsp: dspUnits,
    amp: amps,
    mixer: mixers,
    mic: mics,
  };

  // Count total units (sum of quantities, not just items)
  const totalUnits = [tops, subs, monitors, dspUnits, amps, mixers, mics]
    .flat()
    .reduce((sum, g) => sum + (g.quantity ?? 1), 0);

  const activeTabConfig = TABS.find((t) => t.id === activeTab)!;
  const database = DB_MAP[activeTab];
  const capacity = room?.capacity ?? 200;
  const rt60 = acoustics?.rt60Occupied ?? 1.0;

  const processedItems = useMemo(() => {
    let items = database.map((item) => ({
      item,
      score:
        item.catalog?.reviewedFields.includes("splMax") &&
        ["tops", "subs", "monitors"].includes(item.category)
          ? gearMatchScore(item, capacity, rt60)
          : null,
    }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        ({ item }) =>
          item.brand.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q),
      );
    }

    if (filterActive === "active")
      items = items.filter(({ item }) => item.active);
    else if (filterActive === "passive")
      items = items.filter(({ item }) => !item.active);

    items.sort((a, b) => {
      if (sortMode === "match") return (b.score ?? -1) - (a.score ?? -1);
      if (sortMode === "spl") return b.item.splMax - a.item.splMax;
      if (sortMode === "power")
        return (b.item.rmsWatts ?? 0) - (a.item.rmsWatts ?? 0);
      if (sortMode === "name")
        return `${a.item.brand} ${a.item.model}`.localeCompare(
          `${b.item.brand} ${b.item.model}`,
        );
      return 0;
    });

    return items;
  }, [database, searchQuery, filterActive, sortMode, capacity, rt60]);

  const selectedItems = selectedMap[activeTab];
  // Count units in this tab
  const tabUnits = selectedItems.reduce((sum, g) => sum + (g.quantity ?? 1), 0);
  const isSelected = (item: GearItem) =>
    selectedItems.some((g) => g.id === item.id);
  const getQuantity = (item: GearItem) =>
    selectedItems.find((g) => g.id === item.id)?.quantity ?? 1;

  return (
    <ScreenShell compact={inWizard} className="gear-builder-workspace">
      {inWizard && (
        <div className="step-intro">
          <h2>Configurá el PA</h2>
          <p>Elegí las cajas y la cantidad de cada equipo.</p>
        </div>
      )}
      {!inWizard && (
        <PageHeader
          title="Armador de Equipo"
          subtitle={
            room
              ? `${room.name} · ${room.capacity} personas`
              : "Sin sala seleccionada"
          }
          right={
            totalUnits > 0 ? (
              <div className="flex items-center gap-1 rounded-xl bg-accent/12 border border-accent/30 px-3 py-1.5">
                <Star size={11} className="text-accent" fill="var(--accent)" />
                <span className="text-xs font-bold text-accent">
                  {totalUnits}
                </span>
              </div>
            ) : undefined
          }
        />
      )}

      {!room && (
        <div className="mb-4">
          <WarningBanner
            message="Hacé un Escaneo de Sala primero para obtener puntajes y recomendaciones optimizadas."
            type="info"
          />
        </div>
      )}

      <div className="mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const tabItems = selectedMap[tab.id];
            const units = tabItems.reduce(
              (sum, g) => sum + (g.quantity ?? 1),
              0,
            );
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer"
                style={
                  isActive
                    ? {
                        background: `${tab.color}1F`,
                        border: `1px solid ${tab.color}55`,
                        color: tab.color,
                        boxShadow: `0 2px 12px ${tab.color}26`,
                      }
                    : {
                        background: "var(--secondary)",
                        border: "1px solid var(--border)",
                        color: "var(--muted-foreground)",
                      }
                }
              >
                <Icon size={13} />
                <span>{tab.shortLabel}</span>
                {units > 0 && (
                  <span
                    className="rounded-full px-1.5 text-[9px] font-bold"
                    style={{ background: `${tab.color}33`, color: tab.color }}
                  >
                    {units}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {room && (
        <div className="mb-5">
          <VenuePreview
            layout={stageLayout}
            room={room}
            tops={tops}
            subs={subs}
            monitors={monitors}
          />
        </div>
      )}
      <div className="mb-3">
        <GlassCard className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">
                {activeTabConfig.label}
              </h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {processedItems.length} elementos · {tabUnits} unidades
                seleccionadas
              </p>
            </div>
            <button
              onClick={() => setShowFilters((f) => !f)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              style={
                showFilters
                  ? {
                      background: `${activeTabConfig.color}18`,
                      color: activeTabConfig.color,
                      border: `1px solid ${activeTabConfig.color}40`,
                    }
                  : { border: "1px solid var(--border)" }
              }
            >
              <SlidersHorizontal size={12} />
              Filtros
            </button>
          </div>

          <div className="relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar marca o modelo…"
              className="w-full bg-secondary/50 border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1.5">
                      Ordenar Por
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["match", "spl", "power", "name"] as SortMode[]).map(
                        (mode) => (
                          <button
                            key={mode}
                            onClick={() => setSortMode(mode)}
                            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
                            style={
                              sortMode === mode
                                ? {
                                    background: `${activeTabConfig.color}1F`,
                                    color: activeTabConfig.color,
                                    border: `1px solid ${activeTabConfig.color}4D`,
                                  }
                                : {
                                    background: "var(--secondary)",
                                    border: "1px solid var(--border)",
                                    color: "var(--muted-foreground)",
                                  }
                            }
                          >
                            {mode === "match"
                              ? "Mejor Coincidencia"
                              : mode === "spl"
                                ? "SPL Máximo"
                                : mode === "power"
                                  ? "Potencia"
                                  : "A-Z"}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  {["tops", "subs", "monitors"].includes(activeTab) && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1.5">
                        Amplificación
                      </p>
                      <div className="flex gap-1.5">
                        {(["all", "active", "passive"] as FilterActive[]).map(
                          (f) => (
                            <button
                              key={f}
                              onClick={() => setFilterActive(f)}
                              className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
                              style={
                                filterActive === f
                                  ? {
                                      background: `${activeTabConfig.color}1F`,
                                      color: activeTabConfig.color,
                                      border: `1px solid ${activeTabConfig.color}4D`,
                                    }
                                  : {
                                      background: "var(--secondary)",
                                      border: "1px solid var(--border)",
                                      color: "var(--muted-foreground)",
                                    }
                              }
                            >
                              {f === "all"
                                ? "Todos"
                                : f === "active"
                                  ? "Activo"
                                  : "Pasivo"}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      <AnimatePresence>
        {selectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 mb-3 overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-card p-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-2">
                Seleccionados
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{
                      background: `${activeTabConfig.color}18`,
                      border: `1px solid ${activeTabConfig.color}3D`,
                    }}
                  >
                    <span
                      className="text-[11px] font-bold tabular-nums"
                      style={{ color: activeTabConfig.color }}
                    >
                      {item.quantity ?? 1}×
                    </span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: activeTabConfig.color }}
                    >
                      {item.brand} {item.model}
                    </span>
                    <button
                      onClick={() => toggleGearItem(activeTab, item)}
                      className="transition-opacity hover:opacity-100 opacity-60 cursor-pointer"
                      style={{ color: activeTabConfig.color }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {room && acoustics && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: "Capacidad",
                value: room.capacity.toString(),
                unit: "pax",
              },
              { label: "RT60", value: rt60.toFixed(2), unit: "s" },
              {
                label: "Volumen",
                value: Math.round(acoustics.volume).toString(),
                unit: "m³",
              },
            ].map((m) => (
              <div
                key={m.label}
                className="rounded-xl bg-secondary/50 border border-border p-3 text-center"
              >
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                  {m.label}
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {m.value}
                  {m.unit && (
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      {m.unit}
                    </span>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pb-4">
        {processedItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 text-muted-foreground text-sm"
          >
            No se encontró equipo con estos filtros.
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 items-start">
            <AnimatePresence mode="popLayout">
              {processedItems.map(({ item, score }) => (
                <GearCard
                  key={item.id}
                  item={item}
                  selected={isSelected(item)}
                  score={score}
                  quantity={getQuantity(item)}
                  onToggle={() => toggleGearItem(activeTab, item)}
                  onQuantityChange={(qty) =>
                    setGearItemQuantity(activeTab, item.id, qty)
                  }
                  tabColor={activeTabConfig.color}
                  tabIcon={activeTabConfig.icon}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </ScreenShell>
  );
}
