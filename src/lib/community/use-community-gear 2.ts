// Community gear composable — real Convex when connected, seeded demo mode
// otherwise. Verified badge kicks in at UPVOTE_THRESHOLD.
//
// Contract:
//   const { rows, loading, isDemoMode, upvote, submit } = useCommunityGear({ category, status });
//
// In demo mode, upvotes and submissions persist to localStorage. The UI treats
// both modes identically — only the caller of `isDemoMode` renders a hint chip.
import { useCallback, useEffect, useMemo, useState } from "react";

// Community upvote threshold for the "Verified in field" badge.
export const VERIFIED_UPVOTE_THRESHOLD = 25;

export type CommunityCategory = "tops" | "subs" | "monitors" | "amp" | "dsp" | "mixer" | "mic";
export type CommunityStatus = "pending" | "approved" | "rejected";

export interface CommunityRow {
  _id: string;
  brand: string;
  model: string;
  category: CommunityCategory;
  active: boolean;
  splMax: number;
  rmsWatts?: number;
  peakWatts?: number;
  coverageH?: number;
  coverageV?: number;
  freqLow?: number;
  freqHigh?: number;
  weight?: number;
  dspIntegrated?: boolean;
  status: CommunityStatus;
  upvotes: number;
  submitterName?: string;
  createdAt: number;
  /** Verified in field — computed, not stored. */
  verified: boolean;
}

