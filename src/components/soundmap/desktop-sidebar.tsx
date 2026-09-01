// Sidebar de escritorio.
//
// El shell v5 la había eliminado ("The sidebar is GONE") y movido toda la
// navegación al Command Palette. El rediseño la trae de vuelta, pero con otra
// intención: no es un menú que domina, es una guía discreta que se puede
// colapsar. En móvil no se renderiza — ahí manda el BottomNav.
//
// Estructura del mockup:
//   Home · Design · Perform · Analyze
//   ── WORKSPACE ──
//   Scenes · Templates · Toolkit · Community
//   ── (empuje al fondo) ──
//   Settings · cuenta
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Compass, Radio, BarChart3, Layers, LayoutTemplate,
  Calculator, Users, Settings as SettingsIcon, PanelLeftClose, PanelLeft,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { feedback } from "@/lib/feedback.ts";
import { useAppStore } from "@/store/app.ts";

interface Item {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  /** Prefijos extra que también marcan este ítem como activo. */
  match?: string[];
}

const PRIMARY: Item[] = [
  { to: "/",        label: "Home",    icon: Home },
  { to: "/design",  label: "Design",  icon: Compass, match: ["/room-scan", "/gear-builder", "/dsp", "/channels"] },
  { to: "/perform", label: "Perform", icon: Radio,   match: ["/live", "/kiosk", "/pa"] },
  { to: "/compare", label: "Analyze", icon: BarChart3, match: ["/stage-map", "/export"] },
];

const WORKSPACE: Item[] = [
  { to: "/scenes",    label: "Scenes",    icon: Layers },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/toolkit",   label: "Toolkit",   icon: Calculator },
  { to: "/community", label: "Community", icon: Users },
];

function isActive(pathname: string, item: Item): boolean {
  if (item.to === "/") return pathname === "/";
  if (pathname === item.to || pathname.startsWith(item.to + "/")) return true;
  return (item.match ?? []).some((m) => pathname.startsWith(m));
}

function Row({ item, active, collapsed }: { item: Item; active: boolean; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      onClick={() => feedback("tap")}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      data-testid={`sidebar-${item.label.toLowerCase()}`}
      className="group flex items-center gap-3 h-9 px-2.5 cursor-pointer"
      style={{
        borderRadius: "var(--radius-control)",
        background: active ? "var(--surface-3)" : "transparent",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
      }}
    >
      <Icon size={16} strokeWidth={1.75} />
      {!collapsed && (
        <span className="text-[13px] font-medium tracking-[-0.01em] truncate">{item.label}</span>
      )}
      {/* Marca de activo: una barra de 2px, no un bloque verde. El acento se
          reserva para lo que de verdad lo necesita. */}
      {active && !collapsed && (
        <span
          className="ml-auto h-4 w-[2px] rounded-full shrink-0"
          style={{ background: "var(--accent)" }}
          aria-hidden="true"
        />
      )}
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const scenes = useAppStore((s) => s.scenes);

  const w = collapsed ? "var(--sidebar-w-collapsed)" : "var(--sidebar-w)";

  return (
    <aside
      aria-label="Navegación principal"
      data-testid="desktop-sidebar"
      className="hidden md:flex flex-col shrink-0 h-[100dvh] sticky top-0"
      style={{
        width: w,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "width var(--dur) var(--ease)",
      }}
    >
      {/* Marca */}
      <div className="h-16 flex items-center gap-2.5 px-4 shrink-0">
        <svg width="20" height="14" viewBox="0 0 28 18" aria-hidden="true" className="shrink-0">
          <path
            d="M1 9h3l2.5-7 3 14 3-11 2.5 8 2-4h10"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {!collapsed && (
          <span className="text-[13px] font-semibold tracking-[0.14em] uppercase text-foreground truncate">
            SoundMap
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 no-scrollbar">
        <div className="space-y-0.5">
          {PRIMARY.map((it) => (
            <Row key={it.to} item={it} active={isActive(pathname, it)} collapsed={collapsed} />
          ))}
        </div>

        <div className="my-4 px-2.5">
          {collapsed ? (
            <div className="h-px" style={{ background: "var(--border-subtle)" }} />
          ) : (
            <p className="text-[10px] font-medium uppercase tracking-[0.18em]"
               style={{ color: "var(--muted-foreground)" }}>
              Workspace
            </p>
          )}
        </div>

        <div className="space-y-0.5">
          {WORKSPACE.map((it) => (
            <Row key={it.to} item={it} active={isActive(pathname, it)} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className="px-2.5 pb-3 shrink-0 space-y-0.5">
        <div className="h-px mb-3 mx-2.5" style={{ background: "var(--border-subtle)" }} />
        <Row
          item={{ to: "/settings", label: "Settings", icon: SettingsIcon }}
          active={isActive(pathname, { to: "/settings", label: "Settings", icon: SettingsIcon })}
          collapsed={collapsed}
        />

        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 h-11 mt-1">
            <span
              className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
              style={{ background: "var(--surface-3)", color: "var(--muted-foreground)" }}
              aria-hidden="true"
            >
              LP
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-foreground truncate leading-tight">LevelPro Audio</p>
              <p className="text-[10px] truncate" style={{ color: "var(--muted-foreground)" }}>
                {scenes.length} {scenes.length === 1 ? "escena" : "escenas"}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={() => { feedback("tap"); setCollapsed((c) => !c); }}
          aria-label={collapsed ? "Expandir navegación" : "Colapsar navegación"}
          data-testid="sidebar-toggle"
          className="w-full flex items-center gap-3 h-9 px-2.5 cursor-pointer"
          style={{
            borderRadius: "var(--radius-control)",
            color: "var(--muted-foreground)",
            transition: "color var(--dur-fast) var(--ease)",
          }}
        >
          {collapsed ? <PanelLeft size={16} strokeWidth={1.75} /> : <PanelLeftClose size={16} strokeWidth={1.75} />}
          {!collapsed && <span className="text-[12px]">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
