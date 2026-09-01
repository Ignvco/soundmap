// Lógica de flujo del wizard de diseño.
//
// Vive fuera del componente a propósito: son reglas de dominio ("¿puedo entrar
// a este paso?", "¿está completo?"), no presentación. Separarlas permite
// testearlas sin jsdom ni testing-library — es decir, sin agregar dependencias.
//
// El bug que motivó esto: `completed` tenía `patch: false, save: false`
// hardcodeados dentro del JSX, así que los pasos 4 y 5 nunca se marcaban como
// hechos por más que el usuario los completara. Una regla enterrada en el render
// no la testea nadie.

export const WIZARD_STEPS = [
  { id: "room",  label: "Recinto", hint: "Dimensiones + material" },
  { id: "pa",    label: "PA",      hint: "Tops + subs + monitors" },
  { id: "dsp",   label: "DSP",     hint: "EQ + xover automáticos" },
  { id: "patch", label: "Patch",   hint: "Canales + micrófonos" },
  { id: "save",  label: "Guardar", hint: "Preview + exportar" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Lo mínimo del store que el flujo necesita para decidir. */
export interface WizardProgressInput {
  hasRoom: boolean;
  gearCount: number;
  dspCount: number;
  micCount: number;
  sceneCount: number;
}

export type WizardCompletion = Record<WizardStepId, boolean>;

/** Qué pasos están completos, derivado del estado real (nada hardcodeado). */
export function wizardCompletion(s: WizardProgressInput): WizardCompletion {
  return {
    room:  s.hasRoom,
    pa:    s.gearCount > 0,
    dsp:   s.dspCount > 0,
    patch: s.micCount > 0,
    save:  s.sceneCount > 0,
  };
}

/**
 * Por qué un paso está bloqueado, o `null` si se puede entrar.
 *
 * Devuelve el texto que ve el usuario: el objetivo es que la app explique qué
 * falta, no que muestre una pantalla vacía sin motivo.
 */
export function wizardBlocker(step: WizardStepId, s: WizardProgressInput): string | null {
  const hasGear = s.gearCount > 0;
  switch (step) {
    case "room":
      return null;
    case "pa":
      return s.hasRoom ? null : "Cargá primero las dimensiones del recinto.";
    case "dsp":
      if (!s.hasRoom) return "Cargá primero las dimensiones del recinto.";
      return hasGear ? null : "Elegí al menos un top o un sub antes de calcular el DSP.";
    case "patch":
      return s.hasRoom ? null : "Cargá primero las dimensiones del recinto.";
    case "save":
      if (!s.hasRoom) return "Cargá primero las dimensiones del recinto.";
      return hasGear ? null : "Necesitás recinto y PA para generar el reporte.";
  }
}

/** Primer paso sin completar — a dónde mandar al usuario para desbloquearse. */
export function firstIncompleteStep(s: WizardProgressInput): WizardStepId {
  const done = wizardCompletion(s);
  return WIZARD_STEPS.find((step) => !done[step.id])?.id ?? "room";
}

/** Progreso 0–1, para la barra. */
export function wizardProgress(s: WizardProgressInput): number {
  const done = wizardCompletion(s);
  const n = WIZARD_STEPS.filter((step) => done[step.id]).length;
  return n / WIZARD_STEPS.length;
}
