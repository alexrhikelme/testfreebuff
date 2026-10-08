import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sprint 8 (D1) — Ordem manual do Kanban persistida no servidor.
 * Derivado do campo `order` das notas: um só lugar para consultar,
 * reativo para todos os clientes.
 */
export const getNotesOrder = query({
  args: {},
  returns: v.record(v.string(), v.number()),
  handler: async (ctx) => {
    const notes = await ctx.db.query("notes").collect();
    const order: Record<string, number> = {};
    for (const n of notes) {
      if (typeof n.order === "number") order[n.id] = n.order;
    }
    return order;
  },
});
