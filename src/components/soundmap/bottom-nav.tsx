import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Compass,
  Plus,
  Radio,
  GitCompareArrows,
  Layers,
  Users,
  Settings as SettingsIcon,
  Maximize2,
  Calculator,
  FileText,
  Box,
  Activity,
  Waves,
  Sparkles,
  LayoutTemplate,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet.tsx";
import { feedback } from "@/lib/feedback.ts";

const TABS = [
  {
    id: "home",
    labelKey: "nav.tab_home",
    icon: Home,
    path: "/",
    match: (p: string) => p === "/",
  },
  {
    id: "design",
    labelKey: "nav.tab_design",
    icon: Compass,
    path: "/design",
    match: (p: string) =>
      p.startsWith("/design") ||
      p.startsWith("/room-scan") ||
      p.startsWith("/gear-builder") ||
      p.startsWith("/dsp") ||
      p.startsWith("/channels") ||
      p.startsWith("/pa") ||
      p.startsWith("/toolkit") ||
      p.startsWith("/templates"),
  },
  {
    id: "perform",
    labelKey: "nav.tab_perform",
    icon: Radio,
    path: "/perform",
    match: (p: string) =>
      p.startsWith("/perform") ||
      p.startsWith("/live") ||
      p.startsWith("/kiosk"),
  },
  {
    id: "analyze",
    labelKey: "nav.tab_analyze",
    icon: GitCompareArrows,
    path: "/compare",
    match: (p: string) =>
      p.startsWith("/compare") ||
      p.startsWith("/analyze") ||
      p.startsWith("/stage-map") ||
      p.startsWith("/spl-analysis") ||
      p.startsWith("/acoustic-analysis") ||
      p.startsWith("/export"),
  },
];

const QUICK_ACTIONS = [
  {
    id: "kiosk",
    labelKey: "nav.kiosk",
    hintKey: "nav.kiosk_hint",
    icon: Maximize2,
    path: "/kiosk",
  },
  {
    id: "toolkit",
    labelKey: "nav.toolkit",
    hintKey: "nav.toolkit_hint",
    icon: Calculator,
    path: "/toolkit",
  },
  {
    id: "export",
    labelKey: "nav.export",
    hintKey: "nav.export_hint",
    icon: FileText,
    path: "/export",
  },
  {
    id: "scenes",
    labelKey: "nav.scenes",
    hintKey: "nav.scenes_hint",
    icon: Layers,
    path: "/scenes",
  },
  {
    id: "community",
    labelKey: "nav.community",
    hintKey: "nav.community_hint",
    icon: Users,
    path: "/community",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    hintKey: "nav.settings_hint",
    icon: SettingsIcon,
    path: "/settings",
  },
];

const ANALYSIS_ACTIONS = [
  { id: "stage", label: "Stage Map", icon: Box, path: "/stage-map" },
  { id: "spl", label: "SPL Analysis", icon: Activity, path: "/spl-analysis" },
  {
    id: "acoustic",
    label: "Acústica",
    icon: Waves,
    path: "/acoustic-analysis",
  },
  { id: "advisor", label: "AI Advisor", icon: Sparkles, path: "/ai-advisor" },
  {
    id: "templates",
    label: "Templates",
    icon: LayoutTemplate,
    path: "/templates",
  },
  { id: "live", label: "Operación en vivo", icon: Radio, path: "/live" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const actions = [
    ...QUICK_ACTIONS.map((action) => ({
      ...action,
      label: t(action.labelKey),
    })),
    ...ANALYSIS_ACTIONS,
  ];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <nav
        data-testid="bottom-nav"
        aria-label="Navegación principal"
        className="mobile-nav"
      >
        <div className="mobile-nav-inner">
          {TABS.slice(0, 2).map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              active={tab.match(location.pathname)}
            />
          ))}
          <SheetTrigger asChild>
            <button
              data-testid="bottom-nav-fab"
              className="mobile-nav-add"
              aria-label={t("nav.quick_actions")}
              onClick={() => feedback("select")}
            >
              <Plus size={23} strokeWidth={1.8} />
            </button>
          </SheetTrigger>
          {TABS.slice(2).map((tab) => (
            <NavTab
              key={tab.id}
              tab={tab}
              active={tab.match(location.pathname)}
            />
          ))}
        </div>
      </nav>
      <SheetContent
        side="bottom"
        className="mobile-menu"
        data-testid="bottom-nav-fab-sheet"
      >
        <SheetHeader className="px-0 pt-0 pb-2">
          <SheetTitle>{t("nav.quick_actions")}</SheetTitle>
          <SheetDescription>
            Tu sistema, tus escenas y herramientas.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {actions.map(({ id, label, icon: Icon, path }) => (
            <button
              key={id}
              data-testid={`fab-action-${id}`}
              className="mobile-menu-action"
              onClick={() => {
                feedback("tap");
                setOpen(false);
                navigate(path);
              }}
            >
              <Icon
                size={19}
                strokeWidth={1.6}
                className="shrink-0 text-accent"
              />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
function NavTab({
  tab,
  active,
}: {
  tab: (typeof TABS)[number];
  active: boolean;
}) {
  const { t } = useTranslation();
  const Icon = tab.icon;
  return (
    <Link
      to={tab.path}
      onClick={() => feedback("tap")}
      aria-current={active ? "page" : undefined}
      data-testid={`bottom-nav-${tab.id}`}
      className="mobile-nav-tab"
    >
      <Icon size={20} strokeWidth={active ? 2 : 1.6} />
      <span>{t(tab.labelKey)}</span>
    </Link>
  );
}
