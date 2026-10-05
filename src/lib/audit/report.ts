import type { AppState } from "@/store/app";
import { hasUnsavedRevision, sceneMatches } from "@/store/app";
import { calculateAcoustics } from "../audio/acoustics";
import { ENGINE_VERSION, evaluateAudit } from "../audio/audit-evaluator";
import { CATALOG_REVISION } from "../audio/catalog";
import { canonical, clone } from "./document";
import { reviewedDSP } from "./plan";

/** One detached revision feeds preview, PDF, Markdown and raw evidence export. */
export async function createReport(state: AppState) {
  if (!state.room) throw new Error("Registra primero el recinto.");
  const saved = state.scenes.find((s) =>
    sceneMatches(s, state.activeSceneId ?? ""),
  );
  const source = clone({
    room: state.room,
    audit: state.audit,
    tops: state.tops,
    subs: state.subs,
    monitors: state.monitors,
    dspUnits: state.dspUnits,
    amps: state.amps,
    mixers: state.mixers,
    mics: state.mics,
    stageLayout: state.stageLayout,
  });
  const acoustics = calculateAcoustics(source.room);
  const dsp = reviewedDSP({ ...source, acoustics });
  const e = evaluateAudit({
    room: source.room,
    tops: source.tops,
    subs: source.subs,
    stageLayout: source.stageLayout,
    dsp: source.audit.dsp,
  });
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical(source)),
  );
  return {
    schema: "soundmap.report.v1" as const,
    generatedAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    catalogRevision: CATALOG_REVISION,
    revisionId: saved?.id ?? null,
    revision: saved?.revision ?? null,
    draft: hasUnsavedRevision(state),
    fingerprint: [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
    source,
    acoustics,
    dsp,
    evaluation: e,
    limits: [
      "Informe de planificación y evidencias declaradas. No certifica seguridad eléctrica, suspensión, exposición laboral ni cumplimiento normativo.",
      "La estimación de campo directo usa fuentes puntuales y polares genéricas. No sustituye predicción del fabricante, ajuste electroacústico o medición en terreno.",
      "RT de sala estimado con absorciones aproximadas. El ruido interrumpido capturado por navegador es una comprobación orientativa, no un ensayo ISO 3382.",
      "Solo los campos del catálogo identificados como revisados cuentan con la referencia indicada. El resto permanece pendiente de contraste.",
    ],
  };
}
export type AuditReport = Awaited<ReturnType<typeof createReport>>;
export const formatMetric = (n: number | null | undefined, unit = "") =>
  n == null || !Number.isFinite(n)
    ? "No calculable"
    : `${n.toFixed(1)}${unit ? ` ${unit}` : ""}`;
export function reportMarkdown(r: AuditReport): string {
  const { room, audit } = r.source;
  return [
    `# SoundMap - ${room.name}`,
    `Revisión: ${r.revision ?? "sin guardar"}${r.draft ? " (borrador)" : ""}`,
    `Expediente: ${audit.id}`,
    `SHA-256: ${r.fingerprint}`,
    `Motor: ${r.engineVersion} | Catálogo: ${r.catalogRevision}`,
    `Técnico: ${audit.technician || "Pendiente"} | Cliente: ${audit.client || "Pendiente"}`,
    "## Alcance",
    audit.objective || "Pendiente de definir",
    "## Recinto",
    `${room.width} x ${room.length} x ${room.height} m; ocupación ${r.acoustics.occupancyPct}%`,
    `RT estimado actual: ${formatMetric(r.acoustics.rt60Occupied, "s")}`,
    `Nivel máximo estimado en receptor: ${formatMetric(r.evaluation.fohSpl, "dB")}; margen: ${formatMetric(r.evaluation.headroomDb, "dB")}`,
    "## Supuestos",
    ...r.evaluation.assumptions.map((s) => `- ${s}`),
    "## Revisiones",
    ...Object.entries(audit.reviews).map(
      ([k, v]) => `- ${k}: ${v.state}. ${v.note}`,
    ),
    "## Mediciones",
    ...(audit.measurements.length
      ? audit.measurements.map(
          (m) =>
            `- ${m.label}: ${m.method}. ${m.unit}. ${JSON.stringify(m.summary)}. ${m.interruptions.join(" ")}`,
        )
      : ["Sin captura."]),
    "## Hallazgos",
    ...audit.findings.map(
      (f) =>
        `- [${f.priority}/${f.state}] ${f.title}. Evidencia: ${f.evidence}. Acción: ${f.action}`,
    ),
    "## Conclusión",
    audit.conclusion || "Pendiente del técnico",
    "## Limitaciones",
    ...r.limits.map((s) => `- ${s}`),
  ].join("\n\n");
}
export function downloadData(
  data: string | Blob,
  filename: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(
    data instanceof Blob ? data : new Blob([data], { type }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
