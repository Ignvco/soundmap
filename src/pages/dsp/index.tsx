import { Field, NumberField } from "@/components/soundmap/audit-fields";
import { DSPOutputEditor } from "@/components/soundmap/dsp-output-editor";
import { ShareDspModal } from "@/components/soundmap/share-dsp-modal";
import { generateDSPConfig, type DSPOutput } from "@/lib/audio/dsp-engine";
import type { ProtectionChain } from "@/lib/audio/electrical-protection";
import { calculateElectricalProtection } from "@/lib/audio/electrical-protection";
import { reviewedDSP } from "@/lib/audit/plan";
import { layoutSpeakers } from "@/lib/speaker-layout";
import { useAppStore } from "@/store/app";
import { useMemo, useState } from "react";

export default function DSPPage() {
  const {
    room,
    acoustics,
    tops,
    subs,
    monitors,
    dspUnits,
    amps,
    stageLayout,
    audit,
    updateAudit,
  } = useAppStore();
  const [showSuggestion, setShowSuggestion] = useState(false),
    [share, setShare] = useState(false);
  const suggestion = useMemo(
    () =>
      room && acoustics
        ? generateDSPConfig(
            room,
            acoustics,
            tops,
            subs,
            monitors,
            dspUnits[0] ?? null,
            amps,
            stageLayout,
            {},
          )
        : null,
    [
      room,
      acoustics,
      tops,
      subs,
      monitors,
      dspUnits,
      amps,
      stageLayout,
      audit.protection,
    ],
  );
  if (!room || !suggestion)
    return <p className="p-6">Registra primero el recinto.</p>;
  const config =
    reviewedDSP({
      room,
      acoustics,
      tops,
      subs,
      monitors,
      amps,
      stageLayout,
      audit,
    }) ?? suggestion;
  const speakers = layoutSpeakers(room, tops, subs, monitors, stageLayout);
  const changeOutput = (id: string, changes: Partial<DSPOutput>) =>
    updateAudit({
      dsp: {
        ...config,
        outputs: config.outputs.map((o) =>
          o.id === id ? { ...o, ...changes } : o,
        ),
      },
      dspState: "edited",
      dspVerifiedAt: undefined,
    });
  const adopt = () => {
    updateAudit({
      dsp: suggestion,
      dspState: "edited",
      dspVerifiedAt: undefined,
    });
    setShowSuggestion(false);
  };
  return (
    <main className="audit-page space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Procesamiento DSP</h1>
        <p className="text-sm text-muted-foreground">
          {audit.dspState === "verified-on-device"
            ? `Verificado por el técnico: ${audit.dspVerifiedAt}`
            : audit.dsp
              ? "Plan editado y guardado en el borrador"
              : "Propuesta sin aceptar"}
          . {config.dspModel}
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        Edita filtros, EQ, polaridad y tiempos por salida. Estos cambios
        documentan el plan; la aplicación no controla el procesador físico.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="audit-button"
          onClick={() => setShowSuggestion(!showSuggestion)}
        >
          Comparar propuesta actual
        </button>
        <button className="audit-button" onClick={() => setShare(true)}>
          Compartir preset
        </button>
        <button
          className="audit-button"
          disabled={!audit.dsp || !audit.technician.trim()}
          onClick={() =>
            updateAudit({
              dspState: "verified-on-device",
              dspVerifiedAt: new Date().toISOString(),
            })
          }
        >
          Registrar verificación en el equipo
        </button>
      </div>
      {showSuggestion && (
        <section className="rounded-xl border border-border p-4 space-y-3">
          <h2>Propuesta geométrica con las posiciones actuales</h2>
          {suggestion.outputs.map((o) => {
            const old = config.outputs.find((x) => x.speakerId === o.speakerId);
            return (
              <p key={o.id} className="text-sm">
                {o.destination}: delay {old?.delayMs ?? "—"} → {o.delayMs} ms;
                HPF {old?.hpfHz ?? "—"} → {o.hpfHz} Hz; EQ propuesta plana.
              </p>
            );
          })}
          <p className="text-sm">
            Aceptar reemplaza el plan DSP del borrador. Las revisiones guardadas
            conservan el anterior.
          </p>
          <button className="audit-button" onClick={adopt}>
            Aceptar propuesta completa
          </button>
        </section>
      )}
      {config.outputs.length === 0 && (
        <p>
          Sin cajas: no se generan salidas ficticias. Añade inventario en PA.
        </p>
      )}
      {config.outputs.map((output) => (
        <div key={output.id}>
          {!speakers.some((s) => s.id === output.speakerId) && (
            <p role="alert" className="text-warning">
              Esta salida no tiene una unidad actual. Compara y acepta una nueva
              propuesta para reconciliar el inventario.
            </p>
          )}
          <DSPOutputEditor
            output={output}
            onChange={(changes) => changeOutput(output.id, changes)}
          />
        </div>
      ))}
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer min-h-11">
          Asignación y referencias de protección eléctrica
        </summary>
        <p className="text-sm text-muted-foreground mb-4">
          Solo para cajas pasivas convencionales. Sin potencia por canal y carga
          documentadas no se entrega umbral. Registrar una fuente y un
          responsable no certifica el sistema.
        </p>
        {speakers
          .filter((s) => !s.gear.active)
          .map((speaker) => {
            const chain: ProtectionChain = audit.protection[speaker.id] ?? {
              speakerId: speaker.gear.id,
              amplifierId: "",
              amplifierUnit: 1,
              channel: 1,
              cabinetsInParallel: 1,
              speakerContinuousWatts: 0,
              speakerOhms: 0,
              amplifierGainDb: 0,
              outputTrimDb: 0,
              dspFullScaleDbu: 0,
              marginDb: 0,
              source: "",
              verifiedBy: "",
              verifiedAt: "",
            };
            const set = (p: Partial<ProtectionChain>) =>
              updateAudit({
                protection: {
                  ...audit.protection,
                  [speaker.id]: { ...chain, ...p },
                },
                dspState: "edited",
                dspVerifiedAt: undefined,
              });
            const result = calculateElectricalProtection(
              speaker.gear,
              amps.find((a) => a.id === chain.amplifierId),
              chain,
            );
            return (
              <section
                key={speaker.id}
                className="space-y-3 border-t border-border py-4"
              >
                <h3>
                  {speaker.label} · {speaker.gear.model}
                </h3>
                <Field label="Etapa">
                  <select
                    className="audit-input"
                    value={chain.amplifierId}
                    onChange={(e) => set({ amplifierId: e.target.value })}
                  >
                    <option value="">Seleccionar</option>
                    {amps.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.brand} {a.model}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(
                    [
                      ["amplifierUnit", "Unidad de etapa", 1, 128],
                      ["channel", "Canal", 1, 64],
                      ["cabinetsInParallel", "Cajas en paralelo", 1, 32],
                      [
                        "speakerContinuousWatts",
                        "W continuos por caja",
                        0,
                        20000,
                      ],
                      ["speakerOhms", "Impedancia por caja (Ω)", 0, 64],
                      ["amplifierGainDb", "Ganancia de etapa (dB)", 0, 60],
                      [
                        "outputTrimDb",
                        "Trim posterior al limitador (dB)",
                        -60,
                        12,
                      ],
                      ["dspFullScaleDbu", "Salida DSP a 0 dBFS (dBu)", -20, 40],
                      ["marginDb", "Margen declarado (dB)", 0, 30],
                    ] as const
                  ).map(([key, label, min, max]) => (
                    <NumberField
                      key={key}
                      label={label}
                      value={chain[key]}
                      min={min}
                      max={max}
                      step={0.1}
                      onValue={(value) => set({ [key]: value })}
                    />
                  ))}
                </div>
                <Field label="Manual / fuente y condiciones de potencia">
                  <input
                    className="audit-input"
                    value={chain.source}
                    onChange={(e) => set({ source: e.target.value })}
                  />
                </Field>
                <Field label="Responsable de la verificación">
                  <input
                    className="audit-input"
                    value={chain.verifiedBy}
                    onChange={(e) =>
                      set({
                        verifiedBy: e.target.value,
                        verifiedAt: new Date().toISOString(),
                      })
                    }
                  />
                </Field>
                <p className="text-sm">
                  {result.status === "calculated"
                    ? `${result.outputVrms.toFixed(2)} Vrms; ${result.inputDbu.toFixed(2)} dBu; ${result.thresholdDbfs.toFixed(2)} dBFS. Compara la propuesta para incorporar el umbral.`
                    : result.reasons.join(" ")}
                </p>
              </section>
            );
          })}
      </details>
      <details>
        <summary className="min-h-11 cursor-pointer">
          Supuestos de la propuesta
        </summary>
        {suggestion.notes.map((n) => (
          <p key={n} className="text-sm text-muted-foreground my-2">
            {n}
          </p>
        ))}
      </details>
      <ShareDspModal
        open={share}
        onClose={() => setShare(false)}
        outputs={config.outputs}
        dspModel={config.dspModel}
      />
    </main>
  );
}