// ── Curated demo seed — real pro-audio gear across categories ──────────────
const DEMO_SEED: Omit<CommunityRow, "verified">[] = [
  {
    _id: "demo-1", brand: "L-Acoustics", model: "K2", category: "tops", active: true,
    splMax: 148, rmsWatts: 1500, coverageH: 90, coverageV: 10, freqLow: 35, freqHigh: 20000,
    weight: 56, dspIntegrated: false, status: "approved", upvotes: 87,
    submitterName: "Rodrigo M.", createdAt: Date.now() - 86400000 * 30,
  },
  {
    _id: "demo-2", brand: "d&b audiotechnik", model: "V8", category: "tops", active: true,
    splMax: 144, rmsWatts: 1000, coverageH: 80, coverageV: 20, freqLow: 60, freqHigh: 18000,
    dspIntegrated: false, status: "approved", upvotes: 62,
    submitterName: "Sofía L.", createdAt: Date.now() - 86400000 * 22,
  },
  {
    _id: "demo-3", brand: "JBL", model: "VTX A12", category: "tops", active: true,
    splMax: 145, rmsWatts: 2400, coverageH: 90, coverageV: 12, freqLow: 55, freqHigh: 20000,
    dspIntegrated: true, status: "approved", upvotes: 41,
    submitterName: "Matías R.", createdAt: Date.now() - 86400000 * 18,
  },
  {
    _id: "demo-4", brand: "RCF", model: "TT+ 5A", category: "tops", active: true,
    splMax: 137, rmsWatts: 1000, coverageH: 90, coverageV: 15, freqLow: 55, freqHigh: 20000,
    dspIntegrated: true, status: "approved", upvotes: 28,
    submitterName: "Camila P.", createdAt: Date.now() - 86400000 * 12,
  },
  {
    _id: "demo-5", brand: "L-Acoustics", model: "KS28", category: "subs", active: true,
    splMax: 143, rmsWatts: 3000, freqLow: 25, freqHigh: 110,
    weight: 79, dspIntegrated: false, status: "approved", upvotes: 96,
    submitterName: "Rodrigo M.", createdAt: Date.now() - 86400000 * 28,
  },
  {
    _id: "demo-6", brand: "d&b audiotechnik", model: "B22", category: "subs", active: true,
    splMax: 140, rmsWatts: 2400, freqLow: 30, freqHigh: 105,
    dspIntegrated: false, status: "approved", upvotes: 54,
    submitterName: "Sofía L.", createdAt: Date.now() - 86400000 * 20,
  },
  {
    _id: "demo-7", brand: "QSC", model: "KS118", category: "subs", active: true,
    splMax: 136, rmsWatts: 3600, freqLow: 41, freqHigh: 105,
    dspIntegrated: true, status: "approved", upvotes: 33,
    submitterName: "Diego F.", createdAt: Date.now() - 86400000 * 14,
  },
  {
    _id: "demo-8", brand: "d&b audiotechnik", model: "M4", category: "monitors", active: true,
    splMax: 132, rmsWatts: 700, coverageH: 90, coverageV: 55, freqLow: 65, freqHigh: 18000,
    dspIntegrated: false, status: "approved", upvotes: 47,
    submitterName: "Nicolás A.", createdAt: Date.now() - 86400000 * 19,
  },
  {
    _id: "demo-9", brand: "Clair Brothers", model: "12AM", category: "monitors", active: true,
    splMax: 138, rmsWatts: 800, coverageH: 60, coverageV: 40, freqLow: 60, freqHigh: 18000,
    dspIntegrated: false, status: "approved", upvotes: 22,
    submitterName: "Julia B.", createdAt: Date.now() - 86400000 * 10,
  },
  {
    _id: "demo-10", brand: "Lab Gruppen", model: "PLM 20K44", category: "amp", active: true,
    splMax: 0, rmsWatts: 20000, dspIntegrated: true, status: "approved", upvotes: 71,
    submitterName: "Federico G.", createdAt: Date.now() - 86400000 * 24,
  },
  {
    _id: "demo-11", brand: "Powersoft", model: "X8", category: "amp", active: true,
    splMax: 0, rmsWatts: 20000, dspIntegrated: true, status: "approved", upvotes: 38,
    submitterName: "Andrés V.", createdAt: Date.now() - 86400000 * 16,
  },
  {
    _id: "demo-12", brand: "Lake", model: "LM44", category: "dsp", active: true,
    splMax: 0, dspIntegrated: true, status: "approved", upvotes: 44,
    submitterName: "Camila P.", createdAt: Date.now() - 86400000 * 21,
  },
  {
    _id: "demo-13", brand: "Symetrix", model: "Prism 12x12", category: "dsp", active: true,
    splMax: 0, dspIntegrated: true, status: "approved", upvotes: 19,
    submitterName: "Matías R.", createdAt: Date.now() - 86400000 * 9,
  },
  {
    _id: "demo-14", brand: "DiGiCo", model: "SD12 96", category: "mixer", active: true,
    splMax: 0, dspIntegrated: true, status: "approved", upvotes: 58,
    submitterName: "Sofía L.", createdAt: Date.now() - 86400000 * 26,
  },
  {
    _id: "demo-15", brand: "Yamaha", model: "CL5", category: "mixer", active: true,
    splMax: 0, dspIntegrated: true, status: "approved", upvotes: 35,
    submitterName: "Rodrigo M.", createdAt: Date.now() - 86400000 * 15,
  },
  {
    _id: "demo-16", brand: "Shure", model: "SM58", category: "mic", active: true,
    splMax: 0, dspIntegrated: false, freqLow: 50, freqHigh: 15000,
    status: "approved", upvotes: 82,
    submitterName: "Diego F.", createdAt: Date.now() - 86400000 * 25,
  },
  {
    _id: "demo-17", brand: "DPA", model: "d:facto 4018V", category: "mic", active: true,
    splMax: 0, dspIntegrated: false, freqLow: 100, freqHigh: 16000,
    status: "approved", upvotes: 26,
    submitterName: "Julia B.", createdAt: Date.now() - 86400000 * 11,
  },
  {
    _id: "demo-18", brand: "Sennheiser", model: "e935", category: "mic", active: true,
    splMax: 0, dspIntegrated: false, freqLow: 40, freqHigh: 18000,
    status: "approved", upvotes: 14,
    submitterName: "Andrés V.", createdAt: Date.now() - 86400000 * 6,
  },
  // Pending items (visible in "Pendiente" tab)
  {
    _id: "demo-p1", brand: "Adamson", model: "CS10", category: "tops", active: true,
    splMax: 141, rmsWatts: 1500, coverageH: 100, coverageV: 15, freqLow: 55, freqHigh: 20000,
    dspIntegrated: false, status: "pending", upvotes: 3,
    submitterName: "Diego F.", createdAt: Date.now() - 86400000 * 2,
  },
  {
    _id: "demo-p2", brand: "Meyer Sound", model: "LEO", category: "tops", active: true,
    splMax: 149, rmsWatts: 4000, coverageH: 110, coverageV: 8, freqLow: 45, freqHigh: 20000,
    dspIntegrated: true, status: "pending", upvotes: 1,
    submitterName: "Anónimo", createdAt: Date.now() - 86400000 * 1,
  },
];

