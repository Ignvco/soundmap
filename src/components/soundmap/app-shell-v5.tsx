// AppShell v6 — chrome mínimo con navegación en dos registros.
//
// Escritorio: sidebar discreta y colapsable (Home · Design · Perform · Analyze,
// luego Workspace, luego Settings). Móvil: BottomNav con el "+" central como
// acción principal. NO es el escritorio reducido — son dos diseños distintos
// para dos contextos distintos, como pide el rediseño.
//
// La v5 había eliminado la sidebar y dejado toda la navegación en el Command
// Palette (⌘K). Se conserva el palette como atajo de teclado, pero ya no es el
// único camino: en escritorio, esconder la navegación detrás de un atajo la
// vuelve invisible para quien no lo conoce.
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Command as CommandIcon, ArrowLeft } from "lucide-react";
import { CommandPalette } from "@/components/soundmap/command-palette.tsx";
import { BottomNav } from "@/components/soundmap/bottom-nav.tsx";
import { DesktopSidebar } from "@/components/soundmap/desktop-sidebar.tsx";
import { SyncIndicator } from "@/components/soundmap/sync-indicator.tsx";
import { AdvisorWidget } from "@/components/soundmap/advisor/advisor-widget.tsx";
import { ErrorBoundary } from "@/components/soundmap/error-boundary.tsx";
import { feedback } from "@/lib/feedback.ts";

interface Props {
  children: ReactNode;
}

export function AppShellV5({ children }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  // Listen to ⌘K global event dispatched by CommandPalette module
  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener("soundmap:openpalette", open);
    return () => window.removeEventListener("soundmap:openpalette", open);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex">
      <DesktopSidebar />

      <div className="flex-1 min-w-0 relative overflow-x-hidden">
      {/* Top-nav — invisible on home, minimal on subpages */}
      {!isHome && (
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-white/[0.04] pt-safe-0"
        >
          <div className="max-w-[1400px] mx-auto flex items-center justify-between px-5 md:px-8 h-14">
            <Link
              to="/"
              onClick={() => feedback("tap")}
              data-testid="shell-home"
              className="md:hidden flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              style={{ transition: "color 0.3s ease" }}
            >
              <ArrowLeft size={13} strokeWidth={1.75} />
              <span>SoundMap</span>
            </Link>
            <div className="flex items-center gap-3">
              <SyncIndicator showLabel={false} />
              <button
                onClick={() => { feedback("tap"); setPaletteOpen(true); }}
                data-testid="shell-cmd-btn"
                className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-white/[0.03] hover:bg-white/[0.06] text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
                style={{ transition: "background-color 0.3s ease, color 0.3s ease" }}
              >
                <CommandIcon size={12} strokeWidth={1.75} />
                <kbd className="text-[10px] font-mono">⌘K</kbd>
              </button>
            </div>
          </div>
        </motion.header>
      )}

      {/* Home nav — global palette button top-right */}
      {isHome && (
        <div className="fixed right-5 md:right-8 z-30 flex items-center gap-3" style={{ top: "max(1.25rem, env(safe-area-inset-top))" }}>
          <SyncIndicator showLabel={false} />
          <button
            onClick={() => { feedback("tap"); setPaletteOpen(true); }}
            data-testid="shell-cmd-btn"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.07] text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
            style={{ transition: "background-color 0.3s ease, color 0.3s ease" }}
          >
            <CommandIcon size={12} strokeWidth={1.75} />
            <kbd className="text-[10px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Reserva calculada para el BottomNav fijo (ver --sm-bottom-nav en
          index.css). El pb-24 anterior era 96px fijos y se quedaba corto en
          teléfonos con home indicator, cortando el último bloque de cada
          pantalla. */}
      {/* En escritorio no hay BottomNav, así que no hace falta reservar su alto. */}
      <main className="relative pb-bottom-nav md:pb-10">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      {location.pathname !== "/ai-advisor" && <AdvisorWidget />}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <div className="md:hidden">
        <BottomNav />
      </div>
      </div>
    </div>
  );
}
