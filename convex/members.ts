import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * D2 — Validações de membro no backend: e-mail válido, papel do domínio e
 * exclusão de duplicatas por (e-mail, dashboard).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("members").collect();
    return rows.sort((a, b) => a.invitedAt.localeCompare(b.invitedAt));
  },
});

export const add = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    dashboardId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = args.email.trim();
    if (!name) throw new Error("Informe o nome.");
    if (!EMAIL_RE.test(email)) {
      throw new Error("Informe um e-mail válido.");
    }

    const dash = await ctx.db
      .query("dashboards")
      .withIndex("by_ref", (q) => q.eq("id", args.dashboardId))
      .unique();
    if (!dash) throw new Error("Dashboard não encontrado.");

    const members = await ctx.db.query("members").collect();
    const duplicate = members.some(
      (m) => m.email.toLowerCase() === email.toLowerCase() && m.dashboardId === args.dashboardId
    );
    if (duplicate) {
      throw new Error("Este e-mail já é membro deste dashboard.");
    }

    await ctx.db.insert("members", {
      id: args.id,
      name,
      email,
      role: args.role,
      dashboardId: args.dashboardId,
      invitedAt: new Date().toISOString(),
    });
    return null;
  },
});

export const updateRole = mutation({
  args: {
    id: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("members")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    if (!row) throw new Error("Membro não encontrado.");
    await ctx.db.patch(row._id, { role: args.role });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("members")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    if (!row) return null;
    await ctx.db.delete(row._id);
    return null;
  },
});
