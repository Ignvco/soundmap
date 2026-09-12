import { AdvisorPanel } from "@/components/soundmap/advisor/advisor-widget.tsx";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { useAppStore } from "@/store/app.ts";

export default function AIAdvisor() {
  const { room, tops, subs, monitors } = useAppStore();
  return (
    <div className="v6-workspace">
      <header className="mb-6">
        <h1 className="v6-heading">AI Advisor</h1>
        <p className="text-xs text-muted-foreground mt-2">
          Recinto, acústica y sistema de sonido
        </p>
      </header>
      <div
        className={
          room
            ? "grid grid-cols-1 xl:grid-cols-2 gap-5 items-start"
            : "max-w-3xl"
        }
      >
        <AdvisorPanel embedded />
        {room && (
          <VenuePreview
            room={room}
            tops={tops}
            subs={subs}
            monitors={monitors}
          />
        )}
      </div>
    </div>
  );
}
