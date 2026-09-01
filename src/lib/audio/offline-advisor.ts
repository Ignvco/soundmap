// Offline / fallback advisor — heuristic recommendations derived from the
// current room + gear so the AI panel still gives value with no network.
import type { AppState } from "@/store/app.ts";

interface OfflineOptions {
  question: string;
}

export function buildOfflineAdvisorReply(state: AppState, opts: OfflineOptions): string {
  const { room, acoustics, tops, subs, monitors, dspUnits, amps } = state;
  const q = opts.question.toLowerCase();

  if (!room || !acoustics) {
    return [
      "**Modo offline** — sin conexión al asesor IA.",
      "",
      "Todavía no escaneaste ningún recinto. Empezá por:",
      "1. Ir a **Escaneo** y cargar dimensiones + materiales.",
      "2. Al terminar, seleccionar tu equipo en **Armar**.",
      "3. Volver acá y te doy recomendaciones concretas.",
    ].join("\n");
  }

  const lines: string[] = [];
  lines.push(`**Modo offline** — usando análisis heurístico sobre *${room.name}*.`);
  lines.push("");

  // Room summary
  lines.push(`**Recinto:** ${room.length}×${room.width}×${room.height} m · ${room.capacity} pax`);
  lines.push(`**RT60 (con público):** ${acoustics.rt60Audience}s · **Distancia crítica:** ${acoustics.criticalDistance}m`);
  lines.push("");

  // Focused reply based on keywords
  if (q.includes("eq") || q.includes("ecualiz")) {
    lines.push("**EQ sugerida:**");
    if (acoustics.lowMidBuildupRisk) lines.push("- Cortar 200–400 Hz (buildup low-mid).");
    if (acoustics.rt60Audience > 1.5) lines.push("- +1–2 dB en 2–4 kHz para claridad vocal.");
    lines.push(`- HPF a 80 Hz en canales que no sean bajos.`);
    return lines.join("\n");
  }

  if (q.includes("sub") || q.includes("bass")) {
    lines.push("**Estrategia de subs:**");
    const nSubs = subs.reduce((s, g) => s + (g.quantity ?? 1), 0);
    if (nSubs === 0) lines.push("- Sin subs seleccionados aún. Agregá al menos 2 para un rig estéreo.");
    else if (nSubs >= 4) lines.push(`- Con ${nSubs} subs podés armar un **array cardioide** (2 al frente + 2 en contrafase con 5–8 ms de delay).`);
    else lines.push(`- Con ${nSubs} sub(s), usar **cluster central** para máxima coherencia.`);
    if (acoustics.sbirRisk) lines.push("- ⚠️ SBIR: alejar los subs > 1m de paredes/esquinas.");
    return lines.join("\n");
  }

  if (q.includes("stage") || q.includes("escenario") || q.includes("delay")) {
    lines.push("**Escenario y delay:**");
    if (room.length > 25 && acoustics.criticalDistance < room.length * 0.6) {
      lines.push(`- Recomiendo **torres de delay** a ~${Math.round(room.length * 0.6)}m del escenario.`);
    } else {
      lines.push("- No necesitás delay towers para este recinto.");
    }
    lines.push(`- Con RT60 ${acoustics.rt60Audience}s, apuntar los tops a la audiencia y evitar reflexión trasera.`);
    return lines.join("\n");
  }

  // Default: full snapshot
  lines.push("**Estado del sistema:**");
  lines.push(`- Tops: ${tops.reduce((s, g) => s + (g.quantity ?? 1), 0)}`);
  lines.push(`- Subs: ${subs.reduce((s, g) => s + (g.quantity ?? 1), 0)}`);
  lines.push(`- Monitores: ${monitors.reduce((s, g) => s + (g.quantity ?? 1), 0)}`);
  lines.push(`- DSP: ${dspUnits.length > 0 ? `${dspUnits[0].brand} ${dspUnits[0].model}` : "—"}`);
  lines.push(`- Amps: ${amps.reduce((s, g) => s + (g.quantity ?? 1), 0)}`);
  lines.push("");
  lines.push("**Recomendaciones acústicas:**");
  acoustics.recommendations.slice(0, 4).forEach((r) => lines.push(`- ${r}`));

  return lines.join("\n");
}
