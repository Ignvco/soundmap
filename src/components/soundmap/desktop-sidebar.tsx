// Sidebar de escritorio — V6.
//
// Estructura del mockup: MAIN · ANALYZE · WORKSPACE, con estado de sincronización
// y Settings abajo. 200 px, sobre `--bg-secondary` para separarse del canvas.
//
// Tres decisiones que conviene dejar por escrito:
//
// 1. El activo usa `--accent-dim2` (acento al 6 %), no el `--accent-dim` al 12 %
//    que usábamos antes. El mockup es mucho más contenido: el ítem activo se
//    distingue sobre todo por el color del texto, no por un bloque verde.
//
// 2. Los iconos son Lucide, no los SVG dibujados a mano del mockup. La app usa
//    Lucide en ~40 archivos; una segunda familia rompería la coherencia que el
//    design system pide explícitamente.
//
// 3. El activo se deriva de la RUTA, nunca de un estado manual. Las rutas del
//    wizard (/room-scan, /gear-builder, /dsp, /channels) marcan "Design": un
//    solo activo, no cuatro.
import { NavLink, useLocation } from "react-router-dom";
import { useState, type ComponentType } from "react";
import {
  House, Sliders, Play, Activity, Waves, GitCompare, Map,
  Layers, Files, Wrench, Users, Settings as SettingsIcon,
  PanelLeftClose, PanelLeft, AudioWaveform,
} from "lucide-react";
import { feedback } from "@/lib/feedback.ts";
import { SyncIndicator } from "@/components/soundmap/sync-indicator.tsx";

interface Item {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  /** Rutas hijas que también marcan este ítem como activo. */
  match?: string[];
}

/** Navegación principal — el flujo del producto. */
const MAIN: Item[] = [
  { to: "/",        label: "Home",    icon: House },
  // Design es un FLUJO: el wizard arranca en /design y cada paso tiene ruta
  // propia. Los cuatro se resuelven a un único activo.
  { to: "/design",  label: "Design",  icon: Sliders,
    match: ["/room-scan", "/gear-builder", "/dsp", "/channels", "/design-wizard"] },
  { to: "/perform", label: "Perform", icon: Play, match: ["/live", "/kiosk"] },
];

/** Análisis — el grupo que el mockup separa y la app no tenía. */
const ANALYZE: Item[] = [
  // "SPL Analysis" es el nombre visual; la ruta sigue siendo /pa para no romper
  // bookmarks ni deep links existentes.
  { to: "/pa",                label: "SPL Analysis",      icon: Activity },
  { to: "/acoustic-analysis", label: "Acoustic Analysis", icon: Waves },
  { to: "/compare",           label: "Compare",           icon: GitCompare },
  { to: "/stage-map",         label: "Stage Map",         icon: Map },
];

/** Workspace — biblioteca y recursos. */
const WORKSPACE: Item[] = [
  { to: "/scenes",    label: "Scenes",    icon: Layers },
  { to: "/templates", label: "Templates", icon: Files },
  { to: "/toolkit",   label: "Toolkit",   icon: Wrench },
  { to: "/community", label: "Community", icon: Users },
];

function isActive(pathname: string, item: Item): boolean {
  if (item.to === "/") return pathname === "/";
  if (pathname === item.to || pathname.startsWith(item.to + "/")) return true;
  return (item.match ?? []).some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function Row({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={() => feedback("tap")}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      data-testid={`sidebar-${item.to.replace(/\//g, "") || "home"}`}
      className="group flex items-center gap-2.5 h-8 px-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderRadius: "var(--radius-chip)",
        background: active ? "var(--accent-dim2)" : "transparent",
        color: active ? "var(--accent)" : "var(--muted-foreground)",
        transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = "var(--secondary-foreground)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = "var(--muted-foreground)"; }}
    >
      <Icon size={15} strokeWidth={1.5} />
      {!collapsed && <span className="text-[13px] tracking-[-0.005em] truncate">{item.label}</span>}
      {/* El activo también lleva un punto: accesibilidad pide no depender
          únicamente del color para indicar selección. */}
      {active && !collapsed && (
        <span
          className="ml-auto h-1 w-1 rounded-full shrink-0"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
      )}
    </NavLink>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p
      className="text-[10px] uppercase px-2 pt-4 pb-1.5 select-none"
      style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}
    >
      {children}
    </p>
  );
}

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const groups: { label: string | null; items: Item[] }[] = [
    { label: null,        items: MAIN },
    { label: "Analyze",   items: ANALYZE },
    { label: "Workspace", items: WORKSPACE },
  ];

  return (
    <aside
      aria-label="Navegación principal"
      data-testid="desktop-sidebar"
      className="hidden md:flex flex-col shrink-0 h-full"
      style={{
        width: collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)",
        background: "var(--sidebar)",
        borderRight: "1px solid var(--border)",
        transition: "width var(--dur) var(--ease)",
      }}
    >
      {/* Marca */}
      <div
        className="h-14 flex items-center gap-2 px-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <AudioWaveform size={17} strokeWidth={1.75} style={{ color: "var(--accent)" }} className="shrink-0" />
        {!collapsed && (
          <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground truncate">
            SoundMap
          </span>
        )}
      </div>

      {/* Navegación con scroll propio: el shell de la Fase 2 ya no scrollea. */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 pb-3 no-scrollbar">
        {groups.map((g, i) => (
          <div key={g.label ?? `main-${i}`}>
            {g.label && !collapsed && <GroupLabel>{g.label}</GroupLabel>}
            {g.label && collapsed && (
              <div className="h-px my-2 mx-1" style={{ background: "var(--border-subtle)" }} aria-hidden="true" />
            )}
            <div className={g.label ? "" : "pt-3"}>
              {g.items.map((it) => (
                <Row key={it.to} item={it} active={isActive(pathname, it)} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Pie: sincronización, ajustes y colapso */}
      <div className="px-2 py-2 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        {!collapsed && (
          <div className="px-2 pb-2">
            <SyncIndicator showLabel />
          </div>
        )}

        <Row
          item={{ to: "/settings", label: "Settings", icon: SettingsIcon }}
          active={isActive(pathname, { to: "/settings", label: "Settings", icon: SettingsIcon })}
          collapsed={collapsed}
        />

        <button
          onClick={() => { feedback("tap"); setCollapsed((c) => !c); }}
          aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
          aria-expanded={!collapsed}
          data-testid="sidebar-toggle"
          className="w-full flex items-center gap-2.5 h-8 px-2 mt-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderRadius: "var(--radius-chip)",
            color: "var(--muted-foreground)",
            transition: "color var(--dur-fast) var(--ease)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "var(--secondary-foreground)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
        >
          {collapsed ? <PanelLeft size={15} strokeWidth={1.5} /> : <PanelLeftClose size={15} strokeWidth={1.5} />}
          {!collapsed && <span className="text-[12px]">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
