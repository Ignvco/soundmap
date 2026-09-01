// SoundMap — Armador de Equipo (Gear Builder) — Dark premium configurator
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, X, Search, SlidersHorizontal, ChevronDown, ChevronUp,
  Speaker, Cpu, Zap, Mic2, Layers, Gauge, Star, Minus
} from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import {
  TOPS_DATABASE, SUBS_DATABASE, MONITORS_DATABASE,
  DSP_DATABASE, AMPS_DATABASE, MIXERS_DATABASE, MICS_DATABASE
} from "@/lib/audio/gear-database.ts";
import { GlassCard, Badge, ScreenShell, WarningBanner } from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { useInWizard } from "@/lib/wizard-context.ts";

type GearTab = "tops" | "subs" | "monitors" | "dsp" | "amp" | "mixer" | "mic";
type SortMode = "match" | "spl" | "power" | "name";
type FilterActive = "all" | "active" | "passive";

interface TabConfig {
  id: GearTab;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
}

// SoundMap Vitals palette — single lime accent, everything else neutral grayscale
const LIME = "var(--sm-accent)";

const TABS: TabConfig[] = [
  { id: "tops",     label: "Line Arrays / Tops", shortLabel: "Tops",    icon: Speaker,           color: LIME },
  { id: "subs",     label: "Subwoofers",          shortLabel: "Subs",    icon: Gauge,             color: LIME },
  { id: "monitors", label: "Monitores de Escenario", shortLabel: "Mon", icon: Layers,            color: LIME },
  { id: "dsp",      label: "Procesadores DSP",    shortLabel: "DSP",     icon: Cpu,               color: LIME },
  { id: "amp",      label: "Amplificadores",      shortLabel: "Amps",    icon: Zap,               color: LIME },
  { id: "mixer",    label: "Consolas de Mezcla",  shortLabel: "Consola", icon: SlidersHorizontal, color: LIME },
  { id: "mic",      label: "Micrófonos",          shortLabel: "Mics",    icon: Mic2,              color: LIME },
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

function gearMatchScore(item: GearItem, capacity: number, rt60: number): number {
  const cat = item.category;
  if (cat === "dsp" || cat === "mixer" || cat === "mic") return 80 + Math.floor(Math.random() * 15);
  if (cat === "amp") return item.rmsWatts && item.rmsWatts > 3000 ? 88 : 72;

  let score = 60;
  if (item.active) score += 12;
  if (item.dspIntegrated) score += 8;
  if (capacity > 500 && item.splMax >= 143) score += 12;
  else if (capacity > 200 && item.splMax >= 139) score += 8;
  else if (capacity <= 200 && item.splMax <= 136) score += 6;
  if (rt60 > 1.5 && item.coverageH && item.coverageH <= 100) score += 6;
  if (rt60 <= 1.0 && item.coverageH && item.coverageH >= 100) score += 4;
  if (item.splMax >= 140) score += 6;
  if (item.dspIntegrated) score += 4;

  return Math.min(99, score);
}

function getScoreColor(score: number): string {
  // Single lime accent for excellent; muted grayscale for the rest (Vitals rule)
  if (score >= 88) return LIME;
  if (score >= 75) return "#A1A1AA";
  return "var(--muted-foreground)";
}

function getScoreLabel(score: number): string {
  if (score >= 88) return "Ideal";
  if (score >= 75) return "Buena Opción";
  return "Marginal";
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em]">{label}</span>
      <span className="text-[11px] text-foreground font-semibold">{value}</span>
    </div>
  );
}

// Compact spec tile shown in the card body grid
function SpecStat({ icon: Icon, value, unit, label }: { icon: React.ElementType; value: string; unit?: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-secondary/50 border border-border/70 px-2.5 py-2">
      <Icon size={14} className="text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-foreground leading-none truncate">
          {value}{unit && <span className="text-[10px] text-muted-foreground font-semibold ml-0.5">{unit}</span>}
        </p>
        <p className="text-[8px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mt-1 leading-none">{label}</p>
      </div>
    </div>
  );
}

