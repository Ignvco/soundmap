import { NumberField, Field } from "./audit-fields";
import type { DSPOutput, DSPBand } from "@/lib/audio/dsp-engine";
import { eqResponseDb, lr24Db } from "@/lib/audio/filters";

export function DSPOutputEditor({
  output: o,
  onChange,
}: {
  output: DSPOutput;
  onChange: (changes: Partial<DSPOutput>) => void;
}) {
  const updateBand = (index: number, patch: Partial<DSPBand>) =>
    onChange({
      eq: o.eq.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    });
  const curve = Array.from({ length: 120 }, (_, i) => {
    const f = 20 * 1000 ** (i / 119),
      db =
        o.gain +
        eqResponseDb(o.eq, f) +
        lr24Db(f, o.hpfHz, "hp") +
        lr24Db(f, o.lpfHz, "lp");
    return `${(i / 119) * 480},${60 - Math.max(-36, Math.min(18, db)) * 2}`;
  }).join(" ");
  return (
    <section className="glow-dsp-editor rounded-2xl border border-border p-4 space-y-4">
      <span className="project-eyebrow">CANAL SELECCIONADO</span>
      <h2 className="font-semibold">
        {o.label} · {o.destination}
      </h2>
      <p className="text-xs text-muted-foreground">
        {o.speakerId
          ? "Salida asignada al inventario del proyecto"
          : "Unidad pendiente de asignación"}
      </p>
      <svg
        viewBox="0 0 480 145"
        role="img"
        aria-label="Transferencia eléctrica calculada de filtros y EQ"
        className="w-full max-h-40"
      >
        <path d="M0 60H480" stroke="currentColor" opacity="0.2" />
        <polyline
          points={curve}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="0" y="142" fill="currentColor" fontSize="11">
          20 Hz
        </text>
        <text x="420" y="142" fill="currentColor" fontSize="11">
          20 kHz
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">
        Transferencia eléctrica calculada, sin respuesta del altavoz ni sala.
        Sin telemetría de reducción de ganancia.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberField
          label="Ganancia (dB)"
          value={o.gain}
          min={-60}
          max={12}
          step={0.1}
          onValue={(gain) => onChange({ gain })}
        />
        <NumberField
          label="Delay (ms)"
          value={o.delayMs}
          min={0}
          max={2000}
          step={0.1}
          onValue={(delayMs) => onChange({ delayMs })}
        />
        <NumberField
          label="HPF LR24 (Hz)"
          value={o.hpfHz}
          min={0}
          max={20000}
          onValue={(hpfHz) => onChange({ hpfHz })}
        />
        <NumberField
          label="LPF LR24 (Hz)"
          value={o.lpfHz}
          min={0}
          max={20000}
          onValue={(lpfHz) => onChange({ lpfHz })}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        0 Hz desactiva el filtro HPF o LPF.
      </p>
      <label className="flex items-center gap-3 min-h-11">
        <input
          type="checkbox"
          checked={!o.polarity}
          onChange={(e) => onChange({ polarity: !e.target.checked })}
        />{" "}
        Invertir polaridad
      </label>
      <details className="glow-protection">
        <summary>
          Protección ·{" "}
          {o.limiterDb === null
            ? "Referencia pendiente"
            : `${o.limiterDb.toFixed(2)} dBFS`}
        </summary>
        <p className="text-sm">
          Techo eléctrico:{" "}
          <strong>
            {o.limiterDb === null
              ? "Pendiente de cadena verificada"
              : `${o.limiterDb.toFixed(2)} dBFS`}
          </strong>
        </p>
        <p className="text-xs text-muted-foreground">
          {o.dynamics.gainStage.note}
        </p>
      </details>
      <details className="glow-eq">
        <summary>Ecualización paramétrica · {o.eq.length} filtros</summary>
        {o.eq.map((b, i) => (
          <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Field label={`Filtro ${i + 1}`}>
              <select
                className="audit-input"
                value={b.type}
                onChange={(e) =>
                  updateBand(i, { type: e.target.value as DSPBand["type"] })
                }
              >
                {["peak", "shelf-lo", "shelf-hi", "hp", "lp"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <NumberField
              label="Frecuencia (Hz)"
              value={b.freq}
              min={20}
              max={20000}
              onValue={(freq) => updateBand(i, { freq })}
            />
            <NumberField
              label="Ganancia (dB)"
              value={b.gain}
              min={-24}
              max={12}
              step={0.1}
              onValue={(gain) => updateBand(i, { gain })}
            />
            <NumberField
              label="Q"
              value={b.q}
              min={0.1}
              max={20}
              step={0.1}
              onValue={(q) => updateBand(i, { q })}
            />
            <button
              className="audit-button"
              onClick={() => onChange({ eq: o.eq.filter((_, n) => n !== i) })}
            >
              Quitar filtro {i + 1}
            </button>
          </div>
        ))}
        <button
          className="audit-button"
          disabled={o.eq.length >= 12}
          onClick={() =>
            onChange({
              eq: [...o.eq, { type: "peak", freq: 1000, gain: 0, q: 1 }],
            })
          }
        >
          Añadir filtro
        </button>
      </details>
    </section>
  );
}
