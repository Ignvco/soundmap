// Live Engine — SoundMap
// Genera procedimientos operativos basados en el sistema

import type { GearItem } from "./pa-engine.ts";
import type { AcousticsResult } from "./acoustics.ts";

export interface LiveStep {
  id: string;
  order: number;
  title: string;
  description: string;
  category: "power" | "check" | "tune" | "verify" | "emergency";
  critical: boolean;
  done: boolean;
}

export interface LiveProcedure {
  type: "startup" | "linecheck" | "backup" | "emergency";
  title: string;
  steps: LiveStep[];
}

export function generateStartupProcedure(
  tops: GearItem[],
  subs: GearItem[],
  dspUnits: GearItem[],
  amps: GearItem[],
  acoustics: AcousticsResult
): LiveProcedure {
  const isActive = tops.every(t => t.active) && subs.every(s => s.active);
  const hasDSP = dspUnits.length > 0;
  const hasAmp = amps.length > 0;
  const highRT60 = acoustics.rt60Audience > 2;

  const steps: LiveStep[] = [
    {
      id: "s1",
      order: 1,
      title: "Fader Maestro a Cero",
      description: "Bajá el fader maestro a -∞ antes de encender cualquier audio",
      category: "power",
      critical: true,
      done: false,
    },
    {
      id: "s2",
      order: 2,
      title: "Encender Consola",
      description: "Encendé la consola de mezcla y esperá que inicie completamente",
      category: "power",
      critical: true,
      done: false,
    },
    {
      id: "s3",
      order: 3,
      title: "Verificar Alimentación Phantom",
      description: "Asegurate de que la alimentación phantom esté APAGADA antes de conectar micrófonos de condensador",
      category: "check",
      critical: true,
      done: false,
    },
    ...(hasDSP
      ? [{
          id: "s4",
          order: 4,
          title: `Encender DSP (${dspUnits[0]?.brand ?? ""} ${dspUnits[0]?.model ?? ""})`,
          description: "Encendé el procesador DSP y verificá que todas las salidas estén activas",
          category: "power" as const,
          critical: true,
          done: false,
        }]
      : []),
    ...(!isActive && hasAmp
      ? [{
          id: "s5",
          order: 5,
          title: "Encender Amplificadores",
          description: "Encendé los amplificadores de potencia después de que el DSP esté funcionando",
          category: "power" as const,
          critical: true,
          done: false,
        }]
      : []),
    {
      id: "s6",
      order: 6,
      title: "Encender Sistema PA",
      description: isActive ? "Encendé tops y subs activos" : "Verificá la señal PA desde los amplificadores",
      category: "power",
      critical: true,
      done: false,
    },
    {
      id: "s7",
      order: 7,
      title: "Prueba de Ruido Rosa",
      description: "Enviá ruido rosa desde la consola — verificá que todos los altavoces estén activos a bajo nivel",
      category: "tune",
      critical: false,
      done: false,
    },
    {
      id: "s8",
      order: 8,
      title: "Verificar Polaridad TOPS / SUBS",
      description: "Caminá hasta el punto de cruce — tops y subs deben sumar, no cancelarse",
      category: "verify",
      critical: true,
      done: false,
    },
    ...(highRT60
      ? [{
          id: "s9-rt60",
          order: 9,
          title: "Evaluación Acústica",
          description: "RT60 ALTO detectado — recorré el recinto con señal de prueba, identificá las frecuencias problemáticas",
          category: "tune" as const,
          critical: false,
          done: false,
        }]
      : []),
    {
      id: "s10",
      order: 10,
      title: "Recorrer el Recinto",
      description: "Caminá todas las zonas del público con música — verificá cobertura y balance",
      category: "verify",
      critical: false,
      done: false,
    },
    {
      id: "s11",
      order: 11,
      title: "Sistema Listo",
      description: "Subí el fader maestro a 0 dB — sistema listo para prueba de línea",
      category: "verify",
      critical: false,
      done: false,
    },
  ];

  return {
    type: "startup",
    title: "Arranque del Sistema",
    steps,
  };
}

export function generateLineCheckProcedure(): LiveProcedure {
  return {
    type: "linecheck",
    title: "Prueba de Línea",
    steps: [
      { id: "lc1", order: 1, title: "Anunciar Prueba de Línea", description: "Avisá al equipo de escenario — comienza la prueba de línea", category: "check", critical: false, done: false },
      { id: "lc2", order: 2, title: "Verificar Cajas DI", description: "Enviá señal desde cada DI — verificá la estructura de ganancia", category: "check", critical: true, done: false },
      { id: "lc3", order: 3, title: "Activar Phantom Power", description: "Activá la alimentación 48V phantom solo en canales de micrófono de condensador", category: "check", critical: true, done: false },
      { id: "lc4", order: 4, title: "Verificar Micrófonos Vocales", description: "Comprobá cada micrófono vocal — verificá HPF y EQ básico", category: "check", critical: true, done: false },
      { id: "lc5", order: 5, title: "Configurar Mezclas de Monitor", description: "Armá la mezcla de monitor básica con cada artista", category: "tune", critical: false, done: false },
      { id: "lc6", order: 6, title: "Verificar Retroalimentación", description: "Abrí gradualmente los monitores — identificá y aplicá notch en las frecuencias de feedback", category: "tune", critical: true, done: false },
      { id: "lc7", order: 7, title: "Verificar Playback", description: "Confirmá el enrutamiento de pistas de fondo y sistema de reproducción", category: "verify", critical: false, done: false },
      { id: "lc8", order: 8, title: "Preescucha de Mezcla Completa", description: "Corré todos los canales simultáneamente — verificá ganancia, balance y respuesta del PA", category: "verify", critical: false, done: false },
    ],
  };
}

