import { localDatabase } from "../persistence";
// Local drafts are separate from the authenticated, moderated catalog.
import { useCallback, useEffect, useMemo, useState } from "react";

export type CommunityCategory =
  "tops" | "subs" | "monitors" | "amp" | "dsp" | "mixer" | "mic";
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
const DEMO_SEED: Omit<CommunityRow, "verified">[] = []; // No fictitious users, votes or manufacturer claims.

const LS_KEY = "soundmap-community-demo";

interface DemoOverlay {
  /** Extra upvotes contributed by this user (id → count). */
  upvotes: Record<string, number>;
  /** User-submitted rows (as-is). */
  submitted: Omit<CommunityRow, "verified">[];
}

async function loadOverlay(): Promise<DemoOverlay> {
  if (typeof window === "undefined") return { upvotes: {}, submitted: [] };
  try {
    const raw = await localDatabase.getItem(LS_KEY);
    if (!raw) return { upvotes: {}, submitted: [] };
    const parsed = JSON.parse(raw) as DemoOverlay;
    return {
      upvotes: parsed.upvotes ?? {},
      submitted: Array.isArray(parsed.submitted) ? parsed.submitted : [],
    };
  } catch {
    return { upvotes: {}, submitted: [] };
  }
}
function saveOverlay(o: DemoOverlay) {
  if (typeof window === "undefined") return;
  void Promise.resolve(localDatabase.setItem(LS_KEY, JSON.stringify(o))).catch(
    () => {},
  );
}

function applyVerified(rows: Omit<CommunityRow, "verified">[]): CommunityRow[] {
  return rows.map((r) => ({ ...r, verified: false }));
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface CommunityFilters {
  category?: CommunityCategory | "all";
  status: "approved" | "pending";
}

export interface SubmitInput {
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
}

export interface UseCommunityGearResult {
  rows: CommunityRow[] | undefined;
  loading: boolean;
  isDemoMode: boolean;
  upvote: (id: string) => Promise<void>;
  submit: (input: SubmitInput) => Promise<void>;
}

export function useCommunityGear({
  category,
  status,
}: CommunityFilters): UseCommunityGearResult {
  // This view contains local drafts. Shared proposals live in Collaboration.
  const isDemoMode = true;

  // Demo overlay state
  const [overlay, setOverlay] = useState<DemoOverlay>({
    upvotes: {},
    submitted: [],
  });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    loadOverlay().then((o) => {
      if (active) {
        setOverlay(o);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (ready) saveOverlay(overlay);
  }, [overlay, ready]);

  const rows = useMemo(() => {
    const all = [...DEMO_SEED, ...overlay.submitted];
    const filtered = all
      .filter((r) => r.status === status)
      .filter((r) =>
        category === "all" || !category ? true : r.category === category,
      )
      .map((r) => ({
        ...r,
        upvotes: r.upvotes + (overlay.upvotes[r._id] ?? 0),
      }));
    return applyVerified(filtered);
  }, [overlay, category, status]);

  const upvote = useCallback(async (id: string) => {
    setOverlay((o) => ({
      ...o,
      upvotes: { ...o.upvotes, [id]: (o.upvotes[id] ?? 0) + 1 },
    }));
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
    setOverlay((o) => ({ ...o, submitted: [newRow, ...o.submitted] }));
  }, []);

  return { rows, loading: !ready, isDemoMode, upvote, submit };
}
