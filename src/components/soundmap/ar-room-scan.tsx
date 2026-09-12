import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Ruler,
  Check,
  RotateCcw,
  ScanLine,
  ArrowUpRight,
  VideoOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  cameraPitch,
  ceilingHeight,
  floorDistance,
  validDimension,
  DIMENSION_LIMITS,
} from "@/lib/ar-measurement.ts";
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
type Axis = keyof ARMeasurement;
const AXES: Axis[] = ["length", "width", "height"];
const LABELS = { length: "Largo", width: "Ancho", height: "Altura" };

export function ARRoomScanModal({ open, onClose, onApply }: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="sm:max-w-5xl p-0 gap-0 overflow-hidden max-h-[94dvh] overflow-y-auto"
        data-testid="ar-scan-overlay"
      >
        {open && <ScanSession onApply={onApply} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
function ScanSession({ onApply, onClose }: Pick<Props, "onApply" | "onClose">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const session = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const removeSensor = useRef<() => void>(() => {});
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [camera, setCamera] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [sensorMessage, setSensorMessage] = useState(
    "Activá la cámara y los sensores para empezar.",
  );
  const [sample, setSample] = useState<{ pitch: number; at: number } | null>(
    null,
  );
  const [now, setNow] = useState(Date.now());
  const [phoneHeight, setPhoneHeight] = useState(1.55);
  const [wallDistance, setWallDistance] = useState("");
  const [axis, setAxis] = useState<Axis>("length");
  const [values, setValues] = useState<Record<Axis, string>>({
    length: "",
    width: "",
    height: "",
  });

  const stop = () => {
    session.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    removeSensor.current();
    removeSensor.current = () => {};
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => {
      window.clearInterval(timer);
      stop();
    };
  }, []);

  const start = () => {
    stop();
    const ticket = session.current;
    setError(null);
    setSample(null);
    setCamera("loading");
    setSensorMessage("Esperando una lectura de inclinación…");
    // Request orientation permission synchronously within the user's gesture (iOS).
    const DOE = window.DeviceOrientationEvent as unknown as
      | { requestPermission?: () => Promise<string> }
      | undefined;
    let permission: Promise<string>;
    try {
      permission = DOE?.requestPermission
        ? DOE.requestPermission()
        : Promise.resolve(DOE ? "granted" : "unavailable");
    } catch {
      permission = Promise.resolve("denied");
    }
    permission
      .then((result) => {
        if (ticket !== session.current) return;
        if (result !== "granted") {
          setSensorMessage(
            "Sensor no disponible. Podés ingresar las medidas manualmente.",
          );
          return;
        }
        let last = 0;
        const handler = (ev: DeviceOrientationEvent) => {
          const pitch = cameraPitch(ev.beta, ev.gamma);
          const at = Date.now();
          if (pitch == null) {
            setSample(null);
            return;
          }
          if (at - last < 80) return;
          last = at;
          setSample({ pitch, at });
        };
        window.addEventListener("deviceorientation", handler);
        removeSensor.current = () =>
          window.removeEventListener("deviceorientation", handler);
      })
      .catch(() => {
        if (ticket === session.current)
          setSensorMessage(
            "Permiso de sensores denegado. Usá la entrada manual o reintentá.",
          );
      });
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error(
            "La cámara requiere HTTPS y un navegador compatible.",
          );
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { exact: "environment" } },
        });
        if (ticket !== session.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (ticket === session.current) setCamera("ready");
      } catch (err) {
        if (ticket !== session.current) return;
        stop();
        const e = err as Error;
        setCamera("error");
        setError(
          e.name === "NotAllowedError"
            ? "No se permitió el acceso a la cámara. Podés reintentar o usar medidas manuales."
            : e.name === "OverconstrainedError" || e.name === "NotFoundError"
              ? "No se encontró una cámara trasera compatible. Usá la entrada manual."
              : e.message,
        );
      }
    })();
  };
  const fresh = sample && now - sample.at < 2500;
  const pitch = fresh ? sample.pitch : null;
  const floor = floorDistance(phoneHeight, pitch);
  const estimate =
    axis === "height"
      ? ceilingHeight(phoneHeight, Number(wallDistance), pitch)
      : floor;
  const canCapture =
    camera === "ready" &&
    validDimension(axis, estimate) &&
    validDimension(axis, Math.round(estimate * 10) / 10);
  const confirmed = AXES.filter(
    (a) => values[a].trim() && validDimension(a, Number(values[a])),
  );
  const hasInvalid = AXES.some(
    (a) => values[a].trim() && !validDimension(a, Number(values[a])),
  );
  const help =
    axis === "height"
      ? "Sin cambiar de posición, apuntá a la unión de esa misma pared con el techo."
      : axis === "length"
        ? "Ubicate junto a la pared de inicio y apuntá a la unión de la pared opuesta con el piso."
        : "Ubicate junto a una pared lateral y apuntá a la unión de la pared lateral opuesta con el piso.";
  const capture = () => {
    if (!canCapture || estimate == null) return;
    setValues((v) => ({ ...v, [axis]: estimate.toFixed(1) }));
    feedback("scan");
    if (axis !== "height") setAxis(AXES[AXES.indexOf(axis) + 1]);
  };
  const changeMode = (next: typeof mode) => {
    if (next !== mode) {
      stop();
      setCamera("idle");
      setSample(null);
      setError(null);
      setMode(next);
    }
  };

  return (
    <>
      <header className="px-6 py-5 border-b border-border pr-12">
        <div className="flex items-center gap-2 text-accent text-[10px] uppercase tracking-[.2em] mb-2">
          <ScanLine size={13} /> Diseño del recinto
        </div>
        <DialogTitle className="text-2xl font-medium tracking-tight">
          Escaneo AR
        </DialogTitle>
        <DialogDescription className="text-xs mt-2">
          Medición asistida por cámara y sensores. Revisá las dimensiones antes
          de aplicarlas.
        </DialogDescription>
      </header>
      <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="p-5 bg-[#0b0d0e] space-y-4 min-w-0">
          <div className="flex gap-2">
            {(
              [
                ["camera", "Cámara asistida", Camera],
                ["manual", "Entrada manual", Ruler],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => changeMode(key)}
                aria-pressed={mode === key}
                className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${mode === key ? "border-accent/40 text-accent bg-accent/5" : "border-border text-muted-foreground"}`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <div className="relative min-h-[280px] aspect-[4/3] max-h-[420px] rounded-lg border border-border bg-[#101415] overflow-hidden">
            {mode === "camera" && (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`absolute inset-0 w-full h-full object-cover ${camera === "ready" ? "" : "invisible"}`}
                data-testid="ar-video"
              />
            )}
            {camera === "ready" && mode === "camera" ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />
                <div className="absolute top-4 left-4 text-[10px] tracking-widest text-white/80">
                  CÁMARA TRASERA
                </div>
                <div
                  className="absolute top-4 right-4 font-mono text-xs text-white"
                  data-testid="ar-tilt-value"
                >
                  {pitch == null ? "Sin lectura" : `${pitch.toFixed(0)}°`}
                </div>
                <div
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border ${canCapture ? "border-accent" : "border-white/40"} rounded-xl flex items-center justify-center text-white/80`}
                >
                  <span className="text-2xl font-light">+</span>
                </div>
                <div className="absolute bottom-5 left-5 right-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/60">
                    {LABELS[axis]} estimado
                  </p>
                  <p
                    className="font-mono text-4xl mt-1 text-accent"
                    data-testid="ar-distance-value"
                  >
                    {canCapture ? estimate?.toFixed(1) : "—"}
                    <span className="text-sm text-white/50 ml-2">m</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
                <div className="w-14 h-14 rounded-xl bg-accent/5 border border-accent/20 flex items-center justify-center mb-5">
                  {mode === "manual" ? (
                    <Ruler className="text-accent" />
                  ) : camera === "error" ? (
                    <VideoOff className="text-muted-foreground" />
                  ) : (
                    <ScanLine className="text-accent" />
                  )}
                </div>
                <p className="text-base font-medium">
                  {mode === "manual"
                    ? "Cada dimensión, bajo tu control"
                    : "Medí tu espacio paso a paso"}
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 max-w-xs">
                  {mode === "manual"
                    ? "Ingresá las medidas de una cinta o un medidor láser en el panel de dimensiones."
                    : "Usá la cámara trasera y mantené una altura constante. Vas a capturar largo, ancho y altura por separado."}
                </p>
                {mode === "camera" && (
                  <button
                    onClick={start}
                    disabled={camera === "loading"}
                    data-testid="ar-start-btn"
                    className="mt-5 bg-accent text-accent-foreground rounded-md px-4 py-2.5 text-xs font-medium disabled:opacity-50"
                  >
                    {camera === "loading"
                      ? "Conectando…"
                      : camera === "error"
                        ? "Reintentar cámara"
                        : "Activar cámara y sensores"}
                  </button>
                )}
              </div>
            )}
          </div>
          {error && (
            <p role="alert" className="text-xs text-warning">
              {error}
            </p>
          )}
          {mode === "camera" && (
            <>
              <div className="flex gap-2">
                {AXES.map((a, i) => (
                  <button
                    key={a}
                    onClick={() => setAxis(a)}
                    aria-pressed={axis === a}
                    data-testid={`ar-chip-${a}`}
                    className={`flex-1 text-xs px-2 py-2.5 rounded-md border ${axis === a ? "border-accent/40 text-accent" : "border-border text-muted-foreground"}`}
                  >
                    {confirmed.includes(a) ? "✓" : `0${i + 1}`} · {LABELS[a]}
                  </button>
                ))}
              </div>
              <p
                className="text-xs leading-relaxed text-muted-foreground"
                data-testid="ar-current-axis"
              >
                {help}
              </p>
              <label className="block text-xs text-muted-foreground">
                Altura del celular desde el piso{" "}
                <span className="float-right font-mono text-foreground">
                  {phoneHeight.toFixed(2)} m
                </span>
                <input
                  aria-label="Altura del celular"
                  data-testid="ar-phone-height"
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.05"
                  value={phoneHeight}
                  onChange={(e) => {
                    setPhoneHeight(Number(e.target.value));
                    setWallDistance("");
                  }}
                  className="w-full mt-3 accent-accent"
                />
              </label>
              {axis === "height" && (
                <div className="border border-border rounded-lg p-3 space-y-2">
                  <label className="block text-xs">
                    Distancia a la pared (m)
                    <input
                      aria-label="Distancia a la pared (m)"
                      type="number"
                      min="0.3"
                      max="200"
                      step="0.1"
                      value={wallDistance}
                      onChange={(e) => setWallDistance(e.target.value)}
                      className="bg-secondary border border-border rounded-md px-3 py-2 w-full mt-2 font-mono"
                    />
                  </label>
                  <button
                    disabled={camera !== "ready" || floor == null}
                    onClick={() => {
                      if (floor != null) setWallDistance(floor.toFixed(2));
                    }}
                    className="text-xs text-accent disabled:opacity-40"
                  >
                    Medir distancia apuntando al piso
                  </button>
                  <p className="text-[11px] text-muted-foreground">
                    Primero medí la distancia a esa pared. Después incliná hacia
                    el techo sin caminar ni cambiar la altura del celular.
                  </p>
                </div>
              )}
              {camera === "ready" && (
                <p role="status" className="text-[11px] text-muted-foreground">
                  {pitch == null
                    ? sensorMessage +
                      " Si no llega una lectura, usá Entrada manual."
                    : canCapture
                      ? "Lectura disponible. Mantené el celular quieto y capturá."
                      : axis === "height"
                        ? "Ingresá la distancia a la pared y apuntá hacia arriba (5° a 80°)."
                        : "Apuntá hacia el piso (5° a 80° bajo el horizonte)."}
                </p>
              )}
              <button
                onClick={capture}
                disabled={!canCapture}
                data-testid="ar-capture-btn"
                className="w-full flex justify-center items-center gap-2 bg-accent text-accent-foreground p-3 rounded-md text-xs font-medium disabled:opacity-35"
              >
                <Camera size={14} />
                Capturar {LABELS[axis].toLowerCase()}
              </button>
            </>
          )}
        </section>
        <aside className="p-5 border-l border-border flex flex-col gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Dimensiones del recinto
            </p>
            <p className="text-sm mt-2">Revisá y ajustá las medidas</p>
          </div>
          {AXES.map((a, i) => (
            <label key={a} className="block">
              <span className="text-xs text-muted-foreground">
                0{i + 1} · {LABELS[a]}
              </span>
              <div className="relative mt-2">
                <input
                  aria-label={`${LABELS[a]} del recinto (m)`}
                  data-testid={`ar-value-${a}`}
                  type="number"
                  min={DIMENSION_LIMITS[a][0]}
                  max={DIMENSION_LIMITS[a][1]}
                  step="0.1"
                  placeholder="—"
                  value={values[a]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [a]: e.target.value }))
                  }
                  className="w-full bg-secondary border border-border rounded-md py-3 pl-3 pr-10 font-mono text-lg"
                />
                <span className="absolute right-3 top-4 text-xs text-muted-foreground">
                  m
                </span>
              </div>
              {values[a] && !validDimension(a, Number(values[a])) && (
                <p className="text-[10px] text-warning mt-1">
                  Ingresá entre {DIMENSION_LIMITS[a][0]} y{" "}
                  {DIMENSION_LIMITS[a][1]} m.
                </p>
              )}
            </label>
          ))}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            La cámara estima distancias; no reconstruye las paredes. Contrastá
            las medidas con una referencia. Las dimensiones vacías conservan el
            valor del formulario.
          </p>
          <div className="mt-auto space-y-3">
            <p className="text-[11px] text-muted-foreground">
              {confirmed.length} de 3 dimensiones listas
            </p>
            <button
              onClick={() => {
                const m: ARMeasurement = {};
                confirmed.forEach((a) => {
                  m[a] = Number(values[a]);
                });
                if (!confirmed.length || hasInvalid) return;
                onApply(m);
                feedback("success");
                onClose();
              }}
              disabled={!confirmed.length || hasInvalid}
              data-testid="ar-apply-btn"
              className="w-full flex justify-center items-center gap-2 bg-accent text-accent-foreground p-3 rounded-md text-xs font-medium disabled:opacity-35"
            >
              <Check size={14} />
              Aplicar al recinto
              <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() => {
                setValues({ length: "", width: "", height: "" });
                setWallDistance("");
                setAxis("length");
              }}
              data-testid="ar-reset-btn"
              className="flex gap-2 items-center justify-center w-full text-xs text-muted-foreground py-2"
            >
              <RotateCcw size={12} />
              Reiniciar medidas
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
