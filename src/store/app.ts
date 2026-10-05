import { ENGINE_VERSION } from "@/lib/audio/audit-evaluator";
import {
  DSP_DATABASE,
  MONITORS_DATABASE,
  SUBS_DATABASE,
  TOPS_DATABASE,
} from "@/lib/audio/gear-database";
import {
  canonical,
  clone,
  invalidateReviews,
  newAudit,
  type AuditDocument,
  type Measurement,
} from "@/lib/audit/document";
import { toast } from "sonner";
// SoundMap Global Store — Zustand
import type { AcousticsResult, RoomScanInput } from "@/lib/audio/acoustics.ts";
import { calculateAcoustics } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { Template } from "@/lib/audio/templates.ts";
import { localDatabase } from "@/lib/persistence";
import {
  sanitizeLayout,
  type SpeakerLayout,
  type SpeakerPlacement,
} from "@/lib/speaker-layout.ts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface Scene {
  audit?: AuditDocument;
  revision?: number;
  parentRevisionId?: string;
  engineVersion?: string;
  stageLayout?: SpeakerLayout;
  id: string;
  /** Stable client identifier used for cloud sync idempotency. */
  clientId?: string;
  name: string;
  createdAt: string;
  /** ms since epoch — last local edit; used for LWW conflict resolution. */
  updatedAt?: number;
  room: RoomScanInput;
  acoustics: AcousticsResult;
  tops: GearItem[];
  subs: GearItem[];
  monitors: GearItem[];
  dspUnits: GearItem[];
  amps: GearItem[];
  mixers: GearItem[];
  mics: GearItem[];
}

// ── Demo venue preset ─────────────────────────────────────────────────────────
const DEMO_ROOM: RoomScanInput = {
  name: "The Warehouse Club",
  length: 32,
  width: 22,
  height: 6,
  capacity: 400,
  ceilingType: "industrial",
  wallMaterial: "brick",
  floorType: "concrete",
  windowCount: 2,
};

const DEMO_TOPS: GearItem[] = [
  { ...TOPS_DATABASE.find((g) => g.id === "jbl-srx906")!, quantity: 4 },
];
const DEMO_SUBS: GearItem[] = [
  { ...SUBS_DATABASE.find((g) => g.id === "qsc-kla181")!, quantity: 4 },
];
const DEMO_MONITORS: GearItem[] = [
  { ...MONITORS_DATABASE.find((g) => g.id === "qsc-k10-2")!, quantity: 2 },
];
const DEMO_DSP: GearItem[] = [{ ...DSP_DATABASE[0], quantity: 1 }];
const DEMO_AMPS: GearItem[] = []; // The demo's loudspeakers are self-powered.

/**
 * Clave estable de una escena. `clientId` es el identificador local que
 * sobrevive a la sincronización; `id` puede ser reemplazado por el del
 * servidor. Buscar siempre por AMBOS evita el bug de escenas sincronizadas que
 * no se podían renombrar ni borrar.
 */
export function sceneMatches(
  scene: Pick<Scene, "id" | "clientId">,
  key: string,
): boolean {
  return scene.id === key || scene.clientId === key;
}

export interface AppState {
  audit: AuditDocument;
  updateAudit: (changes: Partial<AuditDocument>) => void;
  addMeasurement: (measurement: Measurement) => void;
  saveRevision: () => void;
  duplicateScene: (id: string) => void;
  replaceSpeakerLayout: (layout: SpeakerLayout) => void;
  // Current room
  room: RoomScanInput | null;
  acoustics: AcousticsResult | null;

  // Current gear
  tops: GearItem[];
  subs: GearItem[];
  monitors: GearItem[];
  dspUnits: GearItem[];
  amps: GearItem[];
  mixers: GearItem[];
  mics: GearItem[];

  stageLayout: SpeakerLayout;
  activeSceneId: string | null;
  updateSpeakerPlacement: (id: string, placement: SpeakerPlacement) => void;
  resetSpeakerLayout: () => void;

  // Scenes
  scenes: Scene[];

  // UI state
  isDemoMode: boolean;
  hasSeenOnboarding: boolean;
  hasSeenTour: boolean;
  tourActive: boolean;
  /** Last visited wizard step id ("room" | "pa" | "dsp" | "patch" | "save"). */
  lastWizardStep: string | null;

