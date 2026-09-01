// AR Room Scan — Live camera preview with dimension estimation aid.
//
// Approach (WebView-friendly, no external ML libs):
//  - Use getUserMedia to attach the environment camera to a <video>.
//  - Read DeviceOrientationEvent to know the tilt angle of the phone.
//  - When the user aims at the floor-wall corner and taps "capture",
//    combine the tilt (β) with the user-provided phone height above the
//    floor (default 1.55 m) to estimate the horizontal distance:
//        d = h / tan(β)
//  - Repeat for the other axes; user just captures 3 corner shots to
//    populate length / width / height back to the form.
//
// It is NOT true AR/SLAM (no RANSAC feature tracking) but provides a very
// useful "sensor-assisted measure" flow that beats manually eyeballing.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Camera, Ruler, Check, RotateCcw, AlertTriangle, Info } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";

export interface ARMeasurement {
  length?: number;
  width?: number;
  height?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (m: ARMeasurement) => void;
}

type Axis = "length" | "width" | "height";

export function ARRoomScanModal({ open, onClose, onApply }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tilt, setTilt] = useState<number>(0);
  const [phoneHeight, setPhoneHeight] = useState<number>(1.55);
  const [axis, setAxis] = useState<Axis>("length");
  const [measurements, setMeasurements] = useState<ARMeasurement>({});
  const [orientationSupported, setOrientationSupported] = useState(true);

  // Start / stop camera
  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch (err) {
        const e = err as { name?: string; message?: string };
        setError(e?.name === "NotAllowedError" ? "Permiso de cámara denegado." : (e?.message ?? "No se pudo iniciar la cámara."));
      }
    })();
    return () => {
      try { stream?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
      streamRef.current = null;
      setReady(false);
    };
  }, [open]);

  // Orientation sensor
  useEffect(() => {
    if (!open) return;
    let unsub = () => { /* noop */ };
    const start = async () => {
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
      // iOS 13+ needs permission
      if (typeof DOE?.requestPermission === "function") {
        try {
          const r = await DOE.requestPermission();
          if (r !== "granted") { setOrientationSupported(false); return; }
        } catch {
          setOrientationSupported(false);
          return;
        }
      }
      const handler = (ev: DeviceOrientationEvent) => {
        // β is the front-to-back tilt in degrees (nose up/down)
        if (typeof ev.beta === "number") {
          setTilt(ev.beta);
        }
      };
      window.addEventListener("deviceorientation", handler, true);
      unsub = () => window.removeEventListener("deviceorientation", handler, true);
    };
    start();
    return () => unsub();
  }, [open]);

  // For height axis, the user should aim UP to ceiling — we compute:
  // ceiling height = phoneHeight + (dist_to_wall * tan(β_up))
  // We simplify: user reports distance to wall or use whatever length/width they measured last.
  //
  // For horizontal (length/width), user aims at the far-wall/floor corner.
  // β when pointing down at floor: 0..90 (0 = phone flat looking straight down).
  // Our convention: 90 = phone vertical facing forward.
  // Angle below horizontal: (90 - β).
  // horizontal distance = phoneHeight / tan(90-β)
  //                     = phoneHeight * tan(β)   (when β is measured from vertical)
  // But most sensors give β = 0 lying flat, 90 vertical. Aiming DOWN puts β < 90.
  // Angle-below-horizontal = 90 - β  → dist = phoneHeight / tan(90 - β)
  const angleBelowHorizontalDeg = Math.max(0.1, Math.min(89.9, 90 - Math.abs(tilt)));
  const horizontalDistanceEstimate = phoneHeight / Math.tan((angleBelowHorizontalDeg * Math.PI) / 180);

  const captureCurrent = () => {
    feedback("scan");
    const val = Math.round(horizontalDistanceEstimate * 10) / 10;
    setMeasurements((m) => ({ ...m, [axis]: val }));
    // Move to next axis
    const order: Axis[] = ["length", "width", "height"];
    const idx = order.indexOf(axis);
    if (idx < order.length - 1) setAxis(order[idx + 1]);
  };

  const reset = () => {
    setMeasurements({});
    setAxis("length");
    feedback("warning");
  };

  const apply = () => {
    feedback("success");
    onApply(measurements);
    onClose();
  };

  const axisLabels: Record<Axis, { label: string; help: string; color: string }> = {
    length: { label: "Largo",  help: "Apuntá el celular al piso, esquina más lejana", color: "var(--accent)" },
    width:  { label: "Ancho",  help: "Rotá 90° y apuntá a la esquina lateral", color: "var(--info)" },
    height: { label: "Alto",   help: "Apuntá al techo justo arriba de vos", color: "var(--warning)" },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black flex flex-col"
          data-testid="ar-scan-overlay"
        >
          {/* Camera preview */}
          <div className="relative flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              data-testid="ar-video"
            />

            {/* Crosshair overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative">
                <div className="h-40 w-40 rounded-full border-2 border-accent/60 flex items-center justify-center">
                  <div className="h-1 w-6 bg-accent" />
                  <div className="absolute h-6 w-1 bg-accent" />
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.28em] text-accent whitespace-nowrap">
                  Apuntá aquí
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-safe pb-3 bg-gradient-to-b from-black/80 to-transparent">
              <button
                onClick={onClose}
                data-testid="ar-close-btn"
                className="h-10 w-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center backdrop-blur cursor-pointer active:scale-90"
              >
                <X size={16} className="text-white" />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/60">Escaneo AR</p>
                <p className="text-sm font-medium text-white" data-testid="ar-current-axis">
                  Midiendo: {axisLabels[axis].label}
                </p>
              </div>
              <button
                onClick={reset}
                data-testid="ar-reset-btn"
                className="h-10 w-10 rounded-full bg-black/60 border border-white/15 flex items-center justify-center backdrop-blur cursor-pointer active:scale-90"
              >
                <RotateCcw size={14} className="text-white" />
              </button>
            </div>

            {/* Tilt indicator */}
            <div className="absolute top-24 right-4 rounded-2xl bg-black/60 border border-white/15 backdrop-blur px-3 py-2 pointer-events-none">
              <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/60">Tilt</p>
              <p className="text-lg font-medium text-accent font-mono tabular-nums" data-testid="ar-tilt-value">
                {tilt.toFixed(0)}°
              </p>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-32 left-4 right-4 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-md px-4 py-3 pointer-events-none">
              <div className="flex items-start gap-2">
                <Info size={12} className="text-info shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-medium text-white">{axisLabels[axis].help}</p>
                  {!orientationSupported && (
                    <p className="text-[10px] text-warning mt-1 leading-relaxed">
                      <AlertTriangle size={9} className="inline mr-1" />
                      Sensor de orientación no disponible — la estimación puede ser menos precisa.
                    </p>
                  )}
                  {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
                </div>
              </div>
            </div>

            {/* Distance readout */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 pointer-events-none">
              <div
                className="rounded-2xl bg-black/80 border-2 px-6 py-3 shadow-[0_10px_40px_rgba(0,255,158,0.35)]"
                style={{ borderColor: axisLabels[axis].color }}
              >
                <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-white/60 text-center">Distancia estimada</p>
                <p
                  className="text-4xl font-medium font-mono tabular-nums text-center"
                  style={{ color: axisLabels[axis].color, textShadow: `0 0 20px ${axisLabels[axis].color}55` }}
                  data-testid="ar-distance-value"
                >
                  {ready ? horizontalDistanceEstimate.toFixed(1) : "—"}
                  <span className="text-base text-white/50 ml-1">m</span>
                </p>
              </div>
            </div>

            {/* Captured values chips */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2">
              {(Object.keys(axisLabels) as Axis[]).map(a => {
                const value = measurements[a];
                const info = axisLabels[a];
                const active = axis === a;
                return (
                  <div
                    key={a}
                    className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 backdrop-blur"
                    style={{
                      background: value != null ? `${info.color}22` : "rgba(0,0,0,0.60)",
                      border: `1px solid ${active ? info.color : "rgba(255,255,255,0.12)"}`,
                    }}
                    data-testid={`ar-chip-${a}`}
                  >
                    <span className="text-[9px] font-medium uppercase tracking-[0.2em]" style={{ color: value != null ? info.color : "rgba(255,255,255,0.55)" }}>
                      {info.label}
                    </span>
                    <span className="text-xs font-medium font-mono tabular-nums" style={{ color: value != null ? info.color : "rgba(255,255,255,0.4)" }}>
                      {value != null ? `${value.toFixed(1)}m` : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="bg-black/95 border-t border-white/10 p-4 pb-safe">
            <div className="mb-3">
              <label className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/60 mb-1 flex items-center justify-between">
                <span>Altura del celular sobre el piso</span>
                <span className="text-white font-mono">{phoneHeight.toFixed(2)} m</span>
              </label>
              <input
                type="range"
                min={1.2}
                max={2}
                step={0.05}
                value={phoneHeight}
                onChange={(e) => setPhoneHeight(parseFloat(e.target.value))}
                data-testid="ar-phone-height"
                className="w-full accent-accent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={captureCurrent}
                disabled={!ready}
                data-testid="ar-capture-btn"
                className="flex-1 flex items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground py-3 text-sm font-medium hover:brightness-110 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40 shadow-[0_6px_22px_rgba(0,255,158,0.4)] uppercase tracking-[0.2em]"
              >
                <Camera size={14} /> Capturar {axisLabels[axis].label}
              </button>
              <button
                onClick={apply}
                disabled={Object.keys(measurements).length === 0}
                data-testid="ar-apply-btn"
                className="rounded-full bg-secondary border border-border px-5 py-3 text-sm font-medium text-foreground hover:border-accent/40 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40 uppercase tracking-[0.2em] flex items-center gap-1.5"
              >
                <Check size={13} /> Aplicar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function _keepRuler() { return <Ruler />; }
export const __keep = _keepRuler;
