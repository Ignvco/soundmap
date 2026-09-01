import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import { useServiceWorker } from "@/hooks/use-service-worker.ts";
import { DefaultProviders } from "./components/providers/default.tsx";
import { AppShellV5 } from "./components/soundmap/app-shell-v5.tsx";
import { GuidedTour } from "./components/soundmap/guided-tour.tsx";
import { ErrorBoundary } from "./components/soundmap/error-boundary.tsx";
import { RouteFallback } from "./components/soundmap/route-fallback.tsx";
import { primeAudio } from "./lib/feedback.ts";
import "./i18n.ts";

// ── Code splitting ───────────────────────────────────────────────────────────
// Antes TODAS las rutas se importaban de forma estática: el bundle era un solo
// chunk de ~3.2 MB, así que abrir la home descargaba también Three.js (stage-map
// 3D), jsPDF + html2canvas (export) y Recharts (compare). Ahora cada pantalla
// baja recién cuando se navega a ella.
//
// AIHome queda estática a propósito: es la ruta de entrada, y hacerla lazy sólo
// agrega un salto de spinner en el arranque sin ahorrar nada.
import AIHome from "./pages/ai-home/index.tsx";

const DesignWizard   = lazy(() => import("./pages/design-wizard/index.tsx"));
const PerformHub     = lazy(() => import("./pages/perform-hub/index.tsx"));
const StageMap       = lazy(() => import("./pages/stage-map/index.tsx"));      // three.js
const ExportPage     = lazy(() => import("./pages/export-page/index.tsx"));    // jspdf
const SceneCompare   = lazy(() => import("./pages/compare/index.tsx"));        // recharts
const Live           = lazy(() => import("./pages/live/index.tsx"));
const PA             = lazy(() => import("./pages/pa/index.tsx"));
const Scenes         = lazy(() => import("./pages/scenes/index.tsx"));
const Settings       = lazy(() => import("./pages/settings/index.tsx"));
const PAToolkit      = lazy(() => import("./pages/toolkit/index.tsx"));
const Templates      = lazy(() => import("./pages/templates/index.tsx"));
const CommunityGear  = lazy(() => import("./pages/community-gear/index.tsx"));
const KioskPage      = lazy(() => import("./pages/kiosk/index.tsx"));
const SharedScenePage = lazy(() => import("./pages/shared/index.tsx"));
const SharedDspPage  = lazy(() => import("./pages/shared-dsp/index.tsx"));
const AuthCallback   = lazy(() => import("./pages/auth/Callback.tsx"));
const NotFound       = lazy(() => import("./pages/NotFound.tsx"));
// Showcase del design system: la fuente visual de verdad. Es una herramienta
// interna, así que va lazy y no aparece en la navegación.
const DesignSystem   = lazy(() => import("./pages/design-system/index.tsx"));

function AppLayout() {
  // Prime the AudioContext on first user interaction
  useEffect(() => {
    const prime = () => {
      primeAudio();
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
    window.addEventListener("pointerdown", prime, { once: true });
    window.addEventListener("keydown", prime, { once: true });
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  return (
    <AppShellV5>
      <Outlet />
      <GuidedTour />
    </AppShellV5>
  );
}

export default function App() {
  useServiceWorker();
  return (
    <DefaultProviders>
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/shared/:token" element={<SharedScenePage />} />
              <Route path="/shared/dsp" element={<SharedDspPage />} />
              <Route path="/kiosk" element={<KioskPage />} />
              <Route element={<AppLayout />}>
                <Route path="/" element={<AIHome />} />
                {/* /legacy eliminada: era la home v4 (671 líneas) que la v5
                    reemplazó. Ya nada la enlazaba, pero era el ÚNICO camino a
                    /pa y /templates — por eso primero les di casa (Perform Hub
                    y el paso de recinto) y recién después se borró. Se deja el
                    redirect para no romper enlaces guardados. */}
                <Route path="/legacy" element={<Navigate to="/" replace />} />
                <Route path="/design" element={<DesignWizard />} />
                <Route path="/design-wizard" element={<Navigate to="/design" replace />} />
                <Route path="/perform" element={<PerformHub />} />
                {/* Legacy standalone editors → redirected into the wizard */}
                <Route path="/analyze" element={<Navigate to="/compare" replace />} />
                <Route path="/room-scan" element={<Navigate to="/design?step=room" replace />} />
                <Route path="/gear-builder" element={<Navigate to="/design?step=pa" replace />} />
                <Route path="/dsp" element={<Navigate to="/design?step=dsp" replace />} />
                <Route path="/channels" element={<Navigate to="/design?step=patch" replace />} />
                <Route path="/export-page" element={<Navigate to="/design?step=save" replace />} />
                <Route path="/library" element={<Navigate to="/scenes" replace />} />
                <Route path="/pa" element={<PA />} />
                <Route path="/stage-map" element={<StageMap />} />
                <Route path="/live" element={<Live />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/scenes" element={<Scenes />} />
                <Route path="/compare" element={<SceneCompare />} />
                <Route path="/community" element={<CommunityGear />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/toolkit" element={<PAToolkit />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/design-system" element={<DesignSystem />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </DefaultProviders>
  );
}
