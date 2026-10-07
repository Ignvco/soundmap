import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Cable, SlidersHorizontal, Mic2 } from "lucide-react";
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { Field, NumberField } from "@/components/soundmap/audit-fields";
import {
  generateChannelPatch,
  type ChannelPatch,
} from "@/lib/audio/channels-engine";
import { generateDSPConfig } from "@/lib/audio/dsp-engine";
import { newId } from "@/lib/audit/document";
import { layoutSpeakers } from "@/lib/speaker-layout";
import { useAppStore } from "@/store/app";
export default function Channels() {
  const {
    audit,
    updateAudit,
    room,
    acoustics,
    tops,
    subs,
    monitors,
    dspUnits,
    amps,
    mics,
    stageLayout,
  } = useAppStore();
  const [view, setView] = useState<"inputs" | "routes">("inputs");
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  if (!room || !acoustics)
    return (
      <div className="audit-page glow-workspace">
        <WorkspaceHeading
          eyebrow="CADENA DE SEÑAL"
          title="Patch y ruteo"
          description="Organiza las entradas y las conexiones de tu sistema."
        />
        <div className="workspace-empty">
          <Cable size={28} />
          <h2>Primero, tu recinto</h2>
          <p>Define el espacio para preparar las entradas y las salidas.</p>
          <Link
            className="audit-button workspace-primary"
            to="/design?step=room"
          >
            Definir recinto
          </Link>
        </div>
      </div>
    );
  const channels = audit.channels ?? [],
    outputs =
      audit.dsp?.outputs ??
      generateDSPConfig(
        room,
        acoustics,
        tops,
        subs,
        monitors,
        dspUnits[0] ?? null,
        amps,
        stageLayout,
      ).outputs;
  const activeChannel =
    channels.find((c) => c.ch === selectedChannel) ?? channels[0];
  const speakers = layoutSpeakers(room, tops, subs, monitors, stageLayout);
  const update = (ch: number, p: Partial<ChannelPatch>) =>
    updateAudit({
      channels: channels.map((c) => (c.ch === ch ? { ...c, ...p } : c)),
    });
  const add = () => {
    const ch = Math.max(0, ...channels.map((c) => c.ch)) + 1;
    setSelectedChannel(ch);
    setView("inputs");
    updateAudit({
      channels: [
        ...channels,
        {
          ch,
          name: `Entrada ${ch}`,
          source: "",
          type: "mono",
          stageboxInput: ch,
          phantom: false,
          phantomSafe: false,
          hpfHz: 0,
          eqHint: "Pendiente de prueba",
          monitorHint: "",
          priority: "medium",
          feedbackRisk: "medium",
        },
      ],
    });
  };
  return (
    <div
      className="audit-page glow-workspace glow-patch"
      data-testid="glow-patch"
    >
      <WorkspaceHeading
        eyebrow="CADENA DE SEÑAL"
        title="Patch y ruteo"
        description="Plan editable de entradas y conexiones. No controla el hardware."
      >
        <Link className="audit-button" to="/design?step=dsp">
          <SlidersHorizontal size={16} /> Abrir DSP
        </Link>
        <button
          className="audit-button workspace-primary"
          onClick={add}
          disabled={channels.length >= 128}
        >
          <Plus size={16} /> Añadir entrada
        </button>
      </WorkspaceHeading>
      <dl className="workspace-metrics">
        <div>
          <dt>Entradas</dt>
          <dd>
            {channels.length}
            <small> / 128</small>
          </dd>
        </div>
        <div>
          <dt>Rutas</dt>
          <dd>{audit.routes.length}</dd>
        </div>
        <div>
          <dt>Cajas del sistema</dt>
          <dd>{speakers.length}</dd>
        </div>
      </dl>
      <nav className="workspace-switch" aria-label="Secciones del patch">
        <button
          type="button"
          aria-pressed={view === "inputs"}
          onClick={() => setView("inputs")}
        >
          <Mic2 size={16} /> Entradas <span>{channels.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={view === "routes"}
          onClick={() => setView("routes")}
        >
          <Cable size={16} /> Rutas <span>{audit.routes.length}</span>
        </button>
      </nav>
      {view === "inputs" &&
        (channels.length === 0 ? (
          <section className="workspace-empty">
            <Mic2 size={28} />
            <h2>Tu lista de entradas empieza aquí</h2>
            <p>
              Añade las fuentes del escenario o usa una plantilla como punto de
              partida.
            </p>
            <button
              className="audit-button"
              onClick={() =>
                updateAudit({
                  channels: generateChannelPatch(mics, acoustics).map((c) => ({
                    ...c,
                    phantom: false,
                    phantomSafe: false,
                  })),
                })
              }
            >
              Cargar plantilla de banda (ejemplo)
            </button>
          </section>
        ) : (
          <div className="patch-input-layout">
            <nav className="patch-input-list" aria-label="Entradas del patch">
              {channels.map((c) => (
                <button
                  key={c.ch}
                  type="button"
                  aria-pressed={activeChannel?.ch === c.ch}
                  onClick={() => setSelectedChannel(c.ch)}
                >
                  <span className="glow-channel-number">
                    {String(c.ch).padStart(2, "0")}
                  </span>
                  <span>
                    <strong>{c.name || `Entrada ${c.ch}`}</strong>
                    <small>{c.source || "Fuente pendiente"}</small>
                  </span>
                </button>
              ))}
            </nav>
            <div className="patch-input-detail">
              <div className="patch-input-select">
                <Field label="Entrada del patch">
                  <select
                    aria-label="Entrada del patch"
                    className="audit-input"
                    value={activeChannel?.ch ?? ""}
                    onChange={(e) => setSelectedChannel(Number(e.target.value))}
                  >
                    {channels.map((c) => (
                      <option key={c.ch} value={c.ch}>
                        {String(c.ch).padStart(2, "0")} ·{" "}
                        {c.name || "Sin nombre"}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {activeChannel &&
                [activeChannel].map((c) => (
                  <section key={c.ch} className="workspace-card space-y-4">
                    <div className="workspace-section-heading">
                      <div>
                        <p className="project-eyebrow">
                          ENTRADA {String(c.ch).padStart(2, "0")}
                        </p>
                        <h2>{c.name || `Canal ${c.ch}`}</h2>
                      </div>
                      <span className="workspace-tag">Plan de señal</span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Nombre">
                        <input
                          className="audit-input"
                          value={c.name}
                          onChange={(e) =>
                            update(c.ch, { name: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Fuente / micrófono / DI">
                        <input
                          className="audit-input"
                          value={c.source}
                          onChange={(e) =>
                            update(c.ch, { source: e.target.value })
                          }
                        />
                      </Field>
                      <NumberField
                        label="Entrada física"
                        value={c.stageboxInput}
                        min={1}
                        max={256}
                        onValue={(stageboxInput) =>
                          update(c.ch, {
                            stageboxInput: Math.round(stageboxInput),
                          })
                        }
                      />
                      <NumberField
                        label="HPF sugerido (Hz; 0=off)"
                        value={c.hpfHz}
                        min={0}
                        max={2000}
                        onValue={(hpfHz) => update(c.ch, { hpfHz })}
                      />
                      <Field label="Envío / monitor">
                        <input
                          className="audit-input"
                          value={c.monitorHint}
                          onChange={(e) =>
                            update(c.ch, { monitorHint: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="Notas de prueba">
                        <input
                          className="audit-input"
                          value={c.eqHint}
                          onChange={(e) =>
                            update(c.ch, { eqHint: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <details className="workspace-disclosure">
                      <summary>
                        Phantom y compatibilidad{" "}
                        <span>{c.phantom ? "Previsto" : "Sin activar"}</span>
                      </summary>
                      <div>
                        <label className="workspace-check">
                          <input
                            type="checkbox"
                            checked={c.phantomSafe}
                            onChange={(e) =>
                              update(c.ch, {
                                phantomSafe: e.target.checked,
                                phantom: e.target.checked ? c.phantom : false,
                              })
                            }
                          />{" "}
                          Compatibilidad phantom comprobada en fuente y cableado
                        </label>
                        <label className="workspace-check">
                          <input
                            type="checkbox"
                            disabled={!c.phantomSafe}
                            checked={c.phantom}
                            onChange={(e) =>
                              update(c.ch, { phantom: e.target.checked })
                            }
                          />{" "}
                          Phantom previsto en el plan
                        </label>
                      </div>
                    </details>
                    <button
                      className="audit-button"
                      onClick={() =>
                        updateAudit({
                          channels: channels.filter((x) => x.ch !== c.ch),
                        })
                      }
                    >
                      Quitar entrada {c.ch}
                    </button>
                  </section>
                ))}
            </div>
          </div>
        ))}
      {view === "routes" && (
        <section className="space-y-4" aria-label="Salidas y asignaciones">
          <div className="workspace-section-heading">
            <div>
              <h2>Salidas y asignaciones</h2>
              <p>Del bus de consola hasta las cajas.</p>
            </div>
            <button
              className="audit-button"
              onClick={() =>
                updateAudit({
                  routes: [
                    ...audit.routes,
                    {
                      id: newId("route"),
                      input: "",
                      outputId: "",
                      speakerIds: [],
                      note: "",
                    },
                  ],
                })
              }
            >
              <Plus size={16} /> Añadir ruta
            </button>
          </div>
          {audit.routes.length === 0 && (
            <div className="workspace-empty">
              <Cable size={28} />
              <h2>Conecta tu plan de señal</h2>
              <p>
                Añade una ruta para elegir la salida DSP, la etapa y las cajas
                conectadas.
              </p>
            </div>
          )}
          <div className="patch-routes">
            {audit.routes.map((route, index) => {
              const set = (p: Partial<typeof route>) =>
                updateAudit({
                  routes: audit.routes.map((r) =>
                    r.id === route.id ? { ...r, ...p } : r,
                  ),
                });
              const duplicate =
                route.amplifierId &&
                audit.routes.some(
                  (r) =>
                    r.id !== route.id &&
                    r.amplifierId === route.amplifierId &&
                    r.amplifierUnit === route.amplifierUnit &&
                    r.channel === route.channel,
                );
              return (
                <section
                  key={route.id}
                  className="workspace-card space-y-4"
                  data-testid="patch-route"
                >
                  <div className="workspace-section-heading">
                    <div>
                      <p className="project-eyebrow">
                        RUTA {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3>{route.input || "Nueva conexión"}</h3>
                    </div>
                    <span className="workspace-tag">
                      {route.speakerIds.length} cajas
                    </span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Salida de consola / bus">
                      <input
                        className="audit-input"
                        value={route.input}
                        onChange={(e) => set({ input: e.target.value })}
                        placeholder="Consola 1 · Matrix 1"
                      />
                    </Field>
                    <Field label="Salida DSP">
                      <select
                        aria-label="Salida DSP"
                        className="audit-input"
                        value={route.outputId}
                        onChange={(e) => set({ outputId: e.target.value })}
                      >
                        <option value="">Seleccionar</option>
                        {outputs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.label} · {o.destination}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Amplificador">
                      <select
                        className="audit-input"
                        value={route.amplifierId ?? ""}
                        onChange={(e) =>
                          set({
                            amplifierId: e.target.value,
                            amplifierUnit: 1,
                            channel: 1,
                          })
                        }
                      >
                        <option value="">
                          Línea a caja activa / pendiente
                        </option>
                        {amps.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.brand} {a.model}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {route.amplifierId && (
                      <>
                        <NumberField
                          label="Unidad de etapa"
                          value={route.amplifierUnit ?? 1}
                          min={1}
                          max={
                            amps.find((a) => a.id === route.amplifierId)
                              ?.quantity ?? 1
                          }
                          onValue={(amplifierUnit) => set({ amplifierUnit })}
                        />
                        <NumberField
                          label="Canal de etapa"
                          value={route.channel ?? 1}
                          min={1}
                          max={
                            amps.find((a) => a.id === route.amplifierId)
                              ?.channels ?? 64
                          }
                          onValue={(channel) => set({ channel })}
                        />
                      </>
                    )}
                  </div>
                  <fieldset className="patch-speakers">
                    <legend className="text-sm">Cajas conectadas</legend>
                    {speakers.map((s) => (
                      <label key={s.id} className="workspace-check">
                        <input
                          type="checkbox"
                          checked={route.speakerIds.includes(s.id)}
                          onChange={(e) =>
                            set({
                              speakerIds: e.target.checked
                                ? [...route.speakerIds, s.id]
                                : route.speakerIds.filter((id) => id !== s.id),
                            })
                          }
                        />
                        {s.label} · {s.gear.model}
                      </label>
                    ))}
                  </fieldset>
                  {duplicate && (
                    <p role="alert" className="text-warning">
                      El canal de etapa aparece en más de una ruta. Consolidar
                      las cajas y verificar la carga total.
                    </p>
                  )}
                  <Field label="Cableado / carga / observaciones">
                    <input
                      className="audit-input"
                      value={route.note}
                      onChange={(e) => set({ note: e.target.value })}
                    />
                  </Field>
                  <button
                    className="audit-button"
                    onClick={() =>
                      updateAudit({
                        routes: audit.routes.filter((r) => r.id !== route.id),
                      })
                    }
                  >
                    Quitar ruta
                  </button>
                </section>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
