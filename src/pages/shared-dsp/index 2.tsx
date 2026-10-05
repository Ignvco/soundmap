// Imported DSP preset viewer — decodes a preset from the URL hash and shows
// it read-only. The user can print / study it; applying to their live system
// is intentionally NOT wired to the store (DSP is derived state from
// room+gear), but the JSON download stays available.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Cpu, AlertTriangle, Download, Info } from "lucide-react";
import { GlassCard, Badge, ScreenShell } from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import type { DSPOutput } from "@/lib/audio/dsp-engine.ts";
import { feedback } from "@/lib/feedback.ts";

interface DspPresetV1 {
  v: 1;
  model: string;
  outputs: DSPOutput[];
  ts: number;
}

/** Hard caps to prevent DoS via crafted preset URLs. */
const MAX_OUTPUTS = 32;
const MAX_EQ_PER_OUTPUT = 32;
/** Max decompressed payload size (128 KiB) — guards against gzip zip-bombs. */
const MAX_DECOMPRESSED_BYTES = 128 * 1024;

async function decodePreset(encoded: string): Promise<DspPresetV1 | null> {
  try {
    // Detect the compressed flavour (prefix "z")
    const compressed = encoded.startsWith("z");
    const payload = compressed ? encoded.slice(1) : encoded;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bin = atob(padded);
    let bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    if (compressed && typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("gzip");
      const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(ds);
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }

    // Bail if the decompressed payload is unreasonably large (zip-bomb guard).
    if (bytes.length > MAX_DECOMPRESSED_BYTES) return null;

    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.outputs)) return null;
    // Hard caps: reject anything that looks pathological.
    if (parsed.outputs.length > MAX_OUTPUTS) return null;
    for (const o of parsed.outputs) {
      if (Array.isArray(o?.eq) && o.eq.length > MAX_EQ_PER_OUTPUT) return null;
    }
    return parsed as DspPresetV1;
  } catch {
    return null;
  }
}

export default function SharedDspPage() {
  const navigate = useNavigate();
  const [preset, setPreset] = useState<DspPresetV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const match = /preset=([^&]+)/.exec(hash);
    if (!match) {
      setError("El enlace no contiene un preset válido.");
      return;
    }
    let cancelled = false;
    decodePreset(match[1]).then((decoded) => {
      if (cancelled) return;
      if (!decoded) {
        setError("El preset está corrupto o pertenece a otra versión de SoundMap.");
        return;
      }
      setPreset(decoded);
    });
    return () => { cancelled = true; };
  }, []);

  const created = useMemo(() => {
    if (!preset) return null;
    return new Date(preset.ts).toLocaleString();
  }, [preset]);

  const downloadJson = () => {
    if (!preset) return;
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-dsp-${preset.model.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    feedback("select");
  };

  if (error) {
    return (
      <ScreenShell>
        <PageHeader title="Preset DSP" subtitle="Enlace compartido" />
        <div className="px-4 pb-10">
          <GlassCard className="p-5 flex items-start gap-3">
            <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-foreground">Enlace inválido</p>
              <p className="text-[11px] text-muted-foreground mt-1">{error}</p>
              <button
                onClick={() => navigate("/")}
                data-testid="shared-dsp-back"
                className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/70 cursor-pointer uppercase tracking-[0.2em]"
              >
                <ArrowLeft size={11} /> Volver
              </button>
            </div>
          </GlassCard>
        </div>
      </ScreenShell>
    );
  }

  if (!preset) {
    return (
      <ScreenShell>
        <PageHeader title="Preset DSP" subtitle="Cargando…" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <PageHeader
        title="Preset DSP importado"
        subtitle={preset.model}
        right={
          <Badge color="green" data-testid="shared-dsp-badge">Solo lectura</Badge>
        }
      />
      <div className="px-4 pb-10 space-y-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <GlassCard className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-dsp/12 border border-dsp/25 flex items-center justify-center">
                <Cpu size={17} className="text-dsp" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{preset.model}</p>
                <p className="text-[10px] text-muted-foreground" data-testid="shared-dsp-created">
                  Creado {created} · {preset.outputs.length} salidas
                </p>
              </div>
              <button
                onClick={downloadJson}
                data-testid="shared-dsp-download"
                className="h-9 rounded-full bg-secondary border border-border px-3 flex items-center gap-1.5 text-[11px] font-medium text-foreground hover:bg-secondary/70 cursor-pointer uppercase tracking-[0.2em]"
              >
                <Download size={11} /> JSON
              </button>
            </div>
            <div className="rounded-2xl border border-info/20 bg-info/5 p-3 flex gap-2">
              <Info size={12} className="text-info shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Este preset se generó offline. Estudiá los parámetros y aplicalos manualmente al DSP físico de tu sala.
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {preset.outputs.map((out, i) => (
          <motion.div
            key={out.id + "-" + i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.28 }}
          >
            <GlassCard className="p-4" data-testid={`shared-dsp-output-${i}`}>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-medium text-foreground">{out.label}</p>
                <Badge color="gray">{out.destination}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                <Cell label="Gain" value={`${out.gain >= 0 ? "+" : ""}${out.gain}`} unit="dB" />
                <Cell label="HPF" value={`${out.hpfHz}`} unit="Hz" />
                <Cell label="LPF" value={out.lpfHz >= 20000 ? "—" : `${out.lpfHz}`} unit="Hz" />
                <Cell label="Delay" value={`${out.delayMs}`} unit="ms" />
              </div>
              {out.eq.length > 0 && (
                <div className="rounded-xl bg-secondary/40 p-2.5 border border-border">
                  <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-1.5">EQ ({out.eq.length} bandas)</p>
                  <div className="grid grid-cols-2 gap-1">
                    {out.eq.map((b, j) => (
                      <div key={j} className="text-[10px] font-mono tabular-nums text-foreground/80">
                        {b.freq}Hz · <span style={{ color: b.gain >= 0 ? "var(--accent)" : "var(--info)" }}>{b.gain >= 0 ? "+" : ""}{b.gain}dB</span> · Q{b.q} · {b.type}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </ScreenShell>
  );
}

function Cell({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 border border-border p-2 text-center">
      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em] font-medium">{label}</p>
      <p className="text-sm font-medium text-foreground font-mono tabular-nums leading-none mt-0.5">{value}<span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span></p>
    </div>
  );
}
