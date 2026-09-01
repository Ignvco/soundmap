// Primer test de flujo de UI del proyecto. Los otros 140 son todos de motores
// de audio; el wizard —que es por donde pasa todo usuario— no tenía ninguno, y
// por eso el bug del progreso hardcodeado sobrevivió.
import { describe, it, expect } from "vitest";
import {
  WIZARD_STEPS,
  wizardCompletion,
  wizardBlocker,
  firstIncompleteStep,
  wizardProgress,
  type WizardProgressInput,
} from "../flow.ts";

const empty: WizardProgressInput = {
  hasRoom: false, gearCount: 0, dspCount: 0, micCount: 0, sceneCount: 0,
};
const full: WizardProgressInput = {
  hasRoom: true, gearCount: 4, dspCount: 1, micCount: 8, sceneCount: 2,
};

describe("wizardCompletion", () => {
  it("no marca nada con el store vacío", () => {
    expect(Object.values(wizardCompletion(empty)).every((v) => !v)).toBe(true);
  });

  it("marca todo cuando el usuario completó todo", () => {
    expect(Object.values(wizardCompletion(full)).every(Boolean)).toBe(true);
  });

  it("marca patch y save de verdad, no hardcodeados en false", () => {
    // La regresión exacta: antes `patch: false, save: false` estaban escritos a
    // mano dentro del JSX y los pasos 4 y 5 NUNCA se completaban.
    expect(wizardCompletion({ ...empty, micCount: 3 }).patch).toBe(true);
    expect(wizardCompletion({ ...empty, sceneCount: 1 }).save).toBe(true);
  });

  it("cubre todos los pasos declarados, sin faltantes ni sobrantes", () => {
    const keys = Object.keys(wizardCompletion(empty)).sort();
    expect(keys).toEqual(WIZARD_STEPS.map((s) => s.id).sort());
  });
});

describe("wizardBlocker", () => {
  it("el primer paso nunca está bloqueado", () => {
    expect(wizardBlocker("room", empty)).toBeNull();
  });

  it("bloquea todo lo demás sin recinto", () => {
    for (const step of ["pa", "dsp", "patch", "save"] as const) {
      expect(wizardBlocker(step, empty)).not.toBeNull();
    }
  });

  it("bloquea DSP si hay recinto pero no hay equipo", () => {
    expect(wizardBlocker("dsp", { ...empty, hasRoom: true })).not.toBeNull();
    expect(wizardBlocker("dsp", { ...empty, hasRoom: true, gearCount: 1 })).toBeNull();
  });

  it("no bloquea nada cuando está todo cargado", () => {
    for (const step of WIZARD_STEPS) {
      expect(wizardBlocker(step.id, full)).toBeNull();
    }
  });

  it("el mensaje siempre le dice al usuario qué hacer", () => {
    for (const step of ["pa", "dsp", "save"] as const) {
      const msg = wizardBlocker(step, empty);
      expect(msg).toBeTruthy();
      expect(msg!.length).toBeGreaterThan(15);
      expect(msg!.endsWith(".")).toBe(true);
    }
  });

  it("nunca deja al usuario sin salida: si un paso bloquea, hay a dónde ir", () => {
    const estados: WizardProgressInput[] = [
      empty,
      { ...empty, hasRoom: true },
      { ...empty, hasRoom: true, gearCount: 2 },
      { ...empty, hasRoom: true, gearCount: 2, dspCount: 1 },
    ];
    for (const s of estados) {
      for (const step of WIZARD_STEPS) {
        if (wizardBlocker(step.id, s) !== null) {
          const destino = firstIncompleteStep(s);
          // El destino tiene que ser accesible, o el botón de rescate no sirve.
          expect(wizardBlocker(destino, s)).toBeNull();
        }
      }
    }
  });
});

describe("firstIncompleteStep", () => {
  it("manda al recinto cuando no hay nada", () => {
    expect(firstIncompleteStep(empty)).toBe("room");
  });

  it("avanza a medida que se completan pasos", () => {
    expect(firstIncompleteStep({ ...empty, hasRoom: true })).toBe("pa");
    expect(firstIncompleteStep({ ...empty, hasRoom: true, gearCount: 2 })).toBe("dsp");
  });

  it("no rompe cuando ya está todo hecho", () => {
    expect(WIZARD_STEPS.map((s) => s.id)).toContain(firstIncompleteStep(full));
  });
});

describe("wizardProgress", () => {
  it("va de 0 a 1 y llega de verdad al final", () => {
    expect(wizardProgress(empty)).toBe(0);
    // Antes esto topaba en 0.6 para siempre, porque patch y save nunca se marcaban.
    expect(wizardProgress(full)).toBe(1);
  });

  it("es monótono al ir completando pasos", () => {
    const secuencia: WizardProgressInput[] = [
      empty,
      { ...empty, hasRoom: true },
      { ...empty, hasRoom: true, gearCount: 2 },
      { ...empty, hasRoom: true, gearCount: 2, dspCount: 1 },
      { ...empty, hasRoom: true, gearCount: 2, dspCount: 1, micCount: 4 },
      full,
    ];
    let prev = -1;
    for (const s of secuencia) {
      const p = wizardProgress(s);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
  });
});
