import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { catalogStatus } from "@/lib/audio/catalog";
import { gearMatchScore } from "@/lib/audio/pa-engine";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import type { LucideIcon } from "lucide-react";
// SoundMap — Armador de Equipo (Gear Builder) — Dark premium configurator
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { ProjectPlanPreview } from "@/components/soundmap/project-plan-preview";
import { Link } from "react-router-dom";
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
  ArrowUpRight,
  Package,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";

type GearTab = "tops" | "subs" | "monitors" | "dsp" | "amp" | "mixer" | "mic";
type SortMode = "match" | "spl" | "power" | "name";
type FilterActive = "all" | "active" | "passive";

interface TabConfig {
  id: GearTab;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

const TABS: TabConfig[] = [
  {
    id: "tops",
    label: "Line Arrays / Tops",
    shortLabel: "Tops",
    icon: Speaker,
  },
  {
    id: "subs",
    label: "Subwoofers",
    shortLabel: "Subs",
    icon: Gauge,
  },
  {
    id: "monitors",
    label: "Monitores de Escenario",
    shortLabel: "Mon",
    icon: Layers,
  },
  {
    id: "dsp",
    label: "Procesadores DSP",
    shortLabel: "DSP",
    icon: Cpu,
  },
  {
    id: "amp",
    label: "Amplificadores",
    shortLabel: "Amps",
    icon: Zap,
  },
  {
    id: "mixer",
    label: "Consolas de Mezcla",
    shortLabel: "Consola",
    icon: SlidersHorizontal,
  },
  {
    id: "mic",
    label: "Micrófonos",
    shortLabel: "Mics",
    icon: Mic2,
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
          className={`v6-button gear-add ${selected ? "text-accent" : ""}`}
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
              disabled={quantity >= 64}
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
    audit,
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
  const [showInventory, setShowInventory] = useState(false);
  const previewGrid = useMemo(
    () =>
      room
        ? (evaluateAudit({ room, tops, subs, stageLayout, dsp: audit.dsp })
            .grid ?? undefined)
        : undefined,
    [room, tops, subs, stageLayout, audit.dsp],
  );
  const speakerCategory = ["tops", "subs", "monitors"].includes(activeTab);

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
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        ({ item }) =>
          item.brand.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q),
      );
    }

    if (speakerCategory && filterActive === "active")
      items = items.filter(({ item }) => item.active);
    else if (speakerCategory && filterActive === "passive")
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
  }, [
    database,
    searchQuery,
    filterActive,
    sortMode,
    capacity,
    rt60,
    speakerCategory,
  ]);

  const selectedItems = selectedMap[activeTab];
  // Count units in this tab
  const tabUnits = selectedItems.reduce((sum, g) => sum + (g.quantity ?? 1), 0);
  const isSelected = (item: GearItem) =>
    selectedItems.some((g) => g.id === item.id);
  const getQuantity = (item: GearItem) =>
    selectedItems.find((g) => g.id === item.id)?.quantity ?? 1;

  const chooseCategory = (category: GearTab) => {
    setActiveTab(category);
    setSearchQuery("");
  };

  return (
    <div className="glow-workspace glow-gear">
      <WorkspaceHeading
        eyebrow={inWizard ? "DISEÑO / 02 · EQUIPOS" : "INVENTARIO DEL PROYECTO"}
        title="Armá tu sistema."
        description="Elegí modelos y cantidades para tu plano y DSP."
      />
      {!room && (
        <p className="workspace-note">
          Podés explorar el catálogo.{" "}
          <Link to="/design?step=room" className="text-accent">
            Definí el recinto
          </Link>{" "}
          para contextualizar la selección.
        </p>
      )}

      <div className="gear-layout">
        <section className="gear-controls" aria-label="Explorar catálogo">
          <div className="gear-category-mobile">
            <label htmlFor="gear-category">Categoría de equipo</label>
            <select
              id="gear-category"
              className="audit-input"
              value={activeTab}
              onChange={(e) => chooseCategory(e.target.value as GearTab)}
            >
              {TABS.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>
          <nav className="gear-categories" aria-label="Categorías de equipo">
            {TABS.map(({ id, shortLabel, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-label={label}
                aria-pressed={activeTab === id}
                onClick={() => chooseCategory(id)}
              >
                <Icon size={17} />
                <span>{shortLabel}</span>
              </button>
            ))}
          </nav>
          <div className="gear-search-row">
            <div className="gear-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label="Buscar marca o modelo"
                placeholder="Buscar marca o modelo…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => setSearchQuery("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button
              type="button"
              className="audit-button"
              aria-expanded={showFilters}
              aria-controls="gear-filters"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={16} /> Filtros
              {speakerCategory && filterActive !== "all" ? " · 1" : ""}
            </button>
          </div>
          {showFilters && (
            <div id="gear-filters" className="gear-filters">
              <label>
                Ordenar por
                <select
                  className="audit-input"
                  aria-label="Ordenar catálogo"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                >
                  <option value="match">Afinidad orientativa</option>
                  <option value="name">Marca y modelo</option>
                  <option value="spl">SPL declarado</option>
                  <option value="power">Potencia declarada</option>
                </select>
              </label>
              {speakerCategory && (
                <label>
                  Amplificación
                  <select
                    className="audit-input"
                    aria-label="Filtrar amplificación"
                    value={filterActive}
                    onChange={(e) =>
                      setFilterActive(e.target.value as FilterActive)
                    }
                  >
                    <option value="all">Activos y pasivos</option>
                    <option value="active">Activos</option>
                    <option value="passive">Pasivos</option>
                  </select>
                </label>
              )}
            </div>
          )}
        </section>

        <aside
          className="workspace-card gear-inventory"
          aria-label="Inventario seleccionado"
        >
          <div className="workspace-section-heading">
            <div>
              <p className="project-eyebrow">TU SELECCIÓN</p>
              <h2>
                {totalUnits} <span>unidades</span>
              </h2>
            </div>
            <button
              className="audit-button gear-inventory-toggle"
              type="button"
              aria-expanded={showInventory}
              aria-controls="gear-inventory-body"
              onClick={() => setShowInventory(!showInventory)}
            >
              {showInventory ? "Ocultar" : "Ver equipo"}
              <ChevronDown size={15} />
            </button>
            <Package className="gear-inventory-icon" size={22} />
          </div>
          <div
            id="gear-inventory-body"
            className="gear-inventory-body"
            data-expanded={showInventory}
          >
            <Link to="/pa" className="audit-button">
              Resumen PA <ArrowUpRight size={15} />
            </Link>
            {totalUnits === 0 ? (
              <p className="workspace-note">
                Agregá tu primer modelo desde el catálogo. Después podés ajustar
                sus unidades.
              </p>
            ) : (
              <div className="gear-inventory-groups">
                {TABS.filter((tab) => selectedMap[tab.id].length > 0).map(
                  (tab) => (
                    <section key={tab.id}>
                      <h3>{tab.label}</h3>
                      {selectedMap[tab.id].map((item) => (
                        <div className="gear-inventory-item" key={item.id}>
                          <span className="gear-inventory-qty">
                            {item.quantity ?? 1}×
                          </span>
                          <button
                            type="button"
                            className="gear-inventory-model"
                            aria-label={`Ver ${item.brand} ${item.model} en catálogo`}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setSearchQuery(item.model);
                              setFilterActive("all");
                            }}
                          >
                            <small>{item.brand}</small>
                            {item.model}
                          </button>
                          <button
                            type="button"
                            className="app-icon-button"
                            aria-label={`Quitar ${item.brand} ${item.model} del inventario`}
                            onClick={() => toggleGearItem(tab.id, item)}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </section>
                  ),
                )}
              </div>
            )}
            <Link to="/stage-map" className="audit-button">
              Ubicar en el plano <ArrowUpRight size={15} />
            </Link>
            {room && (
              <details className="gear-plan-disclosure">
                <summary>Vista del recinto</summary>
                <VenuePreview
                  room={room}
                  tops={tops}
                  subs={subs}
                  monitors={monitors}
                  layout={stageLayout}
                  grid={previewGrid}
                  plan={
                    <ProjectPlanPreview
                      room={room}
                      tops={tops}
                      subs={subs}
                      monitors={monitors}
                      layout={stageLayout}
                    />
                  }
                />
              </details>
            )}
            <p className="workspace-note">
              La ficha indica el estado de sus datos. La afinidad es orientativa
              y no valida el sistema.
            </p>
          </div>
        </aside>

        <section className="gear-catalog" aria-label="Modelos disponibles">
          <div className="workspace-section-heading">
            <div>
              <p className="project-eyebrow">CATÁLOGO</p>
              <h2>{activeTabConfig.label}</h2>
            </div>
            <span className="workspace-tag">{tabUnits} en selección</span>
          </div>
          <p className="workspace-note" role="status">
            {processedItems.length} modelos
            {searchQuery ? ` para “${searchQuery}”` : " disponibles"}
          </p>
          {processedItems.length === 0 ? (
            <div className="workspace-empty">
              <Search size={26} />
              <h2>Sin coincidencias</h2>
              <p>Probá con otra marca, modelo o amplificación.</p>
              <button
                type="button"
                className="audit-button"
                onClick={() => {
                  setSearchQuery("");
                  setFilterActive("all");
                }}
              >
                Restablecer búsqueda
              </button>
            </div>
          ) : (
            <div className="gear-catalog-list">
              {processedItems.map(({ item, score }) => (
                <GearCard
                  key={item.id}
                  item={item}
                  selected={isSelected(item)}
                  score={room ? score : null}
                  quantity={getQuantity(item)}
                  onToggle={() => toggleGearItem(activeTab, item)}
                  onQuantityChange={(qty) =>
                    setGearItemQuantity(activeTab, item.id, qty)
                  }
                  tabIcon={activeTabConfig.icon}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
