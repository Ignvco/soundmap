// Acoustic Analysis — marcador de posición.
//
// El mockup V6 tiene esta pantalla en el grupo ANALYZE, pero la app todavía no
// la implementa. La Fase 3 registra ÚNICAMENTE la ruta para que la navegación
// quede completa; la pantalla real se construye en la fase Analyze, sobre los
// motores existentes (`acoustics`, `modal-eq`, `early-reflections`).
//
// Deliberadamente NO muestra datos: nada de RT60 inventado ni gráficos de
// relleno. Un placeholder honesto es mejor que uno que finge funcionar.
import { useNavigate } from "react-router-dom";
import { Waves } from "lucide-react";
import { ScreenShell, EmptyState } from "@/components/soundmap/vitals/index.tsx";
import { Button } from "@/components/soundmap/vitals/controls.tsx";
import { feedback } from "@/lib/feedback.ts";

export default function AcousticAnalysis() {
  const navigate = useNavigate();

  return (
    <ScreenShell className="pt-10" data-testid="acoustic-analysis">
      <EmptyState
        icon={<Waves size={18} strokeWidth={1.75} />}
        title="Acoustic Analysis"
        description="Esta pantalla está en construcción. Por ahora, el RT60, los modos de sala y las reflexiones tempranas se calculan dentro del escaneo de recinto."
        action={
          <Button
            variant="primary"
            pill
            onClick={() => { feedback("tap"); navigate("/design?step=room"); }}
            data-testid="acoustic-goto-room"
          >
            Ir al escaneo de recinto
          </Button>
        }
      />
    </ScreenShell>
  );
}
