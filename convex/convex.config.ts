import { defineApp } from "convex/server";
import { v } from "convex/values";
export default defineApp({
  env: {
    ANTHROPIC_API_KEY: v.optional(v.string()),
    ADVISOR_MODEL: v.optional(v.string()),
    ALLOWED_ORIGINS: v.optional(v.string()),
    AUTH_ISSUER: v.optional(v.string()),
    AUTH_AUDIENCE: v.optional(v.string()),
    MODERATOR_IDS: v.optional(v.string()),
  },
});
