import {
  mutation,
  query,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { sceneSchema, validateTree } from "../src/lib/audit/validation";
async function identity(ctx: QueryCtx | MutationCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) throw new ConvexError("Sesión requerida");
  return user.tokenIdentifier;
}
async function access(
  ctx: QueryCtx | MutationCtx,
  id: Id<"workspaces">,
  write = false,
) {
  const user = await identity(ctx),
    member = await ctx.db
      .query("members")
      .withIndex("by_workspaceId_and_identity", (q) =>
        q.eq("workspaceId", id).eq("identity", user),
      )
      .unique();
  if (!member || (write && member.role === "viewer"))
    throw new ConvexError("Sin permiso");
  return member;
}
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await identity(ctx),
      members = await ctx.db
        .query("members")
        .withIndex("by_identity", (q) => q.eq("identity", user))
        .take(100);
    return (
      await Promise.all(
        members.map(async (m) => {
          const w = await ctx.db.get(m.workspaceId);
          return w ? { ...w, role: m.role } : null;
        }),
      )
    ).filter((w) => w !== null);
  },
});
export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const user = await identity(ctx);
    if (!name.trim() || name.length > 200)
      throw new ConvexError("Nombre inválido");
    const existing = await ctx.db
      .query("members")
      .withIndex("by_identity", (q) => q.eq("identity", user))
      .take(101);
    if (existing.length >= 100)
      throw new ConvexError("Máximo 100 espacios por cuenta");
    const id = await ctx.db.insert("workspaces", {
      name: name.trim(),
      owner: user,
      head: 0,
    });
    await ctx.db.insert("members", {
      workspaceId: id,
      identity: user,
      role: "owner",
    });
    return id;
  },
});
export const members = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, a) => {
    await access(ctx, a.workspaceId);
    return ctx.db
      .query("members")
      .withIndex("by_workspaceId_and_identity", (q) =>
        q.eq("workspaceId", a.workspaceId),
      )
      .take(100);
  },
});
export const setMember = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    memberIdentifier: v.string(),
    role: v.union(
      v.literal("editor"),
      v.literal("viewer"),
      v.literal("remove"),
    ),
  },
  handler: async (ctx, a) => {
    const me = await access(ctx, a.workspaceId, true);
    if (me.role !== "owner")
      throw new ConvexError("Solo el propietario administra acceso");
    if (!a.memberIdentifier.trim() || a.memberIdentifier.length > 500)
      throw new ConvexError("Identificador inválido");
    const current = await ctx.db
      .query("members")
      .withIndex("by_workspaceId_and_identity", (q) =>
        q.eq("workspaceId", a.workspaceId).eq("identity", a.memberIdentifier),
      )
      .unique();
    if (current?.role === "owner")
      throw new ConvexError("No se puede quitar al propietario");
    if (a.role === "remove") {
      if (current) await ctx.db.delete(current._id);
    } else if (current) await ctx.db.patch(current._id, { role: a.role });
    else {
      const count = await ctx.db
        .query("members")
        .withIndex("by_workspaceId_and_identity", (q) =>
          q.eq("workspaceId", a.workspaceId),
        )
        .take(100);
      if (count.length >= 100) throw new ConvexError("Límite de miembros");
      await ctx.db.insert("members", {
        workspaceId: a.workspaceId,
        identity: a.memberIdentifier,
        role: a.role,
      });
    }
    return null;
  },
});
export const revisions = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, a) => {
    await access(ctx, a.workspaceId);
    return ctx.db
      .query("revisions")
      .withIndex("by_workspaceId_and_revision", (q) =>
        q.eq("workspaceId", a.workspaceId),
      )
      .order("desc")
      .take(30);
  },
});
export const append = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    expectedHead: v.number(),
    clientId: v.string(),
    data: v.string(),
  },
  handler: async (ctx, a) => {
    const me = await access(ctx, a.workspaceId, true),
      w = await ctx.db.get(a.workspaceId);
    if (!w) throw new ConvexError("Espacio ausente");
    if (
      a.clientId.length > 200 ||
      new TextEncoder().encode(a.data).length > 700000
    )
      throw new ConvexError(
        "La revisión supera el límite de sincronización (700 kB); exporta las muestras como archivo",
      );
    const existing = await ctx.db
      .query("revisions")
      .withIndex("by_workspaceId_and_clientId", (q) =>
        q.eq("workspaceId", a.workspaceId).eq("clientId", a.clientId),
      )
      .unique();
    if (existing) {
      if (existing.data !== a.data)
        throw new ConvexError("La revisión existente es inmutable");
      return existing.revision;
    }
    if (!Number.isInteger(a.expectedHead) || a.expectedHead !== w.head)
      throw new ConvexError(
        "Conflicto: carga las revisiones nuevas antes de publicar",
      );
    const data: unknown = JSON.parse(a.data);
    validateTree(data);
    sceneSchema.parse(data);
    await ctx.db.insert("revisions", {
      workspaceId: a.workspaceId,
      revision: w.head + 1,
      clientId: a.clientId,
      author: me.identity,
      data: a.data,
    });
    await ctx.db.patch(w._id, { head: w.head + 1 });
    return w.head + 1;
  },
});
export const whoami = query({
  args: {},
  returns: v.string(),
  handler: identity,
});
