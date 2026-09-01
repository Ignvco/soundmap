import { defineSchema } from "convex/server";

// SoundMap — minimal schema.
// The advisor uses a stateless HTTP streaming action (no DB writes).
// Add tables here as features grow (e.g. cloud scene sync).
export default defineSchema({});
