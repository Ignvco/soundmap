import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export default defineSchema({
  quotas: defineTable({
    key: v.string(),
    count: v.number(),
    expiresAt: v.number(),
  })
    .index("by_key", ["key"])
    .index("by_expiresAt", ["expiresAt"]),
  workspaces: defineTable({
    name: v.string(),
    owner: v.string(),
    head: v.number(),
  }),
  members: defineTable({
    workspaceId: v.id("workspaces"),
    identity: v.string(),
    role: v.union(v.literal("owner"), v.literal("editor"), v.literal("viewer")),
  })
    .index("by_workspaceId_and_identity", ["workspaceId", "identity"])
    .index("by_identity", ["identity"]),
  revisions: defineTable({
    workspaceId: v.id("workspaces"),
    revision: v.number(),
    clientId: v.string(),
    author: v.string(),
    data: v.string(),
  })
    .index("by_workspaceId_and_revision", ["workspaceId", "revision"])
    .index("by_workspaceId_and_clientId", ["workspaceId", "clientId"]),
  catalogSubmissions: defineTable({
    author: v.string(),
    data: v.string(),
    source: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewNote: v.string(),
    reviewer: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_author", ["author"]),
});
