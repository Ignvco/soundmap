import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
export const consume = internalMutation({
  args: { identity: v.string(), now: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { identity, now }) => {
    const day = Math.floor(now / 86400000),
      minute = Math.floor(now / 60000);
    const limits: [string, number][] = [
      [`user-day:${identity}:${day}`, 30],
      [`user-minute:${identity}:${minute}`, 3],
      [`global-day:${day}`, 1000],
    ];
    const rows = await Promise.all(
      limits.map(async ([key, limit]) => ({
        key,
        limit,
        row: await ctx.db
          .query("quotas")
          .withIndex("by_key", (q) => q.eq("key", key))
          .unique(),
      })),
    );
    if (rows.some((r) => (r.row?.count ?? 0) >= r.limit)) return false;
    for (const r of rows)
      if (r.row) await ctx.db.patch(r.row._id, { count: r.row.count + 1 });
      else
        await ctx.db.insert("quotas", {
          key: r.key,
          count: 1,
          expiresAt: now + 172800000,
        });
    return true;
  },
});
export const cleanup = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("quotas")
      .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
      .take(500);
    for (const row of expired) await ctx.db.delete(row._id);
    return null;
  },
});