export function generateBackupProcedure(
  tops: GearItem[],
  dspUnits: GearItem[],
  amps: GearItem[]
): LiveProcedure {
  const isActive = tops.every(t => t.active);
  const hasDSP = dspUnits.length > 0;
  const hasAmp = amps.length > 0;

  const steps: LiveStep[] = [
    {
      id: "bk1", order: 1,
      title: "Consola de Respaldo",
      description: "Mantener una consola secundaria pre-patcheada lista para cambio inmediato. Verificar que la sesión esté copiada.",
      category: "check", critical: true, done: false,
    },
    {
      id: "bk2", order: 2,
      title: "Fuentes de Audio de Respaldo",
      description: "Reproducción USB/SD en caso de falla del laptop. Verificar que las pistas estén cargadas y listas.",
      category: "check", critical: true, done: false,
    },
    {
      id: "bk3", order: 3,
      title: "Frecuencias Inalámbricas de Reserva",
      description: "Escanear canales de respaldo en todos los sistemas inalámbricos antes del show. Documentar frecuencias libres.",
      category: "verify", critical: false, done: false,
    },
    {
      id: "bk4", order: 4,
      title: "Cajas DI Pasivas de Reserva",
      description: "Llevar cajas DI pasivas de repuesto para cada instrumento activo en el patch.",
      category: "check", critical: false, done: false,
    },
    ...(hasDSP ? [{
      id: "bk5", order: 5,
      title: `Preset de Respaldo en DSP (${dspUnits[0]?.brand ?? ""} ${dspUnits[0]?.model ?? ""})`,
      description: "Guardar un preset de seguridad en el DSP antes del show. En caso de falla de la consola, el DSP puede mantener el sistema activo.",
      category: "verify" as const, critical: true, done: false,
    }] : []),
    ...(!isActive && hasAmp ? [{
      id: "bk6", order: 6,
      title: "Amplificadores de Respaldo",
      description: "Tener un amplificador de respaldo disponible para el sistema pasivo. Verificar conexiones y nivel de ganancia.",
      category: "check" as const, critical: true, done: false,
    }] : []),
    {
      id: "bk7", order: 7,
      title: "Cables de Respaldo",
      description: "Cables XLR, de altavoz y de alimentación probados en el escenario. Mínimo 2 de cada tipo crítico.",
      category: "check", critical: false, done: false,
    },
    {
      id: "bk8", order: 8,
      title: "Ruteo de Emergencia",
      description: "Conocer el ruteo directo salida de consola → PA sin pasar por DSP. En caso de falla del procesador, activar este modo.",
      category: "verify", critical: true, done: false,
    },
  ];

  return { type: "backup", title: "Lista de Respaldo", steps };
}

export function generateEmergencyProcedure(): LiveProcedure {
  const steps: LiveStep[] = [
    {
      id: "em1", order: 1,
      title: "MUTEAR el Fader Maestro",
      description: "Bajar el fader maestro a −∞ inmediatamente. Esta es siempre la primera acción ante cualquier emergencia.",
      category: "emergency", critical: true, done: false,
    },
    {
      id: "em2", order: 2,
      title: "Mutear Todos los Envíos a Monitor",
      description: "Bajar o mutear todos los buses de monitor para evitar feedback durante la intervención.",
      category: "emergency", critical: true, done: false,
    },
    {
      id: "em3", order: 3,
      title: "Notificar al Equipo",
      description: "Avisar al personal del recinto e ingeniero de FOH. No actuar en solitario — coordinar antes de cualquier intervención.",
      category: "emergency", critical: false, done: false,
    },
    {
      id: "em4", order: 4,
      title: "Evaluar la Causa",
      description: "Identificar: ¿feedback? ¿sobrecarga? ¿falla de equipo? ¿problema eléctrico? No continuar hasta determinar la causa.",
      category: "emergency", critical: true, done: false,
    },
    {
      id: "em5", order: 5,
      title: "Restablecer Gradualmente (si es seguro)",
      description: "Si es seguro continuar: subir los faders de a poco en orden — primero monitores, luego FOH. Verificar en cada paso.",
      category: "emergency", critical: false, done: false,
    },
    {
      id: "em6", order: 6,
      title: "Apagado Completo (si no es seguro)",
      description: "Consola → DSP → Amps → PA (sistemas pasivos) / Consola → DSP → PA activos. Siempre apagar la fuente de señal antes que los amplificadores para evitar transitorios.",
      category: "emergency", critical: true, done: false,
    },
  ];

  return { type: "backup", title: "Protocolo de Emergencia", steps };
}
