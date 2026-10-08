import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

/**
 * Sprint 8 (D1) — Dashboards no banco. `actor` é o usuário simulado da
 * sessão; quando o auth real (D3) chegar, virá do contexto de autenticação.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("dashboards").collect();
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (!name) throw new Error("O nome é obrigatório.");
    const now = new Date().toISOString();
    await ctx.db.insert("dashboards", {
      id: args.id,
      name,
      description: args.description ?? "",
      createdAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("dashboards")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    if (!row) throw new Error("Dashboard não encontrado.");

    const next: Record<string, unknown> = { ...row };
    if (args.name !== undefined) {
      const name = args.name.trim();
      if (!name) throw new Error("O nome é obrigatório.");
      next.name = name;
    }
    if (args.description === null) {
      delete next.description;
    } else if (args.description !== undefined) {
      next.description = args.description;
    }
    next.updatedAt = new Date().toISOString();
    await ctx.db.replace(row._id, next as unknown as Doc<"dashboards">);
    return null;
  },
});

/**
 * Exclui o dashboard, desvincula suas notas (a nota nunca é apagada) e
 * remove os membros vinculados — tudo numa transação atômica.
 */
export const remove = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("dashboards")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    if (!row) return null;

    const notes = await ctx.db.query("notes").collect();
    for (const note of notes) {
      if (note.dashboardId === args.id) {
        const next: Record<string, unknown> = { ...note };
        delete next.dashboardId;
        await ctx.db.replace(note._id, next as unknown as Doc<"notes">);
      }
    }

    const members = await ctx.db.query("members").collect();
    for (const member of members) {
      if (member.dashboardId === args.id) {
        await ctx.db.delete(member._id);
      }
    }

    await ctx.db.delete(row._id);
    return null;
  },
});
