import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AudioLines, Search, Sparkles } from "lucide-react";
import { CommandPalette } from "@/components/soundmap/command-palette.tsx";
import { BottomNav } from "@/components/soundmap/bottom-nav.tsx";
import { DesktopSidebar } from "@/components/soundmap/desktop-sidebar.tsx";
import { AdvisorWidget } from "@/components/soundmap/advisor/advisor-widget.tsx";
import { ErrorBoundary } from "@/components/soundmap/error-boundary.tsx";
import { feedback } from "@/lib/feedback.ts";

export function AppShellV5({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  useEffect(() => {
    const open = () => setPaletteOpen(true);
    window.addEventListener("soundmap:openpalette", open);
    return () => window.removeEventListener("soundmap:openpalette", open);
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <div className="app-shell min-h-[100dvh] bg-background text-foreground flex">
      <DesktopSidebar />
      <div className="flex-1 min-w-0 relative">
        <header className="app-topbar">
          <div className="app-topbar-inner">
            <Link
              to="/"
              data-testid="shell-home"
              className="app-brand"
              onClick={() => feedback("tap")}
            >
              <AudioLines size={21} className="text-accent" strokeWidth={1.6} />
              <span>
                SoundMap<span className="text-accent">.</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                to="/ai-advisor"
                className="app-icon-button lg:hidden"
                aria-label="Abrir AI Advisor"
              >
                <Sparkles size={18} />
              </Link>
              <button
                onClick={() => {
                  feedback("tap");
                  setPaletteOpen(true);
                }}
                data-testid="shell-cmd-btn"
                className="app-icon-button"
                aria-label="Buscar pantallas y acciones"
              >
                <Search size={18} strokeWidth={1.7} />
                <kbd className="hidden lg:inline text-[11px] font-mono ml-2">
                  ⌘K
                </kbd>
              </button>
            </div>
          </div>
        </header>
        <main className="app-content">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        {location.pathname !== "/ai-advisor" && (
          <div className="hidden lg:block">
            <AdvisorWidget />
          </div>
        )}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
        />
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
