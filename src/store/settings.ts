// SoundMap Settings Store — Zustand persisted
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { setFeedbackEnabled } from "@/lib/feedback.ts";

export type UnitSystem = "metric" | "imperial";
export type AppTheme = "dark" | "amoled";
export type VenuePreset = "club" | "festival" | "theatre" | "conference";

interface SettingsState {
  units: UnitSystem;
  theme: AppTheme;
  defaultVenueType: VenuePreset;
  soundEnabled: boolean;
  hapticsEnabled: boolean;

  setUnits: (units: UnitSystem) => void;
  setTheme: (theme: AppTheme) => void;
  setDefaultVenueType: (venueType: VenuePreset) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      units: "metric",
      theme: "dark",
      defaultVenueType: "club",
      soundEnabled: true,
      hapticsEnabled: true,

      setUnits: (units) => set({ units }),
      setTheme: (theme) => set({ theme }),
      setDefaultVenueType: (defaultVenueType) => set({ defaultVenueType }),
      setSoundEnabled: (soundEnabled) => {
        set({ soundEnabled });
        setFeedbackEnabled({ sound: soundEnabled });
      },
      setHapticsEnabled: (hapticsEnabled) => {
        set({ hapticsEnabled });
        setFeedbackEnabled({ haptic: hapticsEnabled });
      },
    }),
    {
      name: "soundmap-settings",
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (state) {
          setFeedbackEnabled({
            sound: state.soundEnabled ?? true,
            haptic: state.hapticsEnabled ?? true,
          });
        }
      },
    }
  )
);
