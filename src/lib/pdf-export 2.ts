// SoundMap — PDF Technical Report Generator
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { RoomScanInput, AcousticsResult } from "@/lib/audio/acoustics.ts";
import type { PARecommendation } from "@/lib/audio/pa-engine.ts";
import type { DSPConfig } from "@/lib/audio/dsp-engine.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";

// Brand colours
const ORANGE = [255, 90, 31] as const;
const ACCENT = [0, 255, 158] as const;
const INFO = [94, 234, 212] as const;
const DSP = [183, 148, 246] as const;
const LIVE = [255, 62, 165] as const;
const DARK = [12, 12, 18] as const;
const DARK2 = [22, 22, 32] as const;
const WHITE = [255, 255, 255] as const;
const MUTED = [140, 140, 160] as const;
const SUCCESS = [52, 199, 89] as const;
const WARNING = [255, 159, 10] as const;
const DANGER = [255, 69, 58] as const;

type RGB = readonly [number, number, number];

function setFill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

// ── Chart helpers ────────────────────────────────────────────────────────────

/** Draw an EQ curve chart for the DSP outputs — solid frame + gradient fill */
function drawEQChart(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  crossoverHz: number, topLpfHz: number, subHpfHz: number,
): number {
  // Frame
  setFill(doc, DARK2);
  doc.roundedRect(x, y, w, h, 2, 2, "F");
  setDraw(doc, [40, 45, 52]);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 2, 2, "S");

  // Log-freq X axis: 20 Hz → 20 kHz
  const padL = 10, padR = 5, padT = 12, padB = 10;
  const gx = x + padL, gy = y + padT;
  const gw = w - padL - padR, gh = h - padT - padB;

  const fMin = 20, fMax = 20000;
  const logMin = Math.log10(fMin);
  const logMax = Math.log10(fMax);
  const freqToX = (f: number) => gx + ((Math.log10(f) - logMin) / (logMax - logMin)) * gw;

  // Grid lines at decades
  setDraw(doc, [50, 55, 62]);
  doc.setLineWidth(0.1);
  const decades = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  setText(doc, MUTED);
  doc.setFontSize(5);
  for (const f of decades) {
    const px = freqToX(f);
    doc.line(px, gy, px, gy + gh);
    const label = f >= 1000 ? `${f/1000}k` : `${f}`;
    doc.text(label, px, gy + gh + 5, { align: "center" });
  }
  // Horizontal center line (0 dB)
  doc.line(gx, gy + gh / 2, gx + gw, gy + gh / 2);
  doc.text("0 dB", gx - 6, gy + gh / 2 + 1);

  // Sub HPF: brick wall at subHpfHz (fall off below)
  // Sub band: from subHpfHz to crossoverHz
  // Top band: from crossoverHz to topLpfHz
  const gy_center = gy + gh / 2;
  const gy_amp = gh * 0.4; // 40% up/down for filter emphasis

  // Sub band curve (purple) — HPF at subHpf, LPF at crossover
  setDraw(doc, DSP);
  doc.setLineWidth(0.8);
  drawFilterCurve(doc, freqToX, gy_center, gy_amp, subHpfHz, crossoverHz, "band");

  // Top band curve (info teal) — HPF at crossover, LPF at topLpf
  setDraw(doc, INFO);
  doc.setLineWidth(0.8);
  drawFilterCurve(doc, freqToX, gy_center, gy_amp, crossoverHz, topLpfHz, "band");

  // Crossover marker line (accent green)
  setDraw(doc, ACCENT);
  doc.setLineWidth(0.4);
  const cx = freqToX(crossoverHz);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(cx, gy, cx, gy + gh);
  doc.setLineDashPattern([], 0);
  setText(doc, ACCENT);
  doc.setFontSize(6);
  doc.text(`${crossoverHz} Hz`, cx, gy - 2, { align: "center" });

  // Legend
  setText(doc, DSP); doc.setFontSize(6); doc.text("● Subs", gx, gy + 4);
  setText(doc, INFO); doc.text("● Tops", gx + 15, gy + 4);

  return y + h + 4;
}

