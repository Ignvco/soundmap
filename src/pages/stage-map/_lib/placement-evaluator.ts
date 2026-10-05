// SoundMap — Placement Evaluator
// Evaluates speaker positions against acoustic best-practice rules
// and returns per-pin ratings with detailed feedback.

import type { RoomScanInput, AcousticsResult } from "@/lib/audio/acoustics.ts";
import { arrayGainDb } from "@/lib/audio/array-gain.ts";

export type Rating = "ideal" | "buena" | "regular" | "mala";

export interface PlacementIssue {
  severity: "info" | "warning" | "error";
  message: string;
}

export interface PinEvaluation {
  pinId: string;
  rating: Rating;
  score: number;        // 0–100
  issues: PlacementIssue[];
  summary: string;      // one-liner shown in the UI
}

export interface SystemEvaluation {
  overallRating: Rating;
  overallScore: number;
  coverageEstimate: number;     // 0–100 %
  splFrontEstimate: number;     // dB
  splRearEstimate: number;      // dB
  splUniformity: number;        // 0–100 % (how even the field is)
  phaseRisk: "low" | "medium" | "high";
  notes: string[];
  pinEvals: PinEvaluation[];
}

// ── Coordinate helpers (all values in 0-100 normalised room space) ────────────
// x=0 left, x=100 right, y=0 stage wall, y=100 rear wall

