// Cloud sync — DEPRECATED. Kept as a no-op shim so /app/src/components/providers/sync.tsx
// keeps the same interface without any Convex calls. All data lives in
// localStorage now. Use /settings → Backup to export/import a JSON snapshot
// across devices.
import type { Scene } from "@/store/app.ts";

export function useCloudSync() {
  return {
    isAuthenticated: false,
    cloudCount: 0,
    isPending: false,
    isSyncing: false,
    lastSyncAt: null as number | null,
    deleteOne: async (_id: string): Promise<void> => { void _id; },
    pushOne: async (_scene: Scene): Promise<void> => { void _scene; },
    pushAll: async (): Promise<void> => {},
    pull: async (): Promise<void> => {},
  };
}
