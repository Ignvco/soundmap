// SoundMap Bottom Navigation — persistent 5-tab mobile-first shell.
// Layout: [Inicio] [Diseño] [ + FAB ] [Perform] [Analiz]. The FAB opens a
// quick-actions sheet with the less-used destinations (Kiosk, Community,
// Scenes, Settings) so the nav stays lean.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Home, Compass, Plus, Radio, GitCompareArrows, Layers, Users, Settings as SettingsIcon, Maximize2, Calculator, FileText, X } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";

const TABS = [
  { id: "home",    labelKey: "nav.tab_home",    icon: Home,    path: "/",         match: (p: string) => p === "/" },
  { id: "design",  labelKey: "nav.tab_design",  icon: Compass, path: "/design",   match: (p: string) => p.startsWith("/design") || p.startsWith("/room-scan") || p.startsWith("/gear-builder") || p.startsWith("/dsp") || p.startsWith("/channels") || p.startsWith("/pa") || p.startsWith("/toolkit") || p.startsWith("/templates") },
  { id: "perform", labelKey: "nav.tab_perform", icon: Radio,   path: "/perform",  match: (p: string) => p.startsWith("/perform") || p.startsWith("/live") || p.startsWith("/kiosk") },
  { id: "analyze", labelKey: "nav.tab_analyze", icon: GitCompareArrows, path: "/compare", match: (p: string) => p.startsWith("/compare") || p.startsWith("/analyze") || p.startsWith("/stage-map") || p.startsWith("/spl-analysis") || p.startsWith("/acoustic-analysis") || p.startsWith("/export") },
];

const QUICK_ACTIONS = [
  { id: "kiosk",     labelKey: "nav.kiosk",     hintKey: "nav.kiosk_hint",     icon: Maximize2,    path: "/kiosk" },
  { id: "toolkit",   labelKey: "nav.toolkit",   hintKey: "nav.toolkit_hint",   icon: Calculator,   path: "/toolkit" },
  { id: "export",    labelKey: "nav.export",    hintKey: "nav.export_hint",    icon: FileText,     path: "/export" },
  { id: "scenes",    labelKey: "nav.scenes",    hintKey: "nav.scenes_hint",    icon: Layers,       path: "/scenes" },
  { id: "community", labelKey: "nav.community", hintKey: "nav.community_hint", icon: Users,        path: "/community" },
  { id: "settings",  labelKey: "nav.settings",  hintKey: "nav.settings_hint",  icon: SettingsIcon, path: "/settings" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [fabOpen, setFabOpen] = useState(false);

  // Cerrar el sheet con Escape — antes sólo se podía tocando el backdrop.
  useEffect(() => {
    if (!fabOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFabOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fabOpen]);

  return (
    <>
      <nav
        data-testid="bottom-nav"
        aria-label="Navegación principal"
        className="fixed bottom-0 inset-x-0 z-40 pb-safe"
        style={{
          background: "rgba(15, 15, 18, 0.85)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 items-center px-2 py-2">
          {TABS.slice(0, 2).map(tab => (
            <NavTab key={tab.id} tab={tab} active={tab.match(location.pathname)} />
          ))}

          {/* Central FAB */}
          <div className="flex justify-center">
            <button
              onClick={() => { feedback("select"); setFabOpen(true); }}
              data-testid="bottom-nav-fab"
              aria-label={t("nav.quick_actions")}
              className="h-14 w-14 rounded-full flex items-center justify-center cursor-pointer -mt-6"
              style={{
                background: "var(--sm-accent)",
                color: "var(--background)",
                boxShadow: "0 12px 32px -8px rgba(201,240,62,0.45), 0 0 0 6px rgba(9,9,11,0.9)",
                transition: "transform 0.2s ease",
              }}
              onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
              onPointerUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onPointerCancel={(e) => (e.currentTarget.style.transform = "scale(1)")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              <Plus size={22} strokeWidth={2.5} />
            </button>
          </div>

          {TABS.slice(2).map(tab => (
            <NavTab key={tab.id} tab={tab} active={tab.match(location.pathname)} />
          ))}
        </div>
      </nav>

      {/* Quick actions sheet */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end justify-center"
            onClick={() => setFabOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.quick_actions")}
            data-testid="bottom-nav-fab-sheet"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-[26px] p-6 pb-10"
              style={{
                background: "#131316",
                boxShadow: "0 -20px 60px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground">
                  {t("nav.quick_actions")}
                </p>
                <button
                  onClick={() => setFabOpen(false)}
                  aria-label={t("nav.close")}
                  data-testid="bottom-nav-fab-close"
                  className="h-8 w-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <X size={13} className="text-muted-foreground" strokeWidth={1.75} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {QUICK_ACTIONS.map(action => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => { feedback("tap"); setFabOpen(false); navigate(action.path); }}
                      data-testid={`fab-action-${action.id}`}
                      className="text-left rounded-xl px-4 py-3.5 flex items-center gap-3 cursor-pointer"
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(201,240,62,0.15)", color: "var(--sm-accent)" }}
                      >
                        <Icon size={14} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{t(action.labelKey)}</p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t(action.hintKey)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NavTab({ tab, active }: { tab: typeof TABS[number]; active: boolean }) {
  const { t } = useTranslation();
  const Icon = tab.icon;
  return (
    <Link
      to={tab.path}
      onClick={() => feedback("tap")}
      aria-current={active ? "page" : undefined}
      data-testid={`bottom-nav-${tab.id}`}
      className="flex flex-col items-center gap-0.5 py-1 cursor-pointer"
      style={{
        color: active ? "var(--sm-accent)" : "var(--muted-foreground)",
        transition: "color 0.3s ease",
      }}
    >
      <Icon size={19} strokeWidth={active ? 2.25 : 1.75} />
      <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
    </Link>
  );
}
