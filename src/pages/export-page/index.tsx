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
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { FileText, Download, RefreshCw, ArrowLeft } from "lucide-react";
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
    <div
      className="audit-page glow-workspace glow-export"
      data-testid="glow-export"
    >
      <WorkspaceHeading
        eyebrow="ENTREGA TÉCNICA"
        title="Tu informe, listo para revisar"
        description="Prepara una copia del expediente y elige cómo compartirla."
      >
        <Link className="audit-button" to="/audit">
          <ArrowLeft size={16} /> Expediente
        </Link>
        <button
          className="audit-button workspace-primary"
          disabled={!state.room || busy}
          onClick={prepare}
        >
          <RefreshCw size={16} />{" "}
          {busy
            ? "Preparando…"
            : report
              ? "Actualizar vista previa"
              : "Preparar vista previa"}
        </button>
      </WorkspaceHeading>
      <div className="workspace-actions">
        <span className="workspace-tag">
          {hasUnsavedRevision(state)
            ? "Borrador con cambios"
            : state.room
              ? "Revisión guardada"
              : "Sin recinto"}
        </span>
        <button
          className="audit-button"
          disabled={!state.room || !hasUnsavedRevision(state)}
          onClick={state.saveRevision}
        >
          Guardar revisión
        </button>
      </div>
      {!report && (
        <section className="workspace-empty export-empty">
          <FileText size={36} />
          <h2>
            {state.room ? "Revisa antes de entregar" : "Empieza por el recinto"}
          </h2>
          <p>
            {state.room
              ? "Genera la vista previa para revisar el contenido que saldrá en el PDF, el texto y las evidencias."
              : "Define el espacio y documenta tu sistema para preparar el informe."}
          </p>
          {!state.room && (
            <Link
              className="audit-button workspace-primary"
              to="/design?step=room"
            >
              Definir recinto
            </Link>
          )}
          <div className="export-formats">
            <span>PDF técnico</span>
            <span>Texto editable</span>
            <span>Evidencias JSON</span>
          </div>
        </section>
      )}
      {report && (
        <>
          <div className="export-layout">
            <section className="workspace-card export-summary">
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">COPIA DEL EXPEDIENTE</p>
                  <h2>{report.source.room.name}</h2>
                </div>
                <span className="workspace-tag">
                  {report.draft ? "Borrador" : `Revisión ${report.revision}`}
                </span>
              </div>
              <p className="workspace-description">
                {report.source.audit.technician || "Técnico pendiente"} ·{" "}
                {report.source.audit.client || "Cliente pendiente"}
              </p>
              <dl className="workspace-metrics">
                <div>
                  <dt>RT ocupado estimado</dt>
                  <dd>
                    {report.acoustics.rt60Occupied}
                    <small> s</small>
                  </dd>
                </div>
                <div>
                  <dt>Nivel orientativo en receptor</dt>
                  <dd className="export-level">
                    {formatMetric(report.evaluation.fohSpl, "dB")}
                  </dd>
                </div>
              </dl>
              <div className="export-counts">
                <span>
                  {report.source.audit.measurements.length} mediciones
                </span>
                <span>{report.source.audit.findings.length} hallazgos</span>
                <span>
                  {report.dsp?.outputs.length ?? 0} salidas DSP aceptadas
                </span>
              </div>
              <details className="workspace-disclosure export-fingerprint">
                <summary>Identificación de la copia</summary>
                <div>
                  <p className="workspace-note">
                    La vista previa y las descargas corresponden a esta misma
                    huella de contenido.
                  </p>
                  <p
                    className="text-xs break-all mt-2"
                    data-testid="report-fingerprint"
                  >
                    SHA-256: {report.fingerprint}
                  </p>
                </div>
              </details>
            </section>
            <aside className="workspace-card export-downloads">
              <p className="project-eyebrow">FORMATOS DE ENTREGA</p>
              <h2>Descarga tu informe</h2>
              <button
                className="audit-button workspace-primary"
                disabled={busy}
                onClick={pdf}
              >
                <Download size={16} /> Descargar PDF
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
              <p className="workspace-note">
                Si editas el expediente, actualiza la vista previa para incluir
                los cambios. Los tres archivos conservan la misma huella.
              </p>
            </aside>
          </div>
          <section className="workspace-card export-document">
            <div className="workspace-section-heading">
              <div>
                <p className="project-eyebrow">CONTENIDO DEL INFORME</p>
                <h2>Vista previa completa</h2>
              </div>
            </div>
            <pre
              className="whitespace-pre-wrap break-words text-sm leading-relaxed"
              data-testid="report-preview"
            >
              {reportMarkdown(report)}
            </pre>
          </section>
        </>
      )}
    </div>
  );
}
