import type { AppState } from "@/store/app";
import { calculateDynamics } from "../audio/dynamics";
import { layoutSpeakers } from "../speaker-layout";
import { clone } from "./document";

/** Recheck electrical references against the CURRENT physical routing. Stored
 * thresholds are historical evidence, never authority after an input change. */
export function reviewedDSP(
  state: Pick<
    AppState,
    | "audit"
    | "room"
    | "acoustics"
    | "tops"
    | "subs"
    | "monitors"
    | "amps"
    | "stageLayout"
  >,
) {
  const { audit, room, acoustics } = state;
  if (!audit.dsp || !room || !acoustics) return undefined;
  const speakers = layoutSpeakers(
    room,
    state.tops,
    state.subs,
    state.monitors,
    state.stageLayout,
  );
  return {
    ...clone(audit.dsp),
    outputs: audit.dsp.outputs.map((output) => {
      const speaker = speakers.find((s) => s.id === output.speakerId);
      const c = audit.protection[output.speakerId ?? ""];
      const routes = audit.routes.filter((r) =>
        r.speakerIds.includes(output.speakerId ?? ""),
      );
      const route = routes[0];
      const assignments = audit.routes.filter(
        (r) =>
          c &&
          r.amplifierId === c.amplifierId &&
          r.amplifierUnit === c.amplifierUnit &&
          r.channel === c.channel,
      );
      const routeValid =
        c &&
        routes.length === 1 &&
        route.outputId === output.id &&
        route.amplifierId === c.amplifierId &&
        route.amplifierUnit === c.amplifierUnit &&
        route.channel === c.channel &&
        assignments.length === 1 &&
        route.speakerIds.length === c.cabinetsInParallel &&
        new Set(route.speakerIds).size === route.speakerIds.length &&
        route.speakerIds.every((id) =>
          speakers.some((s) => s.id === id && s.gear.id === c.speakerId),
        );
      const dynamics = speaker
        ? calculateDynamics(
            speaker.gear,
            output.role,
            state.amps,
            acoustics,
            routeValid ? c : undefined,
          )
        : {
            ...clone(output.dynamics),
            limiterDb: null,
            protection: {
              status: "pending" as const,
              reasons: ["Unidad ausente del inventario actual."],
            },
          };
      if (c && !routeValid)
        dynamics.protection = {
          status: "pending",
          reasons: [
            "La ruta física debe coincidir con salida DSP, etapa, canal y todas las cajas en paralelo; resuelve asignaciones duplicadas.",
          ],
        };
      const limiterDb =
        dynamics.protection.status === "calculated"
          ? dynamics.protection.thresholdDbfs
          : null;
      return {
        ...clone(output),
        limiterDb,
        dynamics: { ...dynamics, limiterDb },
      };
    }),
  };
}
