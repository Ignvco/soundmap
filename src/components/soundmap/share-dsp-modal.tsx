// DSP Preset Share Modal — encodes a full DSP output chain into a shareable
// URL fragment (offline-first, no backend required). Compatible with all
// modern browsers via QR code + copy URL. Presets ~1-3 KB round-trip.
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Share2, Copy, Check, QrCode as QrIcon, Download } from "lucide-react";
import QRCode from "qrcode";
import type { DSPOutput } from "@/lib/audio/dsp-engine.ts";
import { feedback } from "@/lib/feedback.ts";
import { toast } from "sonner";

interface Props {
  open: boolean;
  outputs: DSPOutput[];
  dspModel: string;
  onClose: () => void;
}

interface DspPresetV1 {
  v: 1;
  model: string;
  outputs: DSPOutput[];
  ts: number;
}

/** URL-safe base64 encoder for arbitrary bytes — works in browser + node. */
function bytesToUrlSafeB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Encode a preset. Uses the browser's native CompressionStream (gzip) when
 * available so that even 8-output presets fit in a QR. Falls back to plain
 * base64-of-JSON when compression is unavailable (older browsers / node tests).
 */
async function encodePreset(preset: DspPresetV1): Promise<string> {
  const json = JSON.stringify(preset);
  const utf8 = new TextEncoder().encode(json);
  if (typeof CompressionStream !== "undefined") {
    try {
      const cs = new CompressionStream("gzip");
      const stream = new Blob([utf8]).stream().pipeThrough(cs);
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      // Prefix "z" tag so the decoder knows this is compressed.
      return "z" + bytesToUrlSafeB64(buf);
    } catch {
      /* fall through */
    }
  }
  return bytesToUrlSafeB64(utf8);
}

export function ShareDspModal({ open, outputs, dspModel, onClose }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const preset: DspPresetV1 = useMemo(() => ({
    v: 1,
    model: dspModel,
    outputs,
    ts: Date.now(),
  }), [outputs, dspModel]);

  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Encode preset (async because of CompressionStream). Runs whenever the modal
  // is opened or the preset content changes.
  useEffect(() => {
    if (!open) {
      setShareUrl(null);
      return;
    }
    let cancelled = false;
    encodePreset(preset).then((encoded) => {
      if (!cancelled) {
        setShareUrl(`${window.location.origin}/shared/dsp#preset=${encoded}`);
      }
    });
    return () => { cancelled = true; };
  }, [open, preset]);

  useEffect(() => {
    if (!open || !shareUrl) {
      setQrDataUrl(null);
      setQrError(null);
      setCopied(false);
      return;
    }
    QRCode.toDataURL(shareUrl, {
      color: { dark: "var(--foreground)", light: "#0000" },
      width: 320,
      margin: 1,
      errorCorrectionLevel: "L", // Long URL — use low correction to fit more data
    })
      .then((dataUrl) => {
        setQrDataUrl(dataUrl);
        setQrError(null);
      })
      .catch(() => {
        setQrDataUrl(null);
        setQrError("Preset demasiado grande para QR. Copiá el link.");
      });
  }, [open, shareUrl]);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      feedback("success");
      toast.success("Enlace copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  };

  const shareNative = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share !== "function") {
      copy();
      return;
    }
    try {
      await navigator.share({
        title: `SoundMap · Preset DSP ${dspModel}`,
        text: `Cadena DSP completa (${outputs.length} salidas) para importar en SoundMap`,
        url: shareUrl,
      });
      feedback("success");
    } catch {
      /* cancelled */
    }
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-dsp-${dspModel.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    feedback("select");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end md:items-center justify-center p-4"
          onClick={onClose}
          data-testid="share-dsp-overlay"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-dsp/12 border border-dsp/25 flex items-center justify-center">
                  <QrIcon size={16} className="text-dsp" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">Compartir Cadena DSP</p>
                  <p className="text-[10px] text-muted-foreground">{dspModel} · {outputs.length} salidas · offline</p>
                </div>
              </div>
              <button
                onClick={onClose}
                data-testid="share-dsp-close"
                className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer active:scale-90"
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-2xl border border-info/20 bg-info/5 p-3 mb-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                El preset (EQ, xover, delay, dinámica de las {outputs.length} salidas) se codifica en el propio enlace. Sin backend — el link funciona incluso sin conexión.
              </p>
            </div>

            {shareUrl && (
              <div className="space-y-3">
                {qrDataUrl ? (
                  <div className="rounded-2xl bg-[#04060A] border border-border p-4 flex flex-col items-center">
                    <img src={qrDataUrl} alt="QR" className="w-full max-w-[240px] aspect-square" data-testid="share-dsp-qr" />
                    <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mt-2">
                      Escaneá con la cámara
                    </p>
                  </div>
                ) : qrError ? (
                  <div className="rounded-2xl border border-warning/25 bg-warning/8 p-3 flex items-start gap-2" data-testid="share-dsp-qr-warning">
                    <span className="h-2 w-2 rounded-full bg-warning shrink-0 mt-1.5" />
                    <p className="text-[11px] text-warning leading-relaxed">{qrError}</p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-[#04060A] border border-border p-4 flex flex-col items-center min-h-[240px] justify-center">
                    <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                      Generando QR…
                    </p>
                  </div>
                )}
                <div className="rounded-2xl border border-border bg-secondary/60 p-2 flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground truncate flex-1 pl-2" data-testid="share-dsp-url">
                    {shareUrl}
                  </span>
                  <button
                    onClick={copy}
                    data-testid="share-dsp-copy"
                    className="h-8 w-8 rounded-xl bg-accent/12 border border-accent/30 flex items-center justify-center text-accent cursor-pointer hover:bg-accent/20 active:scale-90 transition-all shrink-0"
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <button
                      onClick={shareNative}
                      data-testid="share-dsp-native"
                      className="flex items-center justify-center gap-2 rounded-full bg-info/12 border border-info/30 py-2.5 text-xs font-medium text-info hover:bg-info/20 cursor-pointer active:scale-[0.98] uppercase tracking-[0.2em]"
                    >
                      <Share2 size={12} /> Compartir
                    </button>
                  )}
                  <button
                    onClick={downloadJson}
                    data-testid="share-dsp-download"
                    className="flex items-center justify-center gap-2 rounded-full bg-secondary/60 border border-border py-2.5 text-xs font-medium text-foreground hover:bg-secondary cursor-pointer active:scale-[0.98] uppercase tracking-[0.2em]"
                  >
                    <Download size={12} /> JSON
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
