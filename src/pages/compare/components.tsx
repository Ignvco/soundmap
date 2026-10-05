import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { type SplGrid } from "@/lib/audio/spl-grid.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";
import { type Scene } from "@/store/app.ts";
import {
  Check,
  ChevronDown,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
export const A_HUE = "var(--sm-accent)";

export const B_HUE = "var(--sm-amber)";

export function gearCount(
  scene: Scene,
  key: "tops" | "subs" | "monitors" | "amps" | "mics",
): number {
  return scene[key].reduce((s, g) => s + (g.quantity ?? 1), 0);
}

export function totalGearCount(scene: Scene): number {
  return (
    gearCount(scene, "tops") +
    gearCount(scene, "subs") +
    gearCount(scene, "monitors") +
    gearCount(scene, "amps")
  );
}

export function deltaGrid(a: SplGrid, b: SplGrid): SplGrid | null {
  if (
    a.rows !== b.rows ||
    a.cols !== b.cols ||
    JSON.stringify(a.bounds) !== JSON.stringify(b.bounds) ||
    a.yPlane !== b.yPlane
  )
    return null;
  const cells: number[] = [];
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  const validCells = a.cells.map(
    (_, i) => a.validCells?.[i] !== false && b.validCells?.[i] !== false,
  );
  for (let i = 0; i < a.cells.length; i++) {
    const d = a.cells[i] - b.cells[i];
    cells.push(d);
    if (!validCells[i]) continue;
    if (d < min) min = d;
    if (d > max) max = d;
    sum += d;
  }
  const count = validCells.filter(Boolean).length;
  if (!count) return null;
  const mean = sum / count;
  return {
    ...a,
    cells,
    validCells,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    spread: Math.round((max - min) * 10) / 10,
    uniformityPct: 0,
  };
}

export function ScenePicker({
  label,
  selectedId,
  onSelect,
  scenes,
  hue,
  testId,
}: {
  label: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  scenes: Scene[];
  hue: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = scenes.find((s) => (s.clientId ?? s.id) === selectedId);

  return (
    <div className="relative min-w-0" data-testid={testId}>
      <button
        onClick={() => {
          feedback("tap");
          setOpen((o) => !o);
        }}
        className="w-full rounded-2xl px-4 md:px-5 py-3.5 md:py-4 text-left flex items-center gap-3 cursor-pointer group"
        style={{
          background: "rgba(255,255,255,0.02)",
          boxShadow: `0 0 0 1px ${open ? `${hue}55` : "rgba(255,255,255,0.05)"}`,
          transition: "box-shadow 0.3s ease, background-color 0.3s ease",
        }}
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
          style={{
            background: `${hue}22`,
            color: hue,
            boxShadow: `0 0 0 1px ${hue}44`,
          }}
        >
          {label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate leading-tight">
            {selected?.name ?? "Seleccionar escena…"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {selected?.room.name ?? "—"}
          </p>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className="text-muted-foreground shrink-0"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full mt-2 left-0 right-0 z-40 rounded-2xl max-h-72 overflow-y-auto p-1.5"
            style={{
              background: "#121214",
              boxShadow:
                "0 20px 60px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {scenes.map((s) => {
              const sid = s.clientId ?? s.id;
              const isSelected = sid === selectedId;
              return (
                <button
                  key={sid}
                  onClick={() => {
                    onSelect(sid);
                    setOpen(false);
                    feedback("select");
                  }}
                  data-testid={`picker-option-${sid}`}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer",
                    isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                  )}
                  style={{ transition: "background-color 0.2s ease" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {s.room.name}
                    </p>
                  </div>
                  {isSelected && (
                    <Check size={13} strokeWidth={2} style={{ color: hue }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}

export function HeatmapHero({
  grid,
  scene,
  label,
  hue,
  testId,
}: {
  grid: SplGrid | null;
  scene: Scene;
  label: string;
  hue: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden p-5 md:p-6"
      style={{
        background: "var(--surface-1)",
        boxShadow: `0 12px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0"
            style={{
              background: `${hue}22`,
              color: hue,
              boxShadow: `0 0 0 1px ${hue}44`,
            }}
          >
            {label}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">
              {scene.name}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {scene.room.name}
            </p>
          </div>
        </div>
      </div>

      {grid ? (
        <>
          <VenuePreview
            interactive={false}
            layout={scene.stageLayout}
            room={scene.room}
            tops={scene.tops}
            subs={scene.subs}
            monitors={scene.monitors}
            grid={grid}
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <MicroStat label="Uniformidad" value={`${grid.uniformityPct}%`} />
            <MicroStat label="Media" value={`${grid.mean} dB`} />
            <MicroStat label="Máx" value={`${grid.max} dB`} />
          </div>
        </>
      ) : (
        <VenuePreview
          interactive={false}
          layout={scene.stageLayout}
          room={scene.room}
          geometryOnly
        />
      )}
    </div>
  );
}

export function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
        {label}
      </p>
      <p
        className="font-mono text-[13px] tabular-nums text-foreground"
        style={{ letterSpacing: "-0.01em" }}
      >
        {value}
      </p>
    </div>
  );
}

export function DeltaStat({
  label,
  value,
  unit,
  hint,
  hue,
}: {
  label: string;
  value: string;
  unit: string;
  hint: string;
  hue?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">
        {label}
      </p>
      <p
        className="font-mono tabular-nums leading-none"
        style={{
          fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)",
          letterSpacing: "-0.03em",
          color: hue ?? "var(--foreground)",
        }}
      >
        {value}
        <span className="text-[13px] text-muted-foreground ml-1.5 font-sans">
          {unit}
        </span>
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>
    </div>
  );
}

export function MetricPair({
  label,
  a,
  b,
  unit,
  higherIsBetter,
}: {
  label: string;
  a: number | null;
  b: number | null;
  unit: string;
  higherIsBetter: boolean;
}) {
  if (a === null || b === null) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">
          {label}
        </p>
        <p className="text-[13px] text-muted-foreground">—</p>
      </div>
    );
  }
  const better =
    a === b ? null : higherIsBetter ? (a > b ? "a" : "b") : a < b ? "a" : "b";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-3">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono tabular-nums leading-none"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
            letterSpacing: "-0.02em",
            color: better === "a" ? A_HUE : "var(--foreground)",
          }}
        >
          {a}
        </span>
        <span className="text-[11px] text-muted-foreground">vs</span>
        <span
          className="font-mono tabular-nums leading-none"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
            letterSpacing: "-0.02em",
            color: better === "b" ? B_HUE : "var(--foreground)",
          }}
        >
          {b}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {unit}
        {better ? ` · ${better === "a" ? "A" : "B"} gana` : " · iguales"}
      </p>
    </div>
  );
}

export function RoomDiff({ a, b }: { a: Scene; b: Scene }) {
  const rows = [
    { label: "Capacidad", a: a.room.capacity, b: b.room.capacity, unit: "pax" },
    { label: "Largo", a: a.room.length, b: b.room.length, unit: "m" },
    { label: "Ancho", a: a.room.width, b: b.room.width, unit: "m" },
    { label: "Alto", a: a.room.height, b: b.room.height, unit: "m" },
  ];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
        Recinto
      </p>
      <div className="grid grid-cols-1 gap-2">
        {rows.map((r) => (
          <DiffRow key={r.label} {...r} />
        ))}
      </div>
    </div>
  );
}

export function AcousticsDiff({ a, b }: { a: Scene; b: Scene }) {
  const rows = [
    {
      label: "Volumen",
      a: a.acoustics.volume,
      b: b.acoustics.volume,
      unit: "m³",
      higherIsBetter: false as const,
    },
    {
      label: "RT60 con público",
      a: a.acoustics.rt60Audience,
      b: b.acoustics.rt60Audience,
      unit: "s",
      higherIsBetter: false as const,
    },
    {
      label: "Distancia crítica",
      a: a.acoustics.criticalDistance,
      b: b.acoustics.criticalDistance,
      unit: "m",
      higherIsBetter: true as const,
    },
    {
      label: "Speech score",
      a: a.acoustics.speechScore,
      b: b.acoustics.speechScore,
      unit: "/100",
      higherIsBetter: true as const,
    },
    {
      label: "Music score",
      a: a.acoustics.musicScore,
      b: b.acoustics.musicScore,
      unit: "/100",
      higherIsBetter: true as const,
    },
  ];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
        Acústica
      </p>
      <div className="grid grid-cols-1 gap-2">
        {rows.map((r) => (
          <DiffRow key={r.label} {...r} />
        ))}
      </div>
    </div>
  );
}

export function DiffRow({
  label,
  a,
  b,
  unit,
  higherIsBetter,
}: {
  label: string;
  a: number;
  b: number;
  unit: string;
  higherIsBetter?: boolean;
}) {
  const delta = b - a;
  const same = Math.abs(delta) < 0.01;
  const better =
    higherIsBetter === undefined
      ? null
      : higherIsBetter
        ? delta > 0
          ? "b"
          : "a"
        : delta < 0
          ? "b"
          : "a";

  return (
    <div
      className="comparison-row grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2 md:gap-6 items-center py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      data-testid={`diff-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <span
        className="font-mono text-[14px] tabular-nums text-right w-16"
        style={{
          letterSpacing: "-0.01em",
          color: better === "a" ? A_HUE : "var(--foreground)",
        }}
      >
        {a}
        <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
      </span>
      <span className="w-6 flex justify-center">
        {same ? (
          <Minus size={12} className="text-muted-foreground/60" />
        ) : delta > 0 ? (
          <TrendingUp
            size={13}
            className={cn(better === "b" ? "text-[#C9F03E]" : "text-[#F5B62E]")}
          />
        ) : (
          <TrendingDown
            size={13}
            className={cn(better === "b" ? "text-[#C9F03E]" : "text-[#F5B62E]")}
          />
        )}
      </span>
      <span
        className="font-mono text-[14px] tabular-nums text-right w-16"
        style={{
          letterSpacing: "-0.01em",
          color: better === "b" ? B_HUE : "var(--foreground)",
        }}
      >
        {b}
        <span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
      </span>
    </div>
  );
}

export function GearDiff({ a, b }: { a: Scene; b: Scene }) {
  const cats: {
    key: "tops" | "subs" | "monitors" | "amps" | "mics";
    label: string;
  }[] = [
    { key: "tops", label: "Tops" },
    { key: "subs", label: "Subs" },
    { key: "monitors", label: "Monitors" },
    { key: "amps", label: "Amps" },
    { key: "mics", label: "Mics" },
  ];
  const totalA = totalGearCount(a);
  const totalB = totalGearCount(b);
  const totalDelta = totalB - totalA;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground">
          Equipamiento
        </p>
        <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
          <span style={{ color: A_HUE }}>{totalA}</span>
          <span className="mx-1.5">→</span>
          <span style={{ color: B_HUE }}>{totalB}</span>
          <span className="ml-1.5">
            ({totalDelta > 0 ? "+" : ""}
            {totalDelta})
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {cats.map((cat) => {
          const ca = gearCount(a, cat.key);
          const cb = gearCount(b, cat.key);
          if (ca === 0 && cb === 0) return null;
          const max = Math.max(ca, cb, 1);
          return (
            <div
              key={cat.key}
              className="grid grid-cols-[50px_minmax(0,1fr)_30px_30px_minmax(0,1fr)] items-center gap-2"
              data-testid={`gear-diff-${cat.key}`}
            >
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {cat.label}
              </span>
              <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(ca / max) * 100}%`,
                    background: A_HUE,
                    transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <span
                className="font-mono text-[13px] tabular-nums text-right"
                style={{ color: A_HUE }}
              >
                {ca}
              </span>
              <span
                className="font-mono text-[13px] tabular-nums"
                style={{ color: B_HUE }}
              >
                {cb}
              </span>
              <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cb / max) * 100}%`,
                    background: B_HUE,
                    transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
