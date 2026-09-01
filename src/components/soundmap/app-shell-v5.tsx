// AppShell — layout raíz V6.
//
// ── Modelo de scroll ────────────────────────────────────────────────────────
// El cambio estructural de esta fase. Antes el shell era `min-h-[100dvh]` y el
// scroll ocurría en el documento: la barra superior era `sticky` y el chrome se
// movía junto al contenido.
//
// V6 es un layout de aplicación: el shell ocupa exactamente el viewport
// (`h-[100dvh] overflow-hidden`) y el scroll vive DENTRO del área de contenido.
// El chrome —sidebar y cabecera— queda fijo por estructura, no por `sticky`.
// Eso es lo que separa "un sitio con barra pegajosa" de "una aplicación".
//
// En móvil se conserva el scroll de documento y el BottomNav: en un teléfono,
// un contenedor de altura fija pelea con la barra de direcciones del navegador
// y con el teclado virtual. Mismo lenguaje visual, distinta composición.
//
// ── Navegación ──────────────────────────────────────────────────────────────
// La sidebar y el BottomNav actuales se conservan SIN CAMBIOS (corresponden a
// la Fase 3). Esta fase sólo adapta el contenedor que los sostiene.
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
    <div className="min-h-[100dvh] md:h-[100dvh] md:overflow-hidden bg-background text-foreground flex">
      <DesktopSidebar />

      {/* Columna de contenido: en escritorio es una columna flex de altura fija
          para que el scroll ocurra en <main>; en móvil fluye normalmente. */}
      <div className="flex-1 min-w-0 relative overflow-x-hidden md:h-full md:flex md:flex-col">
      {/* Top-nav — invisible on home, minimal on subpages */}
      {!isHome && (
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="sticky top-0 md:static z-30 backdrop-blur-xl md:backdrop-blur-none bg-background/70 md:bg-background pt-safe-0 shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {/* 28px de padding lateral y 56px de alto: las proporciones del
              mockup. Sin `max-w` centrado — en V6 el contenido arranca en el
              borde de la sidebar, no flota en el medio de la pantalla. */}
          <div className="flex items-center justify-between px-5 md:px-7 h-14">
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
                className="inline-flex items-center gap-2 px-3 h-8 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
                style={{
                  borderRadius: "var(--radius-control)",
                  background: "var(--surface-1)",
                  boxShadow: "0 0 0 1px var(--border)",
                  transition: "color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
                }}
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
            className="inline-flex items-center gap-2 h-8 px-3 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
            style={{
              borderRadius: "var(--radius-control)",
              background: "var(--surface-1)",
              boxShadow: "0 0 0 1px var(--border)",
              transition: "color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
            }}
          >
            <CommandIcon size={12} strokeWidth={1.75} />
            <kbd className="text-[10px] font-mono">⌘K</kbd>
          </button>
        </div>
      )}

      {/* Área de contenido.
          Móvil: reserva el alto del BottomNav (ver --sm-bottom-nav) y deja que
          el documento scrollee.
          Escritorio: `flex-1 overflow-y-auto` — es ESTE elemento el que
          scrollea, no la ventana. Las pantallas pueden así fijar sus propias
          toolbars con `sticky top-0` sin pelear con el chrome global. */}
      <main className="relative pb-bottom-nav md:pb-0 md:flex-1 md:min-h-0 md:overflow-y-auto">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>

      <AdvisorWidget />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <div className="md:hidden">
        <BottomNav />
      </div>
      </div>
    </div>
  );
}
