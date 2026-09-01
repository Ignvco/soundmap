// Stage Engine — SoundMap
// Calculates stage deployment strategy based on room + gear

import type { RoomScanInput, AcousticsResult } from "./acoustics.ts";
import type { GearItem } from "./pa-engine.ts";
import { calculateSubAlignment, calculateDelayTowerTiming } from "./time-align.ts";
import { combinedSplMax } from "./array-gain.ts";

export type DeploymentMode =
  | "simple-stereo"
  | "wide-stereo"
  | "line-array"
  | "center-cluster"
  | "distributed"
  | "delay-tower"
  | "mono";

export interface StageZone {
  id: string;
  label: string;
  type: "hot" | "optimal" | "weak" | "dead";
  x: number; // 0-100 percentage
  y: number;
  radius: number;
}

export interface StageConfig {
  deploymentMode: DeploymentMode;
  coveragePercent: number;
  splFront: number;
  splRear: number;
  needsDelayTowers: boolean;
  delayTowerDistance: number;
  /** Delay to dial into the delay towers (ms) — propagation + Haas. 0 if none. */
  delayTowerMs: number;
  /** Sub↔top time-alignment delay (ms) and which source is delayed. */
  subAlignMs: number;
  alignedSource: "sub" | "top" | "none";
  topsPosition: { label: string; x: number; y: number }[];
  subsPosition: { label: string; x: number; y: number }[];
  zones: StageZone[];
  notes: string[];
}

// Spread N units evenly across the stage width (x: 0–100)
function spreadPositions(
  count: number,
  label: string,
  yFrac: number
): { label: string; x: number; y: number }[] {
  if (count === 0) return [];
  if (count === 1) return [{ label: `${label} C`, x: 50, y: yFrac }];
  return Array.from({ length: count }, (_, i) => ({
    label: count <= 2
      ? `${label} ${i === 0 ? "L" : "R"}`
      : `${label} ${i + 1}`,
    x: Math.round(10 + (80 / (count - 1)) * i),
    y: yFrac,
  }));
}