function GearCard({
  item, selected, score, onToggle, onQuantityChange, quantity, tabColor, tabIcon: TabIcon,
}: {
  item: GearItem; selected: boolean; score: number; onToggle: () => void;
  onQuantityChange: (qty: number) => void; quantity: number;
  tabColor: string; tabIcon: React.ElementType;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasTechSpecs = Boolean(item.splMax > 0 || item.rmsWatts || item.freqLow || item.coverageH);
  const scoreColor = getScoreColor(score);

  const powerLabel = item.rmsWatts && item.rmsWatts > 0
    ? (item.rmsWatts >= 1000 ? `${(item.rmsWatts / 1000).toFixed(1)}` : `${item.rmsWatts}`)
    : null;
  const powerUnit = item.rmsWatts && item.rmsWatts >= 1000 ? "kW" : "W";

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2 }} className="h-full">
      <div
        className={`relative h-full flex flex-col rounded-2xl bg-card transition-all duration-200 overflow-hidden ${selected ? "" : "hover:-translate-y-0.5"}`}
        style={{
          boxShadow: selected
            ? `0 0 0 1px ${LIME}66, 0 12px 40px -10px ${LIME}22`
            : "0 0 0 1px rgba(255,255,255,0.05)",
          background: selected ? `linear-gradient(160deg, ${LIME}08 0%, var(--card) 55%)` : "var(--card)",
          transition: "box-shadow 0.3s ease, transform 0.2s ease",
        }}
      >
        {/* Score pill — top right, compact and quiet */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5"
          style={{
            background: score >= 88 ? `${LIME}18` : "rgba(255,255,255,0.03)",
            boxShadow: score >= 88 ? `0 0 0 1px ${LIME}44` : "0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <span className="text-[11px] font-bold tabular-nums leading-none" style={{ color: scoreColor }}>{score}</span>
          <span className="text-[8px] font-medium uppercase tracking-[0.24em] leading-none" style={{ color: scoreColor, opacity: 0.85 }}>
            {getScoreLabel(score)}
          </span>
        </div>

        <div className="p-4 pr-2 pt-4 flex-1 flex flex-col">
          {/* Type icon + brand/model */}
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 h-10 w-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.06)" }}
            >
              <TabIcon size={16} className="text-muted-foreground" />
            </div>
            <div className="min-w-0 pr-16">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-medium leading-none mb-1">{item.brand}</p>
              <p className="text-[15px] font-medium text-foreground leading-tight tracking-[-0.01em]">{item.model}</p>
            </div>
          </div>

          {/* Spec stat grid */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            {item.splMax > 0 && <SpecStat icon={Gauge} value={`${item.splMax}`} unit="dB" label="SPL Máx" />}
            {powerLabel && <SpecStat icon={Zap} value={powerLabel} unit={powerUnit} label="RMS" />}
            {item.coverageH != null && <SpecStat icon={Layers} value={`${item.coverageH}°`} label="Cobertura" />}
            {item.freqLow != null && item.freqHigh != null && (
              <SpecStat
                icon={Speaker}
                value={`${item.freqLow}–${item.freqHigh >= 1000 ? `${(item.freqHigh / 1000).toFixed(0)}k` : item.freqHigh}`}
                unit="Hz"
                label="Rango"
              />
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {item.active && <Badge color="green">Activo</Badge>}
            {item.dspIntegrated && <Badge color="purple">DSP</Badge>}
            {item.weight && <Badge color="gray">{item.weight} kg</Badge>}
          </div>

          <div className="flex-1" />

          {/* Action row */}
          <div className="flex items-center gap-2 mt-4">
            {selected ? (
              /* Quantity stepper when item is selected */
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => onQuantityChange(quantity - 1)}
                  className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  style={{ background: `${tabColor}1F`, border: `1px solid ${tabColor}55`, color: tabColor }}
                >
                  <Minus size={14} />
                </button>
                <div
                  className="flex-1 flex flex-col items-center justify-center rounded-xl py-1.5"
                  style={{ background: `${tabColor}12`, border: `1px solid ${tabColor}40` }}
                >
                  <span className="text-lg font-extrabold leading-none" style={{ color: tabColor }}>{quantity}</span>
                  <span className="text-[8px] uppercase tracking-[0.28em] font-semibold text-muted-foreground mt-0.5">unidades</span>
                </div>
                <button
                  onClick={() => onQuantityChange(quantity + 1)}
                  className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-all cursor-pointer active:scale-95"
                  style={{ background: `${tabColor}1F`, border: `1px solid ${tabColor}55`, color: tabColor }}
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={onToggle}
                  className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center transition-colors cursor-pointer border border-border bg-secondary/50 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={onToggle}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer active:scale-[0.97]"
                style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
              >
                <Plus size={14} /> Agregar
              </button>
            )}
            {hasTechSpecs && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="shrink-0 h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border bg-secondary/50"
              >
                {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-1">
                <div className="rounded-xl bg-secondary/50 border border-border p-3 space-y-0.5">
                  {item.splMax > 0 && <SpecRow label="SPL Máximo" value={`${item.splMax} dB`} />}
                  {item.rmsWatts && item.rmsWatts > 0 && <SpecRow label="Potencia RMS" value={`${item.rmsWatts} W`} />}
                  {item.peakWatts && item.peakWatts > 0 && <SpecRow label="Potencia Pico" value={`${item.peakWatts} W`} />}
                  {item.freqLow != null && item.freqHigh != null && <SpecRow label="Frecuencia" value={`${item.freqLow} – ${item.freqHigh} Hz`} />}
                  {item.coverageH != null && <SpecRow label="Cobertura H" value={`${item.coverageH}°`} />}
                  {item.coverageV != null && <SpecRow label="Cobertura V" value={`${item.coverageV}°`} />}
                  {item.weight && <SpecRow label="Peso" value={`${item.weight} kg`} />}
                  <SpecRow label="Amplificación" value={item.active ? "Activo (Autopropulsado)" : "Pasivo (Amp Externo)"} />
                  <SpecRow label="DSP" value={item.dspIntegrated ? "Integrado" : "Externo Requerido"} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function GearBuilder() {
  const { tops, subs, monitors, dspUnits, amps, mixers, mics, acoustics, room, toggleGearItem, setGearItemQuantity } = useAppStore();
  const inWizard = useInWizard();
  const [activeTab, setActiveTab] = useState<GearTab>("tops");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("match");
  const [filterActive, setFilterActive] = useState<FilterActive>("all");
  const [showFilters, setShowFilters] = useState(false);

  const selectedMap: Record<GearTab, GearItem[]> = {
    tops, subs, monitors, dsp: dspUnits, amp: amps, mixer: mixers, mic: mics,
  };

  // Count total units (sum of quantities, not just items)
  const totalUnits = [tops, subs, monitors, dspUnits, amps, mixers, mics]
    .flat()
    .reduce((sum, g) => sum + (g.quantity ?? 1), 0);

  const activeTabConfig = TABS.find(t => t.id === activeTab)!;
  const database = DB_MAP[activeTab];
  const capacity = room?.capacity ?? 200;
  const rt60 = acoustics?.rt60Audience ?? 1.0;

  const processedItems = useMemo(() => {
    let items = database.map(item => ({ item, score: gearMatchScore(item, capacity, rt60) }));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(({ item }) =>
        item.brand.toLowerCase().includes(q) || item.model.toLowerCase().includes(q)
      );
    }

    if (filterActive === "active") items = items.filter(({ item }) => item.active);
    else if (filterActive === "passive") items = items.filter(({ item }) => !item.active);

    items.sort((a, b) => {
      if (sortMode === "match") return b.score - a.score;
      if (sortMode === "spl") return b.item.splMax - a.item.splMax;
      if (sortMode === "power") return (b.item.rmsWatts ?? 0) - (a.item.rmsWatts ?? 0);
      if (sortMode === "name") return `${a.item.brand} ${a.item.model}`.localeCompare(`${b.item.brand} ${b.item.model}`);
      return 0;
    });

    return items;
  }, [database, searchQuery, filterActive, sortMode, capacity, rt60]);

  const selectedItems = selectedMap[activeTab];
  // Count units in this tab
  const tabUnits = selectedItems.reduce((sum, g) => sum + (g.quantity ?? 1), 0);
  const isSelected = (item: GearItem) => selectedItems.some(g => g.id === item.id);
  const getQuantity = (item: GearItem) => selectedItems.find(g => g.id === item.id)?.quantity ?? 1;

  return (
    <ScreenShell compact={inWizard}>
      {!inWizard && (
        <PageHeader
          title="Armador de Equipo"
          subtitle={room ? `${room.name} · ${room.capacity} personas` : "Sin sala seleccionada"}
          right={
            totalUnits > 0 ? (
              <div className="flex items-center gap-1 rounded-xl bg-accent/12 border border-accent/30 px-3 py-1.5">
                <Star size={11} className="text-accent" fill="var(--accent)" />
                <span className="text-xs font-bold text-accent">{totalUnits}</span>
              </div>
            ) : undefined
          }
        />
      )}

      {!room && (
        <div className="px-4 mb-4">
          <WarningBanner message="Hacé un Escaneo de Sala primero para obtener puntajes y recomendaciones optimizadas." type="info" />
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const tabItems = selectedMap[tab.id];
            const units = tabItems.reduce((sum, g) => sum + (g.quantity ?? 1), 0);
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 cursor-pointer"
                style={isActive ? { background: `${tab.color}1F`, border: `1px solid ${tab.color}55`, color: tab.color, boxShadow: `0 2px 12px ${tab.color}26` } : { background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
              >
                <Icon size={13} />
                <span>{tab.shortLabel}</span>
                {units > 0 && (
                  <span className="rounded-full px-1.5 text-[9px] font-bold" style={{ background: `${tab.color}33`, color: tab.color }}>
                    {units}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 mb-3">
        <GlassCard className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground leading-none">{activeTabConfig.label}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">{processedItems.length} elementos · {tabUnits} unidades seleccionadas</p>
            </div>
            <button
              onClick={() => setShowFilters(f => !f)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              style={showFilters ? { background: `${activeTabConfig.color}18`, color: activeTabConfig.color, border: `1px solid ${activeTabConfig.color}40` } : { border: "1px solid var(--border)" }}
            >
              <SlidersHorizontal size={12} />
              Filtros
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar marca o modelo…"
              className="w-full bg-secondary/50 border border-border rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                <X size={12} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                <div className="pt-3 space-y-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1.5">Ordenar Por</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["match", "spl", "power", "name"] as SortMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setSortMode(mode)}
                          className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
                          style={sortMode === mode ? { background: `${activeTabConfig.color}1F`, color: activeTabConfig.color, border: `1px solid ${activeTabConfig.color}4D` } : { background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                        >
                          {mode === "match" ? "Mejor Coincidencia" : mode === "spl" ? "SPL Máximo" : mode === "power" ? "Potencia" : "A-Z"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {["tops", "subs", "monitors"].includes(activeTab) && (
                    <div>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1.5">Amplificación</p>
                      <div className="flex gap-1.5">
                        {(["all", "active", "passive"] as FilterActive[]).map(f => (
                          <button
                            key={f}
                            onClick={() => setFilterActive(f)}
                            className="rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all cursor-pointer"
                            style={filterActive === f ? { background: `${activeTabConfig.color}1F`, color: activeTabConfig.color, border: `1px solid ${activeTabConfig.color}4D` } : { background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}
                          >
                            {f === "all" ? "Todos" : f === "active" ? "Activo" : "Pasivo"}
                          </button>
                        ))}
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="px-4 mb-3 overflow-hidden">
            <div className="rounded-xl border border-border bg-card p-3 shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-2">Seleccionados</p>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: `${activeTabConfig.color}18`, border: `1px solid ${activeTabConfig.color}3D` }}>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: activeTabConfig.color }}>{item.quantity ?? 1}×</span>
                    <span className="text-[11px] font-semibold" style={{ color: activeTabConfig.color }}>{item.brand} {item.model}</span>
                    <button onClick={() => toggleGearItem(activeTab, item)} className="transition-opacity hover:opacity-100 opacity-60 cursor-pointer" style={{ color: activeTabConfig.color }}>
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
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Capacidad", value: room.capacity.toString(), unit: "pax" },
              { label: "RT60", value: rt60.toFixed(2), unit: "s" },
              { label: "Volumen", value: Math.round(acoustics.volume).toString(), unit: "m³" },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-secondary/50 border border-border p-3 text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">{m.label}</p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {m.value}
                  {m.unit && <span className="text-[10px] text-muted-foreground ml-0.5">{m.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        {processedItems.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 text-muted-foreground text-sm">
            No se encontró equipo con estos filtros.
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 items-stretch">
            <AnimatePresence mode="popLayout">
              {processedItems.map(({ item, score }) => (
                <GearCard
                  key={item.id}
                  item={item}
                  selected={isSelected(item)}
                  score={score}
                  quantity={getQuantity(item)}
                  onToggle={() => toggleGearItem(activeTab, item)}
                  onQuantityChange={(qty) => setGearItemQuantity(activeTab, item.id, qty)}
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
