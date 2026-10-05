import {
  createReport,
  downloadData,
  formatMetric,
  reportMarkdown,
  type AuditReport,
} from "@/lib/audit/report";
import { hasUnsavedRevision, useAppStore } from "@/store/app";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
export default function ExportPage() {
  const state = useAppStore(),
    [report, setReport] = useState<AuditReport | null>(null),
    [busy, setBusy] = useState(false);
  const prepare = async () => {
    setBusy(true);
    try {
      setReport(await createReport(useAppStore.getState()));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const pdf = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const { generateTechnicalPDF } = await import("@/lib/pdf-export");
      await generateTechnicalPDF(report);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="audit-page space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Informe de auditoría</h1>
        <p className="text-muted-foreground">
          La vista previa y las descargas usan la misma copia del expediente,
          identificada por su huella de contenido.
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link className="audit-button" to="/audit">
          Revisar expediente
        </Link>
        <button
          className="audit-button"
          disabled={!state.room || !hasUnsavedRevision(state)}
          onClick={state.saveRevision}
        >
          Guardar revisión
        </button>
        <button
          className="audit-button"
          disabled={!state.room || busy}
          onClick={prepare}
        >
          {busy ? "Preparando…" : "Actualizar vista previa"}
        </button>
      </div>
      {report && (
        <>
          <section className="rounded-xl border border-border p-4 space-y-2">
            <h2>
              {report.source.room.name} ·{" "}
              {report.draft ? "Borrador" : `Revisión ${report.revision}`}
            </h2>
            <p>
              {report.source.audit.technician || "Técnico pendiente"} ·{" "}
              {report.source.audit.client || "Cliente pendiente"}
            </p>
            <p className="text-xs break-all">SHA-256: {report.fingerprint}</p>
            <p>
              RT ocupado estimado: {report.acoustics.rt60Occupied} s. Nivel
              máximo orientativo en receptor:{" "}
              {formatMetric(report.evaluation.fohSpl, "dB")}.
            </p>
            <p>
              {report.source.audit.measurements.length} mediciones ·{" "}
              {report.source.audit.findings.length} hallazgos ·{" "}
              {report.dsp?.outputs.length ?? 0} salidas DSP aceptadas
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <button className="audit-button" disabled={busy} onClick={pdf}>
              Descargar PDF
            </button>
            <button
              className="audit-button"
              onClick={() =>
                downloadData(
                  reportMarkdown(report),
                  `soundmap-${report.fingerprint.slice(0, 12)}.md`,
                  "text/markdown",
                )
              }
            >
              Descargar texto
            </button>
            <button
              className="audit-button"
              onClick={() =>
                downloadData(
                  JSON.stringify(report, null, 2),
                  `soundmap-evidencias-${report.fingerprint.slice(0, 12)}.json`,
                )
              }
            >
              Descargar evidencias JSON
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Si editas el expediente, actualiza la vista previa para incluir los
            cambios. Los tres archivos conservan la misma huella.
          </p>
          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed border border-border rounded-xl p-4">
            {reportMarkdown(report)}
          </pre>
        </>
      )}
    </main>
  );
}