export function calculateStageConfig(
  room: RoomScanInput,
  acoustics: AcousticsResult,
  tops: GearItem[],
  subs: GearItem[]
): StageConfig {
  const notes: string[] = [];

  // Total units (respects quantity per item)
  const totalTops = tops.reduce((acc, g) => acc + (g.quantity ?? 1), 0);
  const totalSubs = subs.reduce((acc, g) => acc + (g.quantity ?? 1), 0);

  // Determine deployment mode
  let deploymentMode: DeploymentMode = "simple-stereo";
  if (totalTops === 0) {
    deploymentMode = "mono";
  } else if (room.length > 40 || room.capacity > 1000) {
    deploymentMode = "line-array";
  } else if (room.width > 30) {
    deploymentMode = "wide-stereo";
  } else if (room.capacity < 100) {
    deploymentMode = "center-cluster";
  } else if (acoustics.rt60Audience > 2.5) {
    deploymentMode = "distributed";
  }

  // ── Cobertura calculada desde geometría real ─────────────────────────────────
  // Proyección trigonométrica del ángulo de cobertura horizontal del top desde
  // su posición de montaje (altura del escenario + mounting height ≈ 4m) hacia
  // el plano del público. El área cubierta se compara con el área total del salón.
  //
  // Para 2 tops en estéreo L/D separados al 25% del ancho, las zonas se solapan
  // en el centro: usamos el modelo de cobertura complementaria (no se suman naïvemente).
  // Séptima aparición del patrón `[0]`: se tomaba la cobertura del PRIMER modelo
  // de la lista. En un rig mixto (un top de 90° y otro de 60°) el resultado
  // dependía del orden en que los cargaste. La cobertura efectiva del sistema la
  // limita la caja MÁS CERRADA, así que ése es el número honesto.
  const topCoverage = tops.length > 0
    ? Math.min(...tops.map(t => t.coverageH ?? 90))
    : 90;
  const mountHeight = Math.min(room.height - 0.5, 5.0); // altura de montaje estimada
  const halfAngleRad = (topCoverage / 2) * (Math.PI / 180);
  // Ancho cubierto a nivel del público (proyección a distancia room.length)
  const covWidthPerUnit = 2 * room.length * Math.tan(halfAngleRad);
  // Para múltiples tops en L/D, la cobertura efectiva no suma linealmente
  const effectiveCovWidth = totalTops === 1
    ? covWidthPerUnit
    : Math.min(room.width * 1.05, covWidthPerUnit * (1 + (totalTops - 1) * 0.4));
  const roomArea = room.length * room.width;
  const coveredArea = Math.min(roomArea, effectiveCovWidth * room.length);
  const coveragePercent = Math.min(98, Math.max(30, Math.round((coveredArea / roomArea) * 100)));
  void mountHeight; // usado conceptualmente en el modelo, no en el cálculo directo

  // SPL estimates — each doubling of units adds ~3 dB
  // Cuarta copia del cálculo de ganancia de array que había en el proyecto:
  // `Math.log2(n) * 3` ≈ 10·log10(n), o sea el mismo criterio incoherente, pero
  // escrito distinto y sin el manejo de rigs mixtos. Unificado en array-gain.ts.
  const arraySpl = tops.length > 0 ? combinedSplMax(tops, "incoherent") : 90;
  const splFront = Math.round(arraySpl - 3);
  const splRear = Math.round(arraySpl - 9);

  // Delay towers
  const needsDelayTowers = room.length > 25 && acoustics.criticalDistance < room.length * 0.6;
  const delayTowerDistance = needsDelayTowers ? Math.round(room.length * 0.6) : 0;
  // Real delay-tower timing: propagation from the main PA + Haas precedence offset.
  const towerTiming = needsDelayTowers ? calculateDelayTowerTiming(delayTowerDistance, room.temperature ?? 20) : null;
  const delayTowerMs = towerTiming ? towerTiming.totalDelayMs : 0;

  // Sub↔top time alignment, derived from real mounting geometry and distance.
  const alignment = calculateSubAlignment(room, tops, subs);
  const subAlignMs = alignment.delayedSource === "sub" ? alignment.subDelayMs : alignment.topDelayMs;

  // Positions — spread all units evenly across the stage
  const topsPosition = spreadPositions(totalTops, "TOP", 5);
  const subsPosition = spreadPositions(totalSubs, "SUB", 8);

  // Coverage zones
  const zones: StageZone[] = [
    { id: "front", label: "Zona Frontal", type: "hot", x: 50, y: 30, radius: 18 },
    { id: "mid", label: "Zona Central", type: "optimal", x: 50, y: 55, radius: 22 },
    { id: "rear", label: "Zona Trasera", type: "weak", x: 50, y: 78, radius: 15 },
  ];

  if (needsDelayTowers) zones.push({ id: "delay", label: "Zona Delay", type: "optimal", x: 50, y: 65, radius: 12 });

  // Notas
  if (deploymentMode === "line-array") notes.push("Line array requerido para este tamaño de sala — array curvado recomendado");
  if (towerTiming) notes.push(`Torres de delay a ${towerTiming.distanceM} m: ${towerTiming.totalDelayMs} ms (${towerTiming.propagationMs} ms de propagación + ${towerTiming.haasMs} ms de Haas).`);
  if (alignment.delayedSource !== "none") notes.push(alignment.reasons[alignment.reasons.length - 1]);
  if (acoustics.echoRisk === "high") notes.push("Riesgo de eco alto — apuntar los parlantes hacia el público, evitar reflexiones de la pared trasera");
  if (deploymentMode === "distributed") notes.push("Sistema distribuido recomendado por RT60 elevado");
  notes.push(`Cobertura: ${coveragePercent}% del área del público a SPL óptimo`);

  return {
    deploymentMode,
    coveragePercent,
    splFront,
    splRear,
    needsDelayTowers,
    delayTowerDistance,
    delayTowerMs,
    subAlignMs,
    alignedSource: alignment.delayedSource,
    topsPosition,
    subsPosition,
    zones,
    notes,
  };
}
