// SoundMap Global Store — Zustand
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RoomScanInput, AcousticsResult } from "@/lib/audio/acoustics.ts";
import { calculateAcoustics } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { Template } from "@/lib/audio/templates.ts";

export interface Scene {
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
  { id: "jbl-srx906", brand: "JBL", model: "SRX906LA", category: "tops", active: true, rmsWatts: 2000, peakWatts: 4000, splMax: 140, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000, weight: 35, dspIntegrated: true, quantity: 4 },
];

const DEMO_SUBS: GearItem[] = [
  { id: "qsc-kla181", brand: "QSC", model: "KLA181", category: "subs", active: true, rmsWatts: 1000, peakWatts: 2000, splMax: 138, coverageH: 360, coverageV: 360, freqLow: 37, freqHigh: 100, weight: 37, dspIntegrated: true, quantity: 4 },
];

const DEMO_MONITORS: GearItem[] = [
  { id: "qsc-k10", brand: "QSC", model: "K10.2", category: "monitors", active: true, rmsWatts: 2000, splMax: 131, coverageH: 75, coverageV: 75, freqLow: 53, freqHigh: 20000, weight: 16, dspIntegrated: true, quantity: 2 },
];

const DEMO_DSP: GearItem[] = [
  { id: "lab-lm44", brand: "Lab Gruppen", model: "LM 44", category: "dsp", active: true, rmsWatts: 0, splMax: 0, dspIntegrated: true },
];

const DEMO_AMPS: GearItem[] = [
  { id: "lab-fp10000", brand: "Lab Gruppen", model: "FP10000Q", category: "amp", active: true, rmsWatts: 10000, splMax: 0, dspIntegrated: false },
];

/**
 * Clave estable de una escena. `clientId` es el identificador local que
 * sobrevive a la sincronización; `id` puede ser reemplazado por el del
 * servidor. Buscar siempre por AMBOS evita el bug de escenas sincronizadas que
 * no se podían renombrar ni borrar.
 */
export function sceneMatches(scene: Pick<Scene, "id" | "clientId">, key: string): boolean {
  return scene.id === key || scene.clientId === key;
}

export interface AppState {
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
  applyRoomScan: (room: RoomScanInput, acoustics: AcousticsResult, opts?: { resetGear?: boolean }) => void;
  setGear: (category: GearItem["category"], items: GearItem[]) => void;
  toggleGearItem: (category: GearItem["category"], item: GearItem) => void;
  setGearItemQuantity: (category: GearItem["category"], itemId: string, quantity: number) => void;
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
      room: null,
      acoustics: null,
      tops: [],
      subs: [],
      monitors: [],
      dspUnits: [],
      amps: [],
      mixers: [],
      mics: [],
      scenes: [],
      isDemoMode: false,
      hasSeenOnboarding: false,
      hasSeenTour: false,
      tourActive: false,
      lastWizardStep: null,

      applyRoomScan: (room, acoustics, opts) => {
        // Antes esto vaciaba SIEMPRE las 7 categorías de equipo: volver al paso
        // "Recinto" del wizard y re-escanear borraba en silencio todo el rig.
        const clearedGear = opts?.resetGear
          ? { tops: [], subs: [], monitors: [], dspUnits: [], amps: [], mixers: [], mics: [] }
          : {};
        set({ room, acoustics, isDemoMode: false, ...clearedGear });
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
        set({ [map[category]]: items } as Partial<AppState>);
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
        const exists = current.find(g => g.id === item.id);
        const updated = exists ? current.filter(g => g.id !== item.id) : [...current, { ...item, quantity: 1 }];

        const keyMap: Record<GearItem["category"], string> = {
          tops: "tops",
          subs: "subs",
          monitors: "monitors",
          dsp: "dspUnits",
          amp: "amps",
          mixer: "mixers",
          mic: "mics",
        };
        set({ [keyMap[category]]: updated } as Partial<AppState>);
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
        if (quantity <= 0) {
          set({ [key]: current.filter(g => g.id !== itemId) } as Partial<AppState>);
        } else {
          set({ [key]: current.map(g => g.id === itemId ? { ...g, quantity } : g) } as Partial<AppState>);
        }
      },

      saveScene: (name) => {
        const state = get();
        if (!state.room || !state.acoustics) return;
        const now = Date.now();
        // Date.now() solo colisiona si se guardan dos escenas en el mismo ms.
        const id = `scene-${now}-${Math.random().toString(36).slice(2, 8)}`;
        const scene: Scene = {
          id,
          clientId: id,
          name,
          createdAt: new Date().toISOString(),
          updatedAt: now,
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
        set(s => ({ scenes: [scene, ...s.scenes], isDemoMode: false }));
      },

      upsertScene: (scene) => {
        set(s => {
          const cid = scene.clientId ?? scene.id;
          const idx = s.scenes.findIndex(x => sceneMatches(x, cid));
          const withClientId: Scene = { ...scene, clientId: cid, id: scene.id ?? cid };
          if (idx === -1) return { scenes: [withClientId, ...s.scenes] };
          const next = [...s.scenes];
          next[idx] = { ...next[idx], ...withClientId };
          return { scenes: next };
        });
      },

      renameScene: (id, name) => {
        set(s => ({
          scenes: s.scenes.map(sc =>
            sceneMatches(sc, id) ? { ...sc, name, updatedAt: Date.now() } : sc,
          ),
        }));
      },

      loadScene: (id) => {
        const scene = get().scenes.find(s => sceneMatches(s, id));
        if (!scene) return;
        set({
          room: scene.room,
          acoustics: scene.acoustics,
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
        set(s => ({ scenes: s.scenes.filter(sc => !sceneMatches(sc, id)) }));
      },

      resetSystem: () => {
        set({
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
      name: "soundmap-store",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        // v0/v1 → v2: ensure new fields exist, drop unknown legacy fields.
        const s = (persistedState ?? {}) as Partial<AppState>;
        if (version < 2) {
          return {
            ...s,
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
    }
  )
);
