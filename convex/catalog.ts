import { ConvexError, v } from "convex/values";
import { gearSchema, validateTree } from "../src/lib/audit/validation";
import { env, mutation, query } from "./_generated/server";
export const list = query({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.auth.getUserIdentity()))
      throw new ConvexError("Sesión requerida");
    return ctx.db
      .query("catalogSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .take(100);
  },
});
export const submit = mutation({
  args: { data: v.string(), source: v.string() },
  handler: async (ctx, a) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new ConvexError("Sesión requerida");
    if (
      a.data.length > 20000 ||
      a.source.length > 2000 ||
      !/^https:\/\//.test(a.source)
    )
      throw new ConvexError("Adjunta una referencia HTTPS del fabricante");
    const parsed: unknown = JSON.parse(a.data);
    validateTree(parsed);
    gearSchema.parse(parsed);
    const existing = await ctx.db
      .query("catalogSubmissions")
      .withIndex("by_author", (q) => q.eq("author", user.tokenIdentifier))
      .take(100);
    if (existing.length >= 100) throw new ConvexError("Límite de propuestas");
    return ctx.db.insert("catalogSubmissions", {
      author: user.tokenIdentifier,
      data: a.data,
      source: a.source,
      status: "pending",
      reviewNote: "",
    });
  },
});
export const review = mutation({
  args: {
    id: v.id("catalogSubmissions"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    note: v.string(),
  },
  handler: async (ctx, a) => {
    const user = await ctx.auth.getUserIdentity();
    if (
      !user ||
      !(env.MODERATOR_IDS ?? "").split(",").includes(user.tokenIdentifier)
    )
      throw new ConvexError("Se requiere moderación autorizada");
    if (a.note.length < 10 || a.note.length > 4000)
      throw new ConvexError("Documenta la revisión");
    await ctx.db.patch(a.id, {
      status: a.status,
      reviewNote: a.note,
      reviewer: user.tokenIdentifier,
      reviewedAt: Date.now(),
    });
    return null;
  },
});
export const permissions = query({
  args: {},
  handler: async (ctx) => {
    const u = await ctx.auth.getUserIdentity();
    return {
      canModerate:
        !!u && (env.MODERATOR_IDS ?? "").split(",").includes(u.tokenIdentifier),
    };
  },
});
export const pending = query({
  args: {},
  handler: async (ctx) => {
    const u = await ctx.auth.getUserIdentity();
    if (!u || !(env.MODERATOR_IDS ?? "").split(",").includes(u.tokenIdentifier))
      throw new ConvexError("Se requiere moderación autorizada");
    return ctx.db
      .query("catalogSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .take(100);
  },
});