const LS_KEY = "soundmap-community-demo";

interface DemoOverlay {
  /** Extra upvotes contributed by this user (id → count). */
  upvotes: Record<string, number>;
  /** User-submitted rows (as-is). */
  submitted: Omit<CommunityRow, "verified">[];
}

function loadOverlay(): DemoOverlay {
  if (typeof window === "undefined") return { upvotes: {}, submitted: [] };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return { upvotes: {}, submitted: [] };
    const parsed = JSON.parse(raw) as DemoOverlay;
    return {
      upvotes: parsed.upvotes ?? {},
      submitted: Array.isArray(parsed.submitted) ? parsed.submitted : [],
    };
  } catch { return { upvotes: {}, submitted: [] }; }
}
function saveOverlay(o: DemoOverlay) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(o));
}

function applyVerified(rows: Omit<CommunityRow, "verified">[]): CommunityRow[] {
  return rows.map(r => ({ ...r, verified: r.status === "approved" && r.upvotes >= VERIFIED_UPVOTE_THRESHOLD }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface CommunityFilters {
  category?: CommunityCategory | "all";
  status: "approved" | "pending";
}

export interface SubmitInput {
  brand: string; model: string; category: CommunityCategory; active: boolean;
  splMax: number;
  rmsWatts?: number; peakWatts?: number;
  coverageH?: number; coverageV?: number;
  freqLow?: number; freqHigh?: number;
  weight?: number; dspIntegrated?: boolean;
}

export interface UseCommunityGearResult {
  rows: CommunityRow[] | undefined;
  loading: boolean;
  isDemoMode: boolean;
  upvote: (id: string) => Promise<void>;
  submit: (input: SubmitInput) => Promise<void>;
}

export function useCommunityGear({ category, status }: CommunityFilters): UseCommunityGearResult {
  // All-local now. Convex was removed; the "demo mode" is the only mode.
  const isDemoMode = true;

  // Demo overlay state
  const [overlay, setOverlay] = useState<DemoOverlay>(() => loadOverlay());
  useEffect(() => { saveOverlay(overlay); }, [overlay]);

  const rows = useMemo(() => {
    const all = [...DEMO_SEED, ...overlay.submitted];
    const filtered = all
      .filter(r => r.status === status)
      .filter(r => category === "all" || !category ? true : r.category === category)
      .map(r => ({ ...r, upvotes: r.upvotes + (overlay.upvotes[r._id] ?? 0) }));
    return applyVerified(filtered);
  }, [overlay, category, status]);

  const upvote = useCallback(async (id: string) => {
    setOverlay(o => ({ ...o, upvotes: { ...o.upvotes, [id]: (o.upvotes[id] ?? 0) + 1 } }));
  }, []);

  const submit = useCallback(async (input: SubmitInput) => {
    const newRow: Omit<CommunityRow, "verified"> = {
      _id: `local-${Date.now()}`,
      ...input,
      status: "pending",
      upvotes: 0,
      submitterName: "Vos",
      createdAt: Date.now(),
    };
    setOverlay(o => ({ ...o, submitted: [newRow, ...o.submitted] }));
  }, []);

  return { rows, loading: false, isDemoMode, upvote, submit };
}
