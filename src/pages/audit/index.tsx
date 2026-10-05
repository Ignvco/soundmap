import { Field, NumberField } from "@/components/soundmap/audit-fields";
import { GeometryEditor } from "@/components/soundmap/geometry-editor";
import { calculateAcoustics } from "@/lib/audio/acoustics";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { newId, type Finding, type ReviewState } from "@/lib/audit/document";
import { layoutSpeakers } from "@/lib/speaker-layout";
import { hasUnsavedRevision, useAppStore } from "@/store/app";
import { useState } from "react";
import { Link } from "react-router-dom";

export default function AuditPage() {
  const state = useAppStore(),
    {
      audit,
      room,
      updateAudit,
      applyRoomScan,
      tops,
      subs,
      monitors,
      stageLayout,
    } = state;
  const [title, setTitle] = useState("");
  const dirty = hasUnsavedRevision(state),
    current = state.scenes.find((s) => s.id === state.activeSceneId);
  const result = room
    ? evaluateAudit({ room, tops, subs, stageLayout, dsp: audit.dsp })
    : null;
  const setFinding = (id: string, changes: Partial<Finding>) =>
    updateAudit({
      findings: audit.findings.map((f) =>
        f.id === id ? { ...f, ...changes } : f,
      ),
    });
  const roomField = (patch: Partial<NonNullable<typeof room>>) => {
    if (room) {
      const next = { ...room, ...patch };
      applyRoomScan(next, calculateAcoustics(next));
    }
  };
  return (
    <main className="audit-page space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Expediente de auditoría</h1>
        <p className="text-xs text-muted-foreground">
          Atajos: Ctrl/⌘+S guarda revisión. Alt+Mayús+A: expediente, D: diseño,
          M: medición, S: plano, E: informe.
        </p>
        <p className="text-sm text-muted-foreground">
          {audit.id} ·{" "}
          {current ? `Revisión ${current.revision ?? 1}` : "Sin revisión"}
        </p>
      </header>
      <div className="flex flex-wrap gap-3 items-center">
        <span role="status">
          {dirty ? "Borrador con cambios pendientes" : "Revisión guardada"}
        </span>
        <button
          className="audit-button"
          disabled={!room || !dirty}
          onClick={state.saveRevision}
        >
          Guardar nueva revisión
        </button>
        {current && (
          <button
            className="audit-button"
            onClick={() => state.duplicateScene(current.id)}
          >
            Duplicar revisión como expediente
          </button>
        )}
        <Link className="audit-button" to="/export">
          Preparar informe
        </Link>
      </div>
      <details>
        <summary className="min-h-11 cursor-pointer">
          Historial de este expediente
        </summary>
        {state.scenes
          .filter((s) => s.audit?.id === audit.id)
          .map((s) => (
            <div key={s.id} className="flex gap-3 items-center py-2">
              <span>
                Revisión {s.revision} · {new Date(s.createdAt).toLocaleString()}
              </span>
              <button
                className="audit-button"
                onClick={() => {
                  if (
                    !dirty ||
                    window.confirm(
                      "¿Cargar esta revisión y descartar los cambios del borrador?",
                    )
                  )
                    state.loadScene(s.id);
                }}
              >
                Abrir
              </button>
            </div>
          ))}
      </details>
      <section className="grid sm:grid-cols-2 gap-4">
        <Field label="Técnico responsable">
          <input
            className="audit-input"
            value={audit.technician}
            onChange={(e) => updateAudit({ technician: e.target.value })}
          />
        </Field>
        <Field label="Cliente / organización">
          <input
            className="audit-input"
            value={audit.client}
            onChange={(e) => updateAudit({ client: e.target.value })}
          />
        </Field>
        <Field label="Objetivo y alcance">
          <textarea
            className="audit-input"
            rows={3}
            value={audit.objective}
            onChange={(e) => updateAudit({ objective: e.target.value })}
          />
        </Field>
        <Field label="Conclusión del técnico">
          <textarea
            className="audit-input"
            rows={3}
            value={audit.conclusion}
            onChange={(e) => updateAudit({ conclusion: e.target.value })}
          />
        </Field>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Revisión del trabajo actual</h2>
        <p className="text-sm text-muted-foreground">
          Verificado significa revisado por el técnico. Los resultados
          calculados conservan sus limitaciones. Explica los apartados que no
          aplican.
        </p>
        {[
          ["room", "Recinto"],
          ["pa", "Inventario y despliegue"],
          ["dsp", "Procesamiento"],
          ["patch", "Ruteo"],
          ["measurement", "Medición"],
          ["findings", "Hallazgos"],
          ["save", "Informe"],
        ].map(([key, label]) => {
          const review = audit.reviews[key] ?? { state: "pending", note: "" };
          const change = (patch: Partial<typeof review>) =>
            updateAudit({
              reviews: {
                ...audit.reviews,
                [key]: {
                  ...review,
                  ...patch,
                  reviewedAt: new Date().toISOString(),
                },
              },
            });
          return (
            <div
              key={key}
              className="grid sm:grid-cols-[180px_1fr] gap-2 border-b border-border pb-3"
            >
              <Field label={label}>
                <select
                  className="audit-input"
                  value={review.state}
                  onChange={(e) =>
                    change({ state: e.target.value as ReviewState })
                  }
                >
                  <option value="pending">Pendiente</option>
                  <option value="not-applicable" disabled={!review.note.trim()}>
                    No aplica
                  </option>
                  <option
                    value="verified"
                    disabled={!audit.technician.trim() || !review.note.trim()}
                  >
                    Verificado por el técnico
                  </option>
                </select>
              </Field>
              <Field label="Evidencia / motivo">
                <input
                  className="audit-input"
                  value={review.note}
                  onChange={(e) => change({ note: e.target.value })}
                />
              </Field>
            </div>
          );
        })}
      </section>
      {room && result && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Referencia de evaluación</h2>
          <p className="text-sm text-muted-foreground">
            Coordenadas en metros: x ancho, y altura, z profundidad; origen en
            el centro del suelo. +z hacia el fondo.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <NumberField
              label="Objetivo en receptor (dB)"
              value={result.target}
              min={40}
              max={130}
              onValue={(targetSpl) => roomField({ targetSpl })}
            />
            {(["x", "y", "z"] as const).map((axis) => (
              <NumberField
                key={axis}
                label={`Receptor ${axis} (m)`}
                value={result.receiver[axis]}
                step={0.1}
                min={
                  axis === "y"
                    ? 0
                    : -(axis === "x" ? room.width : room.length) / 2
                }
                max={
                  axis === "y"
                    ? room.height
                    : (axis === "x" ? room.width : room.length) / 2
                }
                onValue={(n) =>
                  roomField({ receiver: { ...result.receiver, [axis]: n } })
                }
              />
            ))}
          </div>
          <p>
            Nivel máximo orientativo en receptor:{" "}
            {result.fohSpl?.toFixed(1) ?? "No calculable"} dB · Margen:{" "}
            {result.headroomDb?.toFixed(1) ?? "—"} dB
          </p>
          <details>
            <summary className="min-h-11 cursor-pointer">
              Orientación y grupos por unidad
            </summary>
            {layoutSpeakers(room, tops, subs, monitors, stageLayout).map(
              (s) => (
                <section
                  key={s.id}
                  className="border-t border-border py-4 space-y-3"
                >
                  <h3>
                    {s.label} · {s.gear.model}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <NumberField
                      label="Azimut (°)"
                      value={s.yawDeg}
                      min={-180}
                      max={180}
                      onValue={(yawDeg) =>
                        state.updateSpeakerPlacement(s.id, { yawDeg })
                      }
                    />
                    <NumberField
                      label="Inclinación (°)"
                      value={s.tiltDeg}
                      min={-90}
                      max={90}
                      onValue={(tiltDeg) =>
                        state.updateSpeakerPlacement(s.id, { tiltDeg })
                      }
                    />
                    <NumberField
                      label="Altura centro (m)"
                      value={s.y}
                      min={0.1}
                      max={Math.max(
                        0.1,
                        room.height - (s.gear.dimensionsM?.height ?? 0.8) / 2,
                      )}
                      step={0.1}
                      onValue={(heightM) =>
                        state.updateSpeakerPlacement(s.id, { heightM })
                      }
                    />
                    <Field label="Grupo / hang">
                      <input
                        className="audit-input"
                        value={s.groupId ?? ""}
                        onChange={(e) =>
                          state.updateSpeakerPlacement(s.id, {
                            groupId: e.target.value,
                          })
                        }
                      />
                    </Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Planificación geométrica; no verifica suspensión, cargas ni
                    rigging.
                  </p>
                </section>
              ),
            )}
          </details>
        </section>
      )}
      <GeometryEditor />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mediciones documentadas</h2>
        <Link className="audit-button inline-flex" to="/perform">
          Abrir captura
        </Link>
        {audit.measurements.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin captura. Las estimaciones del motor no se presentan como
            mediciones.
          </p>
        )}
        {audit.measurements.map((m) => (
          <details key={m.id} className="rounded-xl border border-border p-4">
            <summary className="cursor-pointer">
              {m.label} · {new Date(m.startedAt).toLocaleString()} · {m.unit}
            </summary>
            <p className="text-sm my-2">
              {m.method}. {m.device} · {m.sampleRate} Hz
            </p>
            <p className="text-sm">
              {m.profile
                ? `Perfil ${m.profile.id}: ${m.profile.reference}`
                : "Sin perfil de calibración trazable"}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm my-3">
              {Object.entries(m.summary).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value ?? "No calculable"}</dd>
                </div>
              ))}
            </dl>
            {m.interruptions.map((i, n) => (
              <p key={n} role="status">
                {i}
              </p>
            ))}
            <p className="text-xs">
              {m.samples.length} muestras conservadas en el expediente y backup.
            </p>
          </details>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Hallazgos y acciones</h2>
        <div className="flex gap-2">
          <input
            aria-label="Nuevo hallazgo"
            className="audit-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Describe el hallazgo"
          />
          <button
            className="audit-button"
            disabled={!title.trim()}
            onClick={() => {
              updateAudit({
                findings: [
                  ...audit.findings,
                  {
                    id: newId("finding"),
                    title: title.trim(),
                    evidence: "",
                    action: "",
                    priority: "P1",
                    state: "open",
                  },
                ],
              });
              setTitle("");
            }}
          >
            Añadir
          </button>
        </div>
        {audit.findings.map((f) => (
          <article
            key={f.id}
            className="rounded-xl border border-border p-4 space-y-3"
          >
            <h3 className="font-semibold">{f.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Prioridad">
                <select
                  className="audit-input"
                  value={f.priority}
                  onChange={(e) =>
                    setFinding(f.id, {
                      priority: e.target.value as Finding["priority"],
                    })
                  }
                >
                  {["P0", "P1", "P2", "P3"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select
                  className="audit-input"
                  value={f.state}
                  onChange={(e) =>
                    setFinding(f.id, {
                      state: e.target.value as Finding["state"],
                    })
                  }
                >
                  <option value="open">Abierto</option>
                  <option value="accepted">Acción aceptada</option>
                  <option value="resolved">Resuelto</option>
                </select>
              </Field>
            </div>
            <Field label="Evidencia (medición, foto o referencia)">
              <textarea
                className="audit-input"
                value={f.evidence}
                onChange={(e) => setFinding(f.id, { evidence: e.target.value })}
              />
            </Field>
            <Field label="Acción propuesta / realizada">
              <textarea
                className="audit-input"
                value={f.action}
                onChange={(e) => setFinding(f.id, { action: e.target.value })}
              />
            </Field>
          </article>
        ))}
      </section>
    </main>
  );
}