function drawFilterCurve(
  doc: jsPDF,
  freqToX: (f: number) => number,
  yCenter: number, yAmp: number,
  hpf: number, lpf: number,
  _shape: "band",
) {
  // Respuesta de un pasabanda Linkwitz-Riley de 24 dB/oct, que es lo que el
  // motor especifica (`slope: "LR24"`). Antes se dibujaba un Butterworth de
  // 4.º orden: en el cruce, un LR24 cae −6 dB y un BW24 cae −3 dB, así que la
  // curva del PDF —el documento que se le entrega al cliente— no era la del
  // sistema que la app había diseñado.
  //
  // Un LR de orden 2N es dos Butterworth de orden N en cascada: para LR24
  // (4.º orden) se eleva al cuadrado la magnitud de un Butterworth de 2.º.
  const steps = 80;
  let prevX: number | null = null;
  let prevY: number | null = null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const f = 20 * Math.pow(1000, t); // 20 → 20000
    // Butterworth de 2.º orden…
    const hpBw2 = 1 / Math.sqrt(1 + Math.pow(hpf / f, 4));
    const lpBw2 = 1 / Math.sqrt(1 + Math.pow(f / lpf, 4));
    // …al cuadrado = Linkwitz-Riley de 4.º orden (24 dB/oct, −6 dB en fc).
    const mag = hpBw2 * hpBw2 * lpBw2 * lpBw2;
    const dB = 20 * Math.log10(Math.max(mag, 1e-4));
    // Clamp to visible range [-18, +3]
    const clamped = Math.max(-18, Math.min(3, dB));
    const yy = yCenter - (clamped / 18) * yAmp;
    const xx = freqToX(f);
    if (prevX !== null && prevY !== null) {
      doc.line(prevX, prevY, xx, yy);
    }
    prevX = xx;
    prevY = yy;
  }
}

/** Draw a schematic top-down stage plot */
function drawStagePlot(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  room: RoomScanInput,
  stage: StageConfig,
): number {
  setFill(doc, DARK2);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  // Draw room outline maintaining aspect ratio
  const pad = 8;
  const aspect = room.width / room.length;
  const availW = w - pad * 2;
  const availH = h - pad * 2;
  let plotW, plotH;
  if (availW / availH > aspect) {
    plotH = availH;
    plotW = plotH * aspect;
  } else {
    plotW = availW;
    plotH = plotW / aspect;
  }
  const px = x + (w - plotW) / 2;
  const py = y + (h - plotH) / 2;

  // Room outline
  setDraw(doc, INFO);
  doc.setLineWidth(0.4);
  doc.rect(px, py, plotW, plotH, "S");

  // Stage rectangle (top edge, 12% depth)
  const stageH = plotH * 0.12;
  setFill(doc, [30, 34, 40]);
  doc.rect(px + plotW * 0.05, py, plotW * 0.9, stageH, "F");
  setText(doc, MUTED);
  doc.setFontSize(5);
  doc.text("STAGE", px + plotW / 2, py + stageH / 2 + 1, { align: "center" });

  // Draw speakers from stage.topsPosition and subsPosition (% based)
  const drawSpeakerBox = (posX: number, posY: number, color: RGB, label: string) => {
    // posX, posY are % of room
    const sx = px + (posX / 100) * plotW;
    const sy = py + (posY / 100) * plotH;
    setFill(doc, color);
    doc.rect(sx - 2, sy - 2, 4, 4, "F");
    setText(doc, color);
    doc.setFontSize(4);
    doc.text(label, sx, sy - 3, { align: "center" });
  };

  for (const t of stage.topsPosition) drawSpeakerBox(t.x, t.y, INFO, "T");
  for (const s of stage.subsPosition) drawSpeakerBox(s.x, s.y, DSP, "S");

  // Coverage zones as translucent circles
  for (const z of stage.zones) {
    const cx = px + (z.x / 100) * plotW;
    const cy = py + (z.y / 100) * plotH;
    const r = (z.radius / 100) * Math.min(plotW, plotH);
    if (z.type === "hot") setDraw(doc, LIVE);
    else if (z.type === "optimal") setDraw(doc, ACCENT);
    else if (z.type === "weak") setDraw(doc, WARNING);
    else setDraw(doc, DANGER);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([1, 1], 0);
    doc.circle(cx, cy, r, "S");
    doc.setLineDashPattern([], 0);
  }

  // Legend
  setText(doc, MUTED);
  doc.setFontSize(5);
  doc.text(`${room.length}m × ${room.width}m`, x + w - 3, y + h - 3, { align: "right" });
  setText(doc, INFO); doc.text("■ Tops", x + 4, y + h - 3);
  setText(doc, DSP); doc.text("■ Subs", x + 22, y + h - 3);

  return y + h + 4;
}

