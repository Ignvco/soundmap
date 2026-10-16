import { PremiumShell } from "@/components/soundmap/premium";
import { ManagementNav } from "@/components/soundmap/management-nav";
import { AdvisorPanel } from "@/components/soundmap/advisor/advisor-widget.tsx";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { useAppStore } from "@/store/app.ts";

export default function AIAdvisor() {
  const { stageLayout, room, tops, subs, monitors } = useAppStore();
  return (
    <PremiumShell
      title="Asesor de sonido"
      eyebrow="GESTIÓN"
      subtitle="Consulta el proyecto activo y revisa el origen de cada respuesta."
      data-testid="glow-advisor"
    >
      <ManagementNav />
      <p className="workspace-note mb-4">
        Sin servicio remoto autenticado, SoundMap responde con reglas locales.
        Las recomendaciones requieren tu revisión antes de aplicarse.
      </p>
      <div
        className={
          room
            ? "grid grid-cols-1 xl:grid-cols-2 gap-5 items-start"
            : "max-w-3xl"
        }
      >
        <AdvisorPanel embedded />
        {room && (
          <div className="hidden xl:block">
            <VenuePreview
              layout={stageLayout}
              room={room}
              tops={tops}
              subs={subs}
              monitors={monitors}
            />
          </div>
        )}
      </div>
    </PremiumShell>
  );
}