  // Actions
  /**
   * Aplica un escaneo de sala. Por defecto CONSERVA el equipo ya seleccionado
   * (el wizard es lineal pero se navega hacia atrás: re-escanear no debe
   * destruir el PA/DSP/patch). Pasar `resetGear: true` sólo para empezar de cero.
   */
  applyRoomScan: (
    room: RoomScanInput,
    acoustics: AcousticsResult,
    opts?: { resetGear?: boolean },
  ) => void;
  setGear: (category: GearItem["category"], items: GearItem[]) => void;
  toggleGearItem: (category: GearItem["category"], item: GearItem) => void;
  setGearItemQuantity: (
    category: GearItem["category"],
    itemId: string,
    quantity: number,
  ) => void;
  saveScene: (name: string) => void;
  upsertScene: (scene: Scene) => void;
  renameScene: (id: string, name: string) => void;
  loadScene: (id: string) => void;
  deleteScene: (id: string) => void;
  resetSystem: () => void;
  loadDemoVenue: () => void;
  applyTemplate: (tpl: Template) => void;
  dismissOnboarding: () => void;
  startTour: () => void;
  endTour: () => void;
  setLastWizardStep: (step: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      audit: newAudit(),
      updateAudit: (changes) =>
        set((s) => {
          const keys =
            changes.dsp || changes.protection
              ? ["dsp", "patch", "findings", "save"]
              : changes.routes || changes.channels
                ? ["patch", "findings", "save"]
                : changes.findings
                  ? ["findings", "save"]
                  : changes.measurements
                    ? ["measurement", "findings", "save"]
                    : [];
          return {
            audit: { ...invalidateReviews(s.audit, keys), ...clone(changes) },
          };
        }),
      addMeasurement: (measurement) =>
        set((s) => ({
          audit: {
            ...invalidateReviews(s.audit, ["measurement", "findings", "save"]),
            measurements: [...s.audit.measurements, clone(measurement)].slice(
              -100,
            ),
          },
        })),
      saveRevision: () => {
        const s = get();
        const active = s.scenes.find((sc) =>
          sceneMatches(sc, s.activeSceneId ?? ""),
        );
        s.saveScene(active?.name ?? s.room?.name ?? "Auditoría");
      },
      duplicateScene: (id) => {
        const s = get(),
          source = s.scenes.find((sc) => sceneMatches(sc, id));
        if (!source) return;
        s.loadScene(id);
        set({
          audit: {
            ...get().audit,
            id: newAudit().id,
            createdAt: new Date().toISOString(),
          },
          activeSceneId: null,
        });
        get().saveScene(`${source.name} (copia)`);
      },
      replaceSpeakerLayout: (stageLayout) =>
        set((s) => ({
          stageLayout: sanitizeLayout(stageLayout),
          audit: invalidateReviews(s.audit, [
            "pa",
            "dsp",
            "patch",
            "findings",
            "save",
          ]),
        })),
      room: null,
      acoustics: null,
      tops: [],
      subs: [],
      monitors: [],
      dspUnits: [],
      amps: [],
      mixers: [],
      mics: [],
      stageLayout: {},
      activeSceneId: null,
      scenes: [],
      isDemoMode: false,
      hasSeenOnboarding: false,
      hasSeenTour: false,
      tourActive: false,
      lastWizardStep: null,

      updateSpeakerPlacement: (id, placement) => {
        const state = get();
        const stageLayout = sanitizeLayout({
          ...state.stageLayout,
          [id]: { ...state.stageLayout[id], ...placement },
        });
        set({
          stageLayout,
          audit: invalidateReviews(state.audit, [
            "pa",
            "dsp",
            "patch",
            "findings",
            "save",
          ]),
        }); // Edit the draft; saved revisions remain immutable.
      },
      resetSpeakerLayout: () => {
        set((s) => ({
          stageLayout: {},
          audit: invalidateReviews(s.audit, [
            "pa",
            "dsp",
            "patch",
            "findings",
            "save",
          ]),
        }));
      },

      applyRoomScan: (room, acoustics, opts) => {
        // Antes esto vaciaba SIEMPRE las 7 categorías de equipo: volver al paso
        // "Recinto" del wizard y re-escanear borraba en silencio todo el rig.
        const clearedGear = opts?.resetGear
          ? {
              tops: [],
              subs: [],
              monitors: [],
              dspUnits: [],
              amps: [],
              mixers: [],
              mics: [],
            }
          : {};
        set({
          room,
          acoustics,
          audit: invalidateReviews(get().audit, [
            "room",
            "pa",
            "dsp",
            "patch",
            "measurement",
            "findings",
            "save",
          ]),
          isDemoMode: false,
          ...clearedGear,
          ...(opts?.resetGear ? { stageLayout: {}, activeSceneId: null } : {}),
        });
      },

      setGear: (category, items) => {
        const map: Record<GearItem["category"], keyof AppState> = {
          tops: "tops",
          subs: "subs",
          monitors: "monitors",
          dsp: "dspUnits",
          amp: "amps",
          mixer: "mixers",
          mic: "mics",
        };
        const bounded = items.map((g) => ({
          ...g,
          quantity: Math.max(1, Math.min(64, Math.floor(g.quantity ?? 1))),
        }));
        if (bounded.length > (category === "mic" ? 128 : 64)) {
          toast.error("Límite de modelos por categoría alcanzado");
          return;
        }
        const physical = [
          ...get().tops,
          ...get().subs,
          ...get().monitors,
        ].filter((g) => g.category !== category);
        if (
          ["tops", "subs", "monitors"].includes(category) &&
          [...physical, ...bounded].reduce((n, g) => n + (g.quantity ?? 1), 0) >
            256
        ) {
          toast.error("Máximo 256 cajas físicas por expediente");
          return;
        }
        items = bounded;
        set({
          audit: invalidateReviews(get().audit, [
            "pa",
            "dsp",
            "patch",
            "findings",
            "save",
          ]),
          [map[category]]: items,
        } as Partial<AppState>);
      },

      toggleGearItem: (category, item) => {
        const state = get();
        const map: Record<GearItem["category"], GearItem[]> = {
          tops: state.tops,
          subs: state.subs,
          monitors: state.monitors,
          dsp: state.dspUnits,
          amp: state.amps,
          mixer: state.mixers,
          mic: state.mics,
        };
        const current = map[category];
        const exists = current.find((g) => g.id === item.id);
        const updated = exists
          ? current.filter((g) => g.id !== item.id)
          : [...current, { ...item, quantity: 1 }];

        get().setGear(category, updated);
      },

      setGearItemQuantity: (category, itemId, quantity) => {
        const state = get();
        const keyMap: Record<GearItem["category"], keyof AppState> = {
          tops: "tops",
          subs: "subs",
          monitors: "monitors",
          dsp: "dspUnits",
          amp: "amps",
          mixer: "mixers",
          mic: "mics",
        };
        const key = keyMap[category];
        const current = state[key] as GearItem[];
        if (!Number.isFinite(quantity)) return;
        quantity = Math.min(64, Math.floor(quantity));
        get().setGear(
          category,
          quantity <= 0
            ? current.filter((g) => g.id !== itemId)
            : current.map((g) => (g.id === itemId ? { ...g, quantity } : g)),
        );
      },

      saveScene: (name) => {
        const state = get();
        if (!state.room || !state.acoustics) return;
        if (state.scenes.length >= 500) {
          toast.error(
            "Límite de 500 revisiones. Exporta un backup y elimina revisiones antes de guardar.",
          );
          return;
        }
        const now = Date.now();
        // Date.now() solo colisiona si se guardan dos escenas en el mismo ms.
        const id = `scene-${now}-${Math.random().toString(36).slice(2, 8)}`;
        const scene: Scene = {
          id,
          audit: clone(state.audit),
          revision:
            1 +
            Math.max(
              0,
              ...state.scenes
                .filter((s) => s.audit?.id === state.audit.id)
                .map((s) => s.revision ?? 1),
            ),
          parentRevisionId: state.activeSceneId ?? undefined,
          engineVersion: ENGINE_VERSION,
          clientId: id,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: now,
          stageLayout: state.stageLayout,
          room: state.room,
          acoustics: state.acoustics,
          tops: state.tops,
          subs: state.subs,
          monitors: state.monitors,
          dspUnits: state.dspUnits,
          amps: state.amps,
          mixers: state.mixers,
          mics: state.mics,
        };
        set((s) => ({
          scenes: [clone(scene), ...s.scenes],
          activeSceneId: id,
          isDemoMode: false,
        }));
      },

      upsertScene: (scene) => {
        set((s) => {
          const cid = scene.clientId ?? scene.id;
          const idx = s.scenes.findIndex((x) => sceneMatches(x, cid));
          const withClientId: Scene = {
            ...scene,
            clientId: cid,
            id: scene.id ?? cid,
          };
          if (idx === -1) return { scenes: [withClientId, ...s.scenes] };
          const next = [...s.scenes];
          next[idx] = { ...next[idx], ...withClientId };
          return { scenes: next };
        });
      },

      renameScene: (id, name) => {
        set((s) => ({
          scenes: s.scenes.map((sc) =>
            sceneMatches(sc, id) ? { ...sc, name, updatedAt: Date.now() } : sc,
          ),
        }));
      },

      loadScene: (id) => {
        const scene = get().scenes.find((s) => sceneMatches(s, id));
        if (!scene) return;
        set({
          audit: scene.audit ? clone(scene.audit) : newAudit(),
          stageLayout: sanitizeLayout(scene.stageLayout),
          activeSceneId: scene.clientId ?? scene.id,
          room: scene.room,
          acoustics: calculateAcoustics(scene.room),
          tops: scene.tops,
          subs: scene.subs,
          monitors: scene.monitors,
          dspUnits: scene.dspUnits,
          amps: scene.amps,
          mixers: scene.mixers,
          mics: scene.mics,
          isDemoMode: false,
        });
      },

      deleteScene: (id) => {
        set((s) => ({
          scenes: s.scenes.filter((sc) => !sceneMatches(sc, id)),
          activeSceneId: s.scenes.some(
            (sc) =>
              sceneMatches(sc, id) && sceneMatches(sc, s.activeSceneId ?? ""),
          )
            ? null
            : s.activeSceneId,
        }));
      },

      resetSystem: () => {
        set({
          audit: newAudit(),
          stageLayout: {},
          activeSceneId: null,
          room: null,
          acoustics: null,
          tops: [],
          subs: [],
          monitors: [],
          dspUnits: [],
          amps: [],
          mixers: [],
          mics: [],
          isDemoMode: false,
        });
      },

      loadDemoVenue: () => {
        const acoustics = calculateAcoustics(DEMO_ROOM);
        set({
          audit: newAudit(),
          stageLayout: {},
          activeSceneId: null,
          room: DEMO_ROOM,
          acoustics,
          tops: DEMO_TOPS,
          subs: DEMO_SUBS,
          monitors: DEMO_MONITORS,
          dspUnits: DEMO_DSP,
          amps: DEMO_AMPS,
          mixers: [],
          mics: [],
          isDemoMode: true,
        });
      },

      applyTemplate: (tpl) => {
        const acoustics = calculateAcoustics(tpl.room);
        set({
          audit: newAudit(),
          stageLayout: {},
          activeSceneId: null,
          room: tpl.room,
          acoustics,
          tops: tpl.tops,
          subs: tpl.subs,
          monitors: tpl.monitors,
          dspUnits: tpl.dspUnits,
          amps: tpl.amps,
          mixers: tpl.mixers,
          mics: tpl.mics,
          isDemoMode: false,
        });
      },

      dismissOnboarding: () => {
        set({ hasSeenOnboarding: true });
      },

      startTour: () => {
        set({ tourActive: true });
      },

      endTour: () => {
        set({ tourActive: false, hasSeenTour: true });
      },

      setLastWizardStep: (step) => {
        set({ lastWizardStep: step });
      },
    }),
    {
      storage: createJSONStorage(() => localDatabase),
      skipHydration: true,
      name: "soundmap-store",
      version: 4,
      migrate: (persistedState: unknown, version: number) => {
        // v0/v1/v2 → v3: preserve scenes and add shared speaker layout.
        const s = (persistedState ?? {}) as Partial<AppState>;
        if (version < 4) {
          return {
            ...s,
            audit: s.audit ?? newAudit(),
            acoustics: s.room ? calculateAcoustics(s.room) : null,
            stageLayout: sanitizeLayout(s.stageLayout),
            activeSceneId: s.activeSceneId ?? null,
            tops: Array.isArray(s.tops) ? s.tops : [],
            subs: Array.isArray(s.subs) ? s.subs : [],
            monitors: Array.isArray(s.monitors) ? s.monitors : [],
            dspUnits: Array.isArray(s.dspUnits) ? s.dspUnits : [],
            amps: Array.isArray(s.amps) ? s.amps : [],
            mixers: Array.isArray(s.mixers) ? s.mixers : [],
            mics: Array.isArray(s.mics) ? s.mics : [],
            scenes: Array.isArray(s.scenes) ? s.scenes : [],
            isDemoMode: !!s.isDemoMode,
            hasSeenOnboarding: !!s.hasSeenOnboarding,
            hasSeenTour: !!s.hasSeenTour,
            tourActive: false,
          } as AppState;
        }
        return s as AppState;
      },
      // Never persist ephemeral UI flags
      partialize: (state) => {
        const { tourActive: _tourActive, ...rest } = state;
        return rest as AppState;
      },
    },
  ),
);

export function draftFingerprint(state: Partial<AppState> | Scene): string {
  const keys = [
    "room",
    "tops",
    "subs",
    "monitors",
    "dspUnits",
    "amps",
    "mixers",
    "mics",
    "stageLayout",
    "audit",
  ] as const;
  return canonical(Object.fromEntries(keys.map((k) => [k, state[k]])));
}
export function hasUnsavedRevision(state: AppState): boolean {
  if (!state.room) return false;
  const scene = state.scenes.find((s) =>
    sceneMatches(s, state.activeSceneId ?? ""),
  );
  return !scene || draftFingerprint(scene) !== draftFingerprint(state);
}