/** Draw a decay envelope / RT60 waveform preview */
function drawDecayCurve(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  rt60: number,
): number {
  setFill(doc, DARK2);
  doc.roundedRect(x, y, w, h, 2, 2, "F");

  const padL = 10, padR = 6, padT = 8, padB = 8;
  const gx = x + padL, gy = y + padT;
  const gw = w - padL - padR, gh = h - padT - padB;

  // Axes labels
  setText(doc, MUTED);
  doc.setFontSize(5);
  doc.text("0 dB", gx - 6, gy + 3);
  doc.text("-60", gx - 6, gy + gh);
  doc.text("0s", gx, gy + gh + 4);
  doc.text(`${(rt60 * 1.2).toFixed(1)}s`, gx + gw, gy + gh + 4, { align: "right" });

  // -60 dB line
  setDraw(doc, [50, 55, 62]);
  doc.setLineWidth(0.1);
  doc.line(gx, gy + gh, gx + gw, gy + gh);

  // Decay envelope: exponential from 0 dB to -60 dB over rt60 seconds
  // db(t) = -60 * (t / rt60) — linear in log domain
  const totalTime = rt60 * 1.2;
  const steps = 60;
  setDraw(doc, ACCENT);
  doc.setLineWidth(0.7);
  let prevX = gx, prevY = gy;
  for (let i = 1; i <= steps; i++) {
    const t = (i / steps) * totalTime;
    const dB = -60 * (t / rt60);
    const clamped = Math.max(-70, dB);
    const px = gx + (t / totalTime) * gw;
    const py = gy + ((-clamped) / 70) * gh;
    doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  }

  // Filled area under curve (light)
  // Overlay marker at RT60
  const cx = gx + (rt60 / totalTime) * gw;
  setDraw(doc, LIVE);
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.3);
  doc.line(cx, gy, cx, gy + gh);
  doc.setLineDashPattern([], 0);
  setText(doc, LIVE);
  doc.setFontSize(6);
  doc.text(`RT60 = ${rt60.toFixed(2)}s`, cx, gy - 2, { align: "center" });

  return y + h + 4;
}