function _distanceBetween(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Normalised coordinates → real metres
function toMetres(normX: number, normY: number, room: RoomScanInput) {
  return { xM: (normX / 100) * room.width, yM: (normY / 100) * room.length };
}

// ── Per-pin evaluators ────────────────────────────────────────────────────────

function evalTop(
  pinId: string,
  normX: number,
  normY: number,
  room: RoomScanInput,
  acoustics: AcousticsResult,
  allTopNorms: { x: number; y: number }[],
  coverageH: number,
  splMax: number,
): PinEvaluation {
  const issues: PlacementIssue[] = [];
  let score = 100;

  const { yM } = toMetres(normX, normY, room);

  // 1. Tops should be near the stage (y < 20% of room depth)
  if (normY > 25) {
    const penalty = Math.min(40, (normY - 25) * 1.6);
    score -= penalty;
    issues.push({
      severity: "error",
      message: `Top demasiado lejos del escenario (${yM.toFixed(1)}m desde frente). Lo ideal es ≤ ${(room.length * 0.20).toFixed(0)}m.`,
    });
  } else if (normY > 15) {
    score -= 10;
    issues.push({
      severity: "warning",
      message: `Top algo separado del escenario. Considera acercarlo más al frente.`,
    });
  }

  // 2. Very close to rear wall — huge issue
  if (normY > 80) {
    score -= 30;
    issues.push({
      severity: "error",
      message: "Top cercano a la pared trasera — alta reflexión, combing severo.",
    });
  }

  // 3. Check horizontal symmetry (for stereo pairs)
  if (allTopNorms.length === 2) {
    const [t1, t2] = allTopNorms;
    const symDiff = Math.abs((100 - t1.x) - t2.x);
    if (symDiff > 15) {
      score -= 15;
      issues.push({
        severity: "warning",
        message: "Par estéreo asimétrico. El centro de cobertura se desplaza hacia un lado.",
      });
    }
  }

  // 4. Wide room — check if coverage angle reaches edges
  if (room.width > 20) {
    const halfCoverageWidthAt20m = Math.tan((coverageH / 2) * Math.PI / 180) * 20;
    if (halfCoverageWidthAt20m < room.width * 0.4) {
      score -= 12;
      issues.push({
        severity: "warning",
        message: `Ángulo de cobertura (${coverageH}°) insuficiente para sala de ${room.width}m de ancho.`,
      });
    }
  }

  // 5. High RT60 rooms — tops too far back worsen intelligibility
  if (acoustics.rt60Audience > 2.0 && normY > 15) {
    score -= 8;
    issues.push({
      severity: "info",
      message: `Sala reverberante (RT60=${acoustics.rt60Audience}s). Tops más cerca del escenario mejoran la inteligibilidad.`,
    });
  }

  // 6. SPL budget
  const splAtRear = splMax - 20 * Math.log10(Math.max(1, room.length)); // simplified ILS
  if (splAtRear < 90) {
    score -= 10;
    issues.push({
      severity: "warning",
      message: `SPL estimado en fondo de sala (${splAtRear.toFixed(0)} dB) por debajo de 90 dB.`,
    });
  }

  score = Math.max(0, Math.round(score));

  if (issues.length === 0) {
    issues.push({ severity: "info", message: "Posición óptima según parámetros de la sala." });
  }

  return {
    pinId,
    rating: scoreToRating(score),
    score,
    issues,
    summary: issues.find(i => i.severity === "error")?.message
      ?? issues.find(i => i.severity === "warning")?.message
      ?? "Posición ideal",
  };
}

function evalSub(
  pinId: string,
  normX: number,
  normY: number,
  room: RoomScanInput,
  allSubNorms: { x: number; y: number }[],
): PinEvaluation {
  const issues: PlacementIssue[] = [];
  let score = 100;

  const { yM } = toMetres(normX, normY, room);

  // Subs should be on or very close to stage
  if (normY > 20) {
    const penalty = Math.min(35, (normY - 20) * 1.5);
    score -= penalty;
    issues.push({
      severity: "error",
      message: `Sub a ${yM.toFixed(1)}m del escenario. Alejarlo resta uniformidad de graves.`,
    });
  }

  // Cardioid sub arrays benefit from grouping
  if (allSubNorms.length >= 2) {
    const avgX = allSubNorms.reduce((s, p) => s + p.x, 0) / allSubNorms.length;
    const xDev = Math.abs(normX - avgX);
    if (xDev > 30) {
      score -= 18;
      issues.push({
        severity: "warning",
        message: "Sub muy separado horizontalmente del cluster. Puede causar cancelaciones de fase.",
      });
    }
  }

  // Sub near a side wall — room mode excitation
  if (normX < 8 || normX > 92) {
    score -= 20;
    issues.push({
      severity: "warning",
      message: "Sub pegado a la pared lateral — excita modos de sala y produce respuesta irregular.",
    });
  }

  // Sub near rear wall — strong mode build-up
  if (normY > 70) {
    score -= 25;
    issues.push({
      severity: "error",
      message: "Sub en fondo de sala — modos de sala severos, respuesta muy irregular.",
    });
  }

  score = Math.max(0, Math.round(score));

  if (issues.length === 0) {
    issues.push({ severity: "info", message: "Posición óptima para subs." });
  }

  return {
    pinId,
    rating: scoreToRating(score),
    score,
    issues,
    summary: issues.find(i => i.severity === "error")?.message
      ?? issues.find(i => i.severity === "warning")?.message
      ?? "Posición ideal",
  };
}

function evalMonitor(
  pinId: string,
  normX: number,
  normY: number,
  _room: RoomScanInput,
): PinEvaluation {
  const issues: PlacementIssue[] = [];
  let score = 100;

  // Monitors must be on stage (y < 20%)
  if (normY > 22) {
    score -= 30;
    issues.push({
      severity: "error",
      message: "Monitor fuera del escenario. Debe estar en el área del escenario.",
    });
  }

  // Monitors should not be at the very edge of stage
  if (normX < 5 || normX > 95) {
    score -= 15;
    issues.push({
      severity: "warning",
      message: "Monitor en el borde extremo del escenario — cobertura reducida para el músico central.",
    });
  }

  score = Math.max(0, Math.round(score));

  if (issues.length === 0) {
    issues.push({ severity: "info", message: "Monitor bien posicionado en el escenario." });
  }

  return {
    pinId,
    rating: scoreToRating(score),
    score,
    issues,
    summary: issues.find(i => i.severity === "error")?.message
      ?? issues.find(i => i.severity === "warning")?.message
      ?? "Posición ideal",
  };
}

function evalDelay(
  pinId: string,
  normX: number,
  normY: number,
  room: RoomScanInput,
  delayTowerDistance: number,
): PinEvaluation {
  const issues: PlacementIssue[] = [];
  let score = 100;

  const { yM } = toMetres(normX, normY, room);
  const targetYM = delayTowerDistance;
  const diffM = Math.abs(yM - targetYM);

  if (diffM > 5) {
    const penalty = Math.min(35, diffM * 3);
    score -= penalty;
    issues.push({
      severity: diffM > 8 ? "error" : "warning",
      message: `Torre de delay a ${yM.toFixed(1)}m (óptimo: ${targetYM}m). Diferencia de ${diffM.toFixed(1)}m.`,
    });
  }

  // Side placement — delay towers should be near the side walls or centre
  if (normX > 25 && normX < 75) {
    score -= 15;
    issues.push({
      severity: "warning",
      message: "Torre de delay muy centrada. Normalmente se ubican en los laterales de la sala.",
    });
  }

  score = Math.max(0, Math.round(score));

  if (issues.length === 0) {
    issues.push({ severity: "info", message: `Torre de delay en posición óptima (${yM.toFixed(1)}m).` });
  }

  return {
    pinId,
    rating: scoreToRating(score),
    score,
    issues,
    summary: issues.find(i => i.severity === "error")?.message
      ?? issues.find(i => i.severity === "warning")?.message
      ?? "Posición ideal",
  };
}

// ── Rating conversion ─────────────────────────────────────────────────────────

function scoreToRating(score: number): Rating {
  if (score >= 88) return "ideal";
  if (score >= 70) return "buena";
  if (score >= 50) return "regular";
  return "mala";
}

// ── Normalised pin interface (input) ─────────────────────────────────────────

export interface NormPin {
  id: string;
  type: "tops" | "subs" | "monitors" | "delay";
  normX: number;   // 0-100 relative to room width
  normY: number;   // 0-100 relative to room length (0 = stage wall)
  splMax: number;
  coverageH: number;
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export function evaluatePlacement(
  pins: NormPin[],
  room: RoomScanInput,
  acoustics: AcousticsResult,
  delayTowerDistance: number,
): SystemEvaluation {
  const topNorms = pins.filter(p => p.type === "tops").map(p => ({ x: p.normX, y: p.normY }));
  const subNorms = pins.filter(p => p.type === "subs").map(p => ({ x: p.normX, y: p.normY }));

  const pinEvals: PinEvaluation[] = pins.map(pin => {
    switch (pin.type) {
      case "tops":
        return evalTop(pin.id, pin.normX, pin.normY, room, acoustics, topNorms, pin.coverageH, pin.splMax);
      case "subs":
        return evalSub(pin.id, pin.normX, pin.normY, room, subNorms);
      case "monitors":
        return evalMonitor(pin.id, pin.normX, pin.normY, room);
      case "delay":
        return evalDelay(pin.id, pin.normX, pin.normY, room, delayTowerDistance);
    }
  });

  // ── System-level metrics ──────────────────────────────────────────────────
  const topPins = pins.filter(p => p.type === "tops");
  const avgTopY = topPins.length ? topPins.reduce((s, p) => s + p.normY, 0) / topPins.length : 5;
  const avgTopSPL = topPins.length ? topPins.reduce((s, p) => s + p.splMax, 0) / topPins.length : 0;
  // `Math.log2(n) * 3` ≈ 10·log10(n): otra copia del mismo cálculo escrita de
  // otra forma. Unificado en array-gain.ts para que todas las vistas coincidan.
  const splBoost = Math.round(arrayGainDb(topPins.length, "incoherent"));

  // SPL at front (near stage) — ISL from average top position
  const distFrontM = Math.max(1, (avgTopY / 100) * room.length);
  const splFrontEstimate = avgTopSPL - 3 + splBoost - 20 * Math.log10(Math.max(1, distFrontM));

  // SPL at rear
  const distRearM = Math.max(1, room.length - distFrontM);
  const splRearEstimate = avgTopSPL - 3 + splBoost - 20 * Math.log10(Math.max(1, distRearM + distFrontM));

  // Coverage estimate from coverage angles and positions
  const avgCovH = topPins.length ? topPins.reduce((s, p) => s + p.coverageH, 0) / topPins.length : 90;
  const halfWidthAt20m = Math.tan((avgCovH / 2) * Math.PI / 180) * Math.min(20, room.length * 0.6);
  const coverageEstimate = Math.min(100, Math.round((halfWidthAt20m * 2 / room.width) * 100 * (topPins.length >= 2 ? 1.15 : 1)));

  // SPL uniformity — lower deviation between front and rear = better
  const splDiff = Math.abs(splFrontEstimate - splRearEstimate);
  const splUniformity = Math.max(0, Math.round(100 - splDiff * 3));

  // Phase risk — subs too spread out
  const phaseRisk: "low" | "medium" | "high" = (() => {
    if (subNorms.length < 2) return "low";
    const maxXDist = Math.max(...subNorms.map(s => s.x)) - Math.min(...subNorms.map(s => s.x));
    if (maxXDist > 50) return "high";
    if (maxXDist > 25) return "medium";
    return "low";
  })();

  // Overall score — weighted average with penalties
  const avgPinScore = pinEvals.length
    ? pinEvals.reduce((s, e) => s + e.score, 0) / pinEvals.length
    : 100;

  const phaseBonus = phaseRisk === "low" ? 0 : phaseRisk === "medium" ? -8 : -18;
  const overallScore = Math.max(0, Math.min(100, Math.round(avgPinScore + phaseBonus)));

  // System notes
  const notes: string[] = [];
  if (phaseRisk === "high") notes.push("Riesgo alto de cancelación de fase entre subs — acercarlos entre sí.");
  if (phaseRisk === "medium") notes.push("Separación de subs moderada — considerar configuración cardioide.");
  if (coverageEstimate < 70) notes.push(`Cobertura estimada baja (${coverageEstimate}%) — considera más tops o apuntarlos más hacia los laterales.`);
  if (acoustics.echoRisk === "high") notes.push("Sala con alto riesgo de eco — apuntá los tops hacia el público, evitá que reflejen en paredes traseras.");
  if (splUniformity < 50) notes.push(`Alta diferencia SPL frente/fondo (${(splFrontEstimate - splRearEstimate).toFixed(0)} dB) — considera delay towers o redistribuir posiciones.`);

  return {
    overallRating: scoreToRating(overallScore),
    overallScore,
    coverageEstimate,
    splFrontEstimate: Math.round(splFrontEstimate),
    splRearEstimate: Math.round(splRearEstimate),
    splUniformity,
    phaseRisk,
    notes,
    pinEvals,
  };
}
