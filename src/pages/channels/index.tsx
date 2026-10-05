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
  if (!room || !acoustics)
    return <p className="p-6">Registra primero el recinto.</p>;
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
  const speakers = layoutSpeakers(room, tops, subs, monitors, stageLayout);
  const update = (ch: number, p: Partial<ChannelPatch>) =>
    updateAudit({
      channels: channels.map((c) => (c.ch === ch ? { ...c, ...p } : c)),
    });
  const add = () => {
    const ch = Math.max(0, ...channels.map((c) => c.ch)) + 1;
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
    <main className="audit-page space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Patch y cadena de señal</h1>
        <p className="text-sm text-muted-foreground">
          Plan editable. No recibe niveles ni controla phantom o ganancia del
          hardware.
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <button
          className="audit-button"
          onClick={add}
          disabled={channels.length >= 128}
        >
          Añadir entrada
        </button>
        <button
          className="audit-button"
          disabled={channels.length > 0}
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
      </div>
      {channels.map((c) => (
        <section
          key={c.ch}
          className="rounded-xl border border-border p-4 space-y-3"
        >
          <h2>Canal {c.ch}</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                className="audit-input"
                value={c.name}
                onChange={(e) => update(c.ch, { name: e.target.value })}
              />
            </Field>
            <Field label="Fuente / micrófono / DI">
              <input
                className="audit-input"
                value={c.source}
                onChange={(e) => update(c.ch, { source: e.target.value })}
              />
            </Field>
            <NumberField
              label="Entrada física"
              value={c.stageboxInput}
              min={1}
              max={256}
              onValue={(stageboxInput) =>
                update(c.ch, { stageboxInput: Math.round(stageboxInput) })
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
                onChange={(e) => update(c.ch, { monitorHint: e.target.value })}
              />
            </Field>
            <Field label="Notas de prueba">
              <input
                className="audit-input"
                value={c.eqHint}
                onChange={(e) => update(c.ch, { eqHint: e.target.value })}
              />
            </Field>
          </div>
          <label className="flex min-h-11 items-center gap-3">
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
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              disabled={!c.phantomSafe}
              checked={c.phantom}
              onChange={(e) => update(c.ch, { phantom: e.target.checked })}
            />{" "}
            Phantom previsto en el plan
          </label>
          <button
            className="audit-button"
            onClick={() =>
              updateAudit({ channels: channels.filter((x) => x.ch !== c.ch) })
            }
          >
            Quitar entrada {c.ch}
          </button>
        </section>
      ))}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Salidas y asignaciones</h2>
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
          Añadir ruta
        </button>
        {audit.routes.map((route) => {
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
              className="rounded-xl border border-border p-4 space-y-3"
            >
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
                    <option value="">Línea a caja activa / pendiente</option>
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
              <fieldset>
                <legend className="text-sm">Cajas conectadas</legend>
                {speakers.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 min-h-11"
                  >
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
                  El canal de etapa aparece en más de una ruta. Consolidar las
                  cajas y verificar la carga total.
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
      </section>
    </main>
  );
}