// ── Cover page ─────────────────────────────────────────────────────────────────
function drawCover(doc: jsPDF, venueName: string, date: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Background
  setFill(doc, DARK);
  doc.rect(0, 0, W, H, "F");

  // Header accent bar
  setFill(doc, ORANGE);
  doc.rect(0, 0, W, 3, "F");

  // Vertical accent stripe
  setFill(doc, ORANGE);
  doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 0.15 }));
  doc.rect(0, 0, 4, H, "F");
  doc.setGState(new (doc as unknown as { GState: new (opts: { opacity: number }) => unknown }).GState({ opacity: 1 }));

  // Logo wordmark
  setText(doc, ORANGE);
  doc.setFontSize(32);
  doc.setFont("helvetica", "bold");
  doc.text("SOUNDMAP", 20, 56);

  // Tagline
  setText(doc, MUTED);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Pro Audio System Designer", 20, 66);

  // Divider
  setDraw(doc, [40, 40, 55] as RGB);
  doc.setLineWidth(0.4);
  doc.line(20, 74, W - 20, 74);

  // Report title
  setText(doc, WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Technical System Report", 20, 96);

  // Venue name
  setText(doc, ORANGE);
  doc.setFontSize(16);
  doc.text(venueName, 20, 110);

  // Date
  setText(doc, MUTED);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${date}`, 20, 122);

  // Bottom footer
  setFill(doc, DARK2);
  doc.rect(0, H - 20, W, 20, "F");
  setText(doc, MUTED);
  doc.setFontSize(8);
  doc.text("Confidential — For professional audio use only", 20, H - 7);
  doc.text("soundmap.pro", W - 20, H - 7, { align: "right" });
}

// ── Section header ─────────────────────────────────────────────────────────────
function drawSectionHeader(doc: jsPDF, title: string, y: number): number {
  const W = doc.internal.pageSize.getWidth();
  setFill(doc, DARK2);
  doc.rect(14, y, W - 28, 10, "F");
  setFill(doc, ORANGE);
  doc.rect(14, y, 3, 10, "F");
  setText(doc, WHITE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), 21, y + 7);
  return y + 16;
}

// ── Page setup ─────────────────────────────────────────────────────────────────
function addPage(doc: jsPDF): number {
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();

  // Dark background
  setFill(doc, DARK);
  doc.rect(0, 0, W, doc.internal.pageSize.getHeight(), "F");

  // Top bar
  setFill(doc, ORANGE);
  doc.rect(0, 0, W, 1.5, "F");

  // Page header
  setText(doc, MUTED);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("SOUNDMAP — TECHNICAL SYSTEM REPORT", 14, 10);
  doc.text(`Page ${doc.getNumberOfPages()}`, W - 14, 10, { align: "right" });

  // Horizontal rule
  setDraw(doc, [35, 35, 50] as RGB);
  doc.setLineWidth(0.3);
  doc.line(14, 13, W - 14, 13);

  return 22; // Starting Y for content
}

// ── Auto-table dark theme helper ───────────────────────────────────────────────
function darkTable(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: string[][]
): number {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      textColor: [210, 210, 225],
      fillColor: [18, 18, 28],
      lineColor: [40, 40, 55],
      lineWidth: 0.3,
      cellPadding: { top: 3, right: 6, bottom: 3, left: 6 },
    },
    headStyles: {
      fillColor: [28, 28, 42],
      textColor: ORANGE as [number, number, number],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [22, 22, 34],
    },
    margin: { left: 14, right: 14 },
  });
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

// ── Risk colour helper ─────────────────────────────────────────────────────────
function _riskColor(risk: string): RGB {
  if (risk === "high") return DANGER;
  if (risk === "medium") return WARNING;
  return SUCCESS;
}

// ── Main export function ───────────────────────────────────────────────────────
export function generateTechnicalPDF(
  room: RoomScanInput,
  acoustics: AcousticsResult,
  pa: PARecommendation,
  dsp: DSPConfig,
  stage: StageConfig
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const date = new Date().toLocaleString();

  // ── Cover page ──
  drawCover(doc, room.name, date);

  // ── Page 1: Venue & Acoustics ──
  let y = addPage(doc);
  y = drawSectionHeader(doc, "Venue & Acoustic Analysis", y);

  y = darkTable(doc, y, [["Parameter", "Value"]], [
    ["Venue Name", room.name],
    ["Dimensions", `${room.length}m × ${room.width}m × ${room.height}m`],
    ["Volume", `${acoustics.volume} m³`],
    ["Capacity", `${room.capacity} audience`],
    ["Ceiling Type", room.ceilingType],
    ["Wall Material", room.wallMaterial],
    ["Floor Type", room.floorType],
  ]);

  y = drawSectionHeader(doc, "Acoustic Metrics", y);

  // Reverberation decay curve
  const pageWidth = doc.internal.pageSize.getWidth();
  y = drawDecayCurve(doc, 14, y, pageWidth - 28, 34, acoustics.rt60Audience);

  // RT60 bar
  const _rt60Color: RGB = acoustics.rt60Audience > 2 ? DANGER : acoustics.rt60Audience > 1.5 ? WARNING : SUCCESS;
  y = darkTable(doc, y, [["Metric", "Value", "Status"]], [
    ["RT60 (Empty Room)", `${acoustics.rt60Empty}s`, ""],
    ["RT60 (With Audience)", `${acoustics.rt60Audience}s`, acoustics.rt60Audience > 2 ? "HIGH" : acoustics.rt60Audience > 1.5 ? "ELEVATED" : "GOOD"],
    ["Schroeder Frequency", `${acoustics.schroederFreq} Hz`, "Modal cutoff"],
    ["Critical Distance", `${acoustics.criticalDistance}m`, ""],
    ["Echo Risk", acoustics.echoRisk.toUpperCase(), ""],
    ["Speech Intelligibility", `${acoustics.speechScore}/100`, acoustics.speechScore >= 70 ? "GOOD" : "FAIR"],
    ["Music Score", `${acoustics.musicScore}/100`, ""],
    ["Flutter Echo Risk", acoustics.flutterEchoRisk ? "YES" : "NO", ""],
    ["SBIR Risk", acoustics.sbirRisk ? "YES" : "NO", ""],
    ["Low-Mid Buildup Risk", acoustics.lowMidBuildupRisk ? "YES" : "NO", ""],
    ["Axial Modes (X/Y/Z)", `${acoustics.axialModes.x} / ${acoustics.axialModes.y} / ${acoustics.axialModes.z} Hz`, ""],
  ]);

  // Recommendations
  if (acoustics.recommendations.length > 0) {
    y = drawSectionHeader(doc, "Recommendations", y);
    const recoRows = acoustics.recommendations.map(r => [`→  ${r}`]);
    y = darkTable(doc, y, [], recoRows);
  }

  // ── Page 2: PA System ──
  y = addPage(doc);
  y = drawSectionHeader(doc, "PA System Configuration", y);

  y = darkTable(doc, y, [["Parameter", "Value"]], [
    ["Tops Configuration", pa.topsConfig],
    ["Subs Configuration", pa.subsConfig],
    ["Monitor Configuration", pa.monitorsConfig],
    ["SPL Target", `${pa.splTarget} dB`],
    ["System Headroom", `${pa.headroomDb} dB`],
    ["Crossover Frequency", `${pa.crossoverFreq} Hz`],
    ["Sub Strategy", pa.subStrategy],
    ["Coverage Angle", `${pa.coverageAngle}°`],
    ["System Ready", pa.systemReady ? "YES" : "NO — missing gear"],
  ]);

  if (pa.warnings.length > 0) {
    y = drawSectionHeader(doc, "PA Warnings", y);
    y = darkTable(doc, y, [["⚠  Warning"]], pa.warnings.map(w => [w]));
  }

  if (pa.eqHints.length > 0) {
    y = drawSectionHeader(doc, "EQ Hints", y);
    y = darkTable(doc, y, [["Hint"]], pa.eqHints.map(h => [h]));
  }

  if (pa.ampSuggestions.length > 0) {
    y = drawSectionHeader(doc, "Amplifier Suggestions", y);
    y = darkTable(doc, y, [["Suggestion"]], pa.ampSuggestions.map(s => [s]));
  }

  // ── Page 3: DSP Outputs ──
  y = addPage(doc);
  y = drawSectionHeader(doc, `DSP Output Matrix — ${dsp.dspModel}`, y);

  // EQ Curve Visualization
  const pageW = doc.internal.pageSize.getWidth();
  y = drawEQChart(doc, 14, y, pageW - 28, 40, pa.crossoverFreq, 20000, Math.max(25, pa.crossoverFreq * 0.4));

  y = darkTable(
    doc,
    y,
    [["Output", "Destination", "HPF (Hz)", "LPF", "Gain (dB)", "Limiter (dB)", "Delay (ms)"]],
    dsp.outputs.map(o => [
      o.label,
      o.destination,
      `${o.hpfHz}`,
      o.lpfHz >= 20000 ? "Full" : `${o.lpfHz} Hz`,
      `${o.gain > 0 ? "+" : ""}${o.gain}`,
      `${o.limiterDb.toFixed(1)}`,
      `${o.delayMs}`,
    ])
  );

  // EQ bands per output
  y = drawSectionHeader(doc, "EQ Bands by Output", y);
  const eqRows: string[][] = [];
  dsp.outputs.forEach(o => {
    if (o.eq.length === 0) {
      eqRows.push([o.label, o.destination, "—", "—", "—", "—"]);
    } else {
      o.eq.forEach((band, bi) => {
        eqRows.push([
          bi === 0 ? o.label : "",
          bi === 0 ? o.destination : "",
          `${band.freq} Hz`,
          `${band.gain > 0 ? "+" : ""}${band.gain} dB`,
          `Q ${band.q}`,
          band.type,
        ]);
      });
    }
  });
  y = darkTable(doc, y, [["Output", "Destination", "Frequency", "Gain", "Q", "Type"]], eqRows);

  if (dsp.notes.length > 0) {
    y = drawSectionHeader(doc, "DSP Notes", y);
    y = darkTable(doc, y, [], dsp.notes.map(n => [n]));
  }

  // ── Page 4: Stage Configuration ──
  y = addPage(doc);
  y = drawSectionHeader(doc, "Stage Floor Plan & Deployment", y);

  // Stage plot visualization
  y = drawStagePlot(doc, 14, y, pageW - 28, 90, room, stage);

  y = darkTable(doc, y, [["Parameter", "Value"]], [
    ["Deployment Mode", stage.deploymentMode.replace(/-/g, " ").toUpperCase()],
    ["Coverage", `${stage.coveragePercent}%`],
    ["SPL Front", `${stage.splFront} dB`],
    ["SPL Rear", `${stage.splRear} dB`],
    ["Delay Towers Required", stage.needsDelayTowers ? `YES — ${stage.delayTowerDistance}m from stage (${stage.delayTowerMs} ms)` : "Not required"],
    ["Sub/Top Alignment", stage.alignedSource === "none" ? "N/A" : `${stage.subAlignMs} ms on ${stage.alignedSource === "sub" ? "subs" : "tops"}`],
  ]);

  // Speaker positions
  if (stage.topsPosition.length > 0 || stage.subsPosition.length > 0) {
    y = drawSectionHeader(doc, "Speaker Positions (% of room)", y);
    const posRows = [
      ...stage.topsPosition.map(p => [p.label, "Tops", `${p.x}%`, `${p.y}%`]),
      ...stage.subsPosition.map(p => [p.label, "Subs", `${p.x}%`, `${p.y}%`]),
    ];
    y = darkTable(doc, y, [["Label", "Type", "X (width)", "Y (depth)"]], posRows);
  }

  // Coverage zones
  y = drawSectionHeader(doc, "Coverage Zones", y);
  const zoneColor: Record<string, string> = { hot: "HOT", optimal: "OPTIMAL", weak: "WEAK", dead: "DEAD" };
  y = darkTable(
    doc,
    y,
    [["Zone", "Type", "X", "Y", "Radius"]],
    stage.zones.map(z => [z.label, zoneColor[z.type] ?? z.type, `${z.x}%`, `${z.y}%`, `${z.radius}%`])
  );

  if (stage.notes.length > 0) {
    // El valor devuelto por darkTable no se usa: es la última sección antes del
    // addPage(). Se deja la llamada tal cual para no alterar el layout.
    const notesY = drawSectionHeader(doc, "Deployment Notes", y);
    darkTable(doc, notesY, [], stage.notes.map(n => [n]));
  }

  // ── Back page ──
  doc.addPage();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  setFill(doc, DARK);
  doc.rect(0, 0, W, H, "F");
  setFill(doc, ORANGE);
  doc.rect(0, H - 3, W, 3, "F");

  setText(doc, ORANGE);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("SOUNDMAP", W / 2, H / 2 - 10, { align: "center" });
  setText(doc, MUTED);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Pro Audio System Designer", W / 2, H / 2 + 2, { align: "center" });
  doc.text(date, W / 2, H / 2 + 12, { align: "center" });

  // Page numbers on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    setText(doc, MUTED);
    doc.setFontSize(7);
    doc.text(`${i - 1} / ${pageCount - 1}`, W - 14, H - 6, { align: "right" });
  }

  // Save
  const filename = `soundmap-${room.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;
  doc.save(filename);
}
