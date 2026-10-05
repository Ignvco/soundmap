import { reviewComplete, type Review } from "@/lib/audit/document";
export const WIZARD_STEPS = [
  { id: "room", label: "Recinto", hint: "Dimensiones y materiales" },
  { id: "pa", label: "PA", hint: "Inventario y montaje" },
  { id: "dsp", label: "DSP", hint: "Propuesta y edición" },
  { id: "patch", label: "Ruteo", hint: "Canales y conexiones" },
  { id: "measurement", label: "Medir", hint: "Captura y calibración" },
  { id: "findings", label: "Revisar", hint: "Evidencias y acciones" },
  { id: "save", label: "Informe", hint: "Revisión y exportación" },
] as const;
export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];
export interface WizardProgressInput {
  hasRoom: boolean;
  reviews: Record<string, Review>;
  currentRevisionSaved: boolean;
}
export type WizardCompletion = Record<WizardStepId, boolean>;
export function wizardCompletion(s: WizardProgressInput): WizardCompletion {
  return Object.fromEntries(
    WIZARD_STEPS.map(({ id }) => [
      id,
      s.hasRoom &&
        reviewComplete(s.reviews[id]) &&
        (id !== "save" || s.currentRevisionSaved),
    ]),
  ) as WizardCompletion;
}
export function wizardBlocker(
  step: WizardStepId,
  s: WizardProgressInput,
): string | null {
  return step === "room" || s.hasRoom
    ? null
    : "Registra primero las dimensiones del recinto.";
}
export function firstIncompleteStep(s: WizardProgressInput): WizardStepId {
  if (!s.hasRoom) return "room";
  const done = wizardCompletion(s);
  return WIZARD_STEPS.find((s) => !done[s.id])?.id ?? "room";
}
export function wizardProgress(s: WizardProgressInput): number {
  return (
    Object.values(wizardCompletion(s)).filter(Boolean).length /
    WIZARD_STEPS.length
  );
}
