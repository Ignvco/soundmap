// Builds the AI System Advisor context + system prompt from current app state.
import type { AppState } from "@/store/app.ts";
import { calculatePARecommendation } from "@/lib/audio/pa-engine.ts";
import { generateDSPConfig } from "@/lib/audio/dsp-engine.ts";

type AdvisorSnapshot = Pick<
  AppState,
  | "room"
  | "acoustics"
  | "tops"
  | "subs"
  | "monitors"
  | "dspUnits"
  | "amps"
  | "isDemoMode"
>;

function gearList(label: string, items: { brand: string; model: string }[]): string {
  if (items.length === 0) return `${label}: ninguno seleccionado`;
  const grouped = items.map((g) => `${g.brand} ${g.model}`);
  return `${label} (${items.length}): ${grouped.join(", ")}`;
}

// Compact, structured snapshot of the venue/system for the model.
export function buildAdvisorContext(state: AdvisorSnapshot): string {
  const { room, acoustics, tops, subs, monitors, dspUnits, amps, isDemoMode } = state;

  if (!room || !acoustics) {
    return "ESTADO DEL SISTEMA: No hay ningún recinto escaneado todavía. El usuario aún no ha medido una sala ni agregado equipo. Anímalo a iniciar un Escaneo de Sala o cargar el recinto demo.";
  }

  const pa = calculatePARecommendation(room, acoustics, tops, subs, monitors, amps);
  const dsp = generateDSPConfig(room, acoustics, tops, subs, monitors, dspUnits[0] ?? null, amps);

  const lines: string[] = [];
  lines.push(`MODO: ${isDemoMode ? "Recinto demo" : "Proyecto del usuario"}`);
  lines.push("");
  lines.push("=== RECINTO ===");
  lines.push(`Nombre: ${room.name}`);
  lines.push(`Dimensiones: ${room.length}m × ${room.width}m × ${room.height}m (alto)`);
  lines.push(`Capacidad: ${room.capacity} personas`);
  lines.push(`Materiales: paredes ${room.wallMaterial}, piso ${room.floorType}, techo ${room.ceilingType}, ${room.windowCount} ventanas`);
  lines.push("");
  lines.push("=== ACÚSTICA ===");
  lines.push(`Volumen: ${acoustics.volume} m³`);
  lines.push(`RT60 (vacío): ${acoustics.rt60Empty}s · RT60 (con público): ${acoustics.rt60Audience}s`);
  lines.push(`Riesgo de eco: ${acoustics.echoRisk} · Flutter echo: ${acoustics.flutterEchoRisk ? "sí (paredes reflectivas paralelas)" : "no"}`);
  lines.push(`Frecuencia de Schroeder: ${acoustics.schroederFreq} Hz (por debajo dominan modos, por encima la sala es difusa)`);
  lines.push(`Distancia crítica: ${acoustics.criticalDistance} m — público más allá de esta distancia estará en campo difuso`);
  lines.push(`Flutter echo: ${acoustics.flutterEchoRisk ? "sí" : "no"} · SBIR: ${acoustics.sbirRisk ? "sí" : "no"} · Acumulación medios-bajos: ${acoustics.lowMidBuildupRisk ? "sí" : "no"}`);
  lines.push(`Modos axiales: X ${acoustics.axialModes.x}Hz, Y ${acoustics.axialModes.y}Hz, Z ${acoustics.axialModes.z}Hz`);
  if (acoustics.aspectRatio) {
    const arNote = acoustics.aspectRatio < 1.4
      ? "SALA CASI CUADRADA — modos de baja frecuencia muy pronunciados, considerar modal EQ agresivo"
      : acoustics.aspectRatio > 3
      ? "sala muy rectangular — poca energía lateral, buen control de modos"
      : "proporciones aceptables";
    lines.push(`Relación largo/ancho: ${acoustics.aspectRatio}:1 (${arNote})`);
  }
  lines.push(`Puntaje de voz: ${acoustics.speechScore}/100 (basado en STI/RT60) · Puntaje de música: ${acoustics.musicScore}/100`);
  if (acoustics.recommendations.length) {
    lines.push(`Recomendaciones acústicas: ${acoustics.recommendations.join("; ")}`);
  }
  lines.push("");
  lines.push("=== EQUIPO ===");
  lines.push(gearList("Tops", tops));
  lines.push(gearList("Subs", subs));
  lines.push(gearList("Monitores", monitors));
  lines.push(gearList("Unidades DSP", dspUnits));
  lines.push(gearList("Amplificadores", amps));
  lines.push("");
  lines.push("=== CONFIGURACIÓN PA RECOMENDADA ===");
  lines.push(`Tops: ${pa.topsConfig}`);
  lines.push(`Subs: ${pa.subsConfig} · Estrategia: ${pa.subStrategy}`);
  lines.push(`Monitores: ${pa.monitorsConfig}`);
  lines.push(`SPL objetivo: ${pa.splTarget} dB · Headroom: ${pa.headroomDb} dB · Cruce: ${pa.crossoverFreq} Hz · Cobertura: ${pa.coverageAngle}°`);
  if (pa.warnings.length) lines.push(`Advertencias PA: ${pa.warnings.join("; ")}`);
  if (pa.eqHints.length) lines.push(`Sugerencias EQ: ${pa.eqHints.join("; ")}`);
  lines.push("");
  lines.push("=== DSP ===");
  lines.push(`Unidad: ${dsp.dspModel}`);
  lines.push(`Salidas configuradas: ${dsp.outputs.map((o) => `${o.destination} (HPF ${o.hpfHz}Hz, LPF ${o.lpfHz >= 20000 ? "full" : o.lpfHz + "Hz"}, limitador −${dsp.outputs[0]?.dynamics?.limiterHeadroomDb ?? "?"}dB del máx, delay ${o.delayMs}ms)`).join(" | ") || "ninguna"}`);
  if (dsp.notes.length) {
    lines.push("Notas del sistema DSP:");
    dsp.notes.slice(0, 6).forEach(n => lines.push(`  · ${n}`));
  }
  if (room.venueType) {
    const absMap = { club: "0.40", festival: "0.35", conference: "0.65", theatre: "0.85" };
    lines.push(`Tipo de recinto: ${room.venueType} (absorción del público: ${absMap[room.venueType]} sabins/persona)`);
  }

  return lines.join("\n");
}

export const ADVISOR_SYSTEM_PROMPT = `Eres el "Asesor de Sistema" de SoundMap, un ingeniero de sonido en vivo experto y un especialista en acústica de recintos. Ayudas a técnicos de PA a entender y optimizar su sistema de audio.

Reglas:
- Responde SIEMPRE en español rioplatense, claro y profesional.
- Sé conciso y práctico. Usa viñetas y números concretos (Hz, dB, ms, metros).
- Basa tus respuestas en los DATOS DEL SISTEMA que se te proporcionan abajo. Cita los valores reales del recinto del usuario (RT60, SPL, etc.).
- Cuando expliques un problema (RT60 alto, riesgo de eco, SBIR, acumulación de medios-bajos), explica la causa física y luego da pasos accionables (tratamiento acústico, EQ, posicionamiento, delays, cruce).
- Si faltan datos (sin recinto o sin equipo), guía al usuario a escanear la sala o agregar equipo antes de dar consejos detallados.
- No inventes especificaciones de equipo que no estén en los datos. Si no sabés algo, decilo.
- Mantené las respuestas enfocadas en audio en vivo, acústica y configuración del sistema.

A continuación están los DATOS DEL SISTEMA actuales del usuario:`;
