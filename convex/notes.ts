import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { getActorName } from "./actor";

/** Compara "YYYY-MM-DD" sem interferência de fuso (espelha deadline.ts). */
function parseDateOnly(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

const statusValidator = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("blocked")
);

/**
 * D2 — Validações no backend: o período deve fazer sentido
 * (início ≤ prazo; prazo obrigatório quando há início). A view também
 * valida, mas o servidor não confia em ninguém.
 */
function validatePeriodServer(
  startDate?: string,
  dueDate?: string
): string | null {
  if (startDate && !dueDate) {
    return "Informe o prazo se houver data de início.";
  }
  if (!startDate || !dueDate) return null;
  const start = parseDateOnly(startDate);
  const due = parseDateOnly(dueDate);
  if (Number.isNaN(start) || Number.isNaN(due)) return "Datas inválidas.";
  if (start > due) {
    return "A data de início não pode ser depois do prazo.";
  }
  return null;
}

/** Campos opcionais da nota; `null` significa "limpar o campo". */
const optionalNotePatch = {
  title: v.optional(v.string()),
  content: v.optional(v.string()),
  status: v.optional(statusValidator),
  tags: v.optional(v.array(v.string())),
  assignee: v.optional(v.union(v.string(), v.null())),
  startDate: v.optional(v.union(v.string(), v.null())),
  dueDate: v.optional(v.union(v.string(), v.null())),
  dashboardId: v.optional(v.union(v.string(), v.null())),
};

/** Campos de sistema controlados pelo servidor (nunca via patch). */
const SYSTEM_FIELDS = new Set(["_id", "_creationTime", "updatedAt", "updatedBy"]);

/** Campos limpáveis da nota (podem ser removidos via `null`). */
const CLEARABLE_FIELDS = new Set([
  "assignee",
  "startDate",
  "dueDate",
  "dashboardId",
]);

type OptionalPatch = {
  [K in keyof typeof optionalNotePatch]?: unknown;
};

/**
 * D1 — Atualização estável no servidor: aplica o patch sobre o documento
 * atual SEM reescrever campos não mencionados (nem campos de sistema), de
 * forma que mutations concorrentes em campos distintos não se apaguem.
 * `null` remove o campo; chaves ausentes preservam o valor atual.
 */
function applyPatch(row: Doc<"notes">, patch: OptionalPatch): Doc<"notes"> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (!SYSTEM_FIELDS.has(key)) next[key] = value;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      if (CLEARABLE_FIELDS.has(key)) delete next[key];
    } else if (value !== undefined) {
      next[key] = value;
    }
  }
  return next as unknown as Doc<"notes">;
}

function makeActivityId(noteId: string, at: string): string {
  return `act-${noteId}-${at}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getNoteById(ctx: any, id: string) {
  return ctx.db
    .query("notes")
    .withIndex("by_ref", (q: any) => q.eq("id", id))
    .unique();
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("notes").collect();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    title: v.string(),
    content: v.optional(v.string()),
    status: v.optional(statusValidator),
    tags: v.optional(v.array(v.string())),
    assignee: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    dashboardId: v.optional(v.string()),
    actor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getActorName(ctx, args.actor);
    const periodError = validatePeriodServer(args.startDate, args.dueDate);
    if (periodError) throw new Error(periodError);

    const existing = await getNoteById(ctx, args.id);
    if (existing) throw new Error("Já existe uma nota com este identificador.");

    const now = new Date().toISOString();
    await ctx.db.insert("notes", {
      id: args.id,
      title: args.title,
      content: args.content ?? "",
      status: args.status ?? "not_started",
      tags: args.tags ?? [],
      assignee: args.assignee,
      startDate: args.startDate,
      dueDate: args.dueDate,
      dashboardId: args.dashboardId,
      createdAt: now,
      updatedAt: now,
      updatedBy: actor,
    });
    await ctx.db.insert("activity", {
      id: makeActivityId(args.id, now),
      noteId: args.id,
      noteTitle: args.title,
      action: "created",
      actor,
      at: now,
    });
    return null;
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    patch: v.object(optionalNotePatch),
    actor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await getNoteById(ctx, args.id);
    if (!row) throw new Error("Nota não encontrada.");

    const next = applyPatch(row, args.patch);
    const periodError = validatePeriodServer(next.startDate, next.dueDate);
    if (periodError) throw new Error(periodError);

    const now = new Date().toISOString();
    next.updatedAt = now;
    next.updatedBy = await getActorName(ctx, args.actor);
    await ctx.db.replace(row._id as Id<"notes">, next as unknown as Doc<"notes">);

    const isStatusChange =
      args.patch.status !== undefined && args.patch.status !== row.status;
    await ctx.db.insert("activity", {
      id: makeActivityId(args.id, now),
      noteId: args.id,
      noteTitle: next.title,
      action: isStatusChange ? "status_changed" : "updated",
      actor: await getActorName(ctx, args.actor),
      at: now,
    });
    return null;
  },
});

export const move = mutation({
  args: {
    id: v.string(),
    status: statusValidator,
    order: v.optional(v.number()),
    actor: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await getNoteById(ctx, args.id);
    if (!row) throw new Error("Nota não encontrada.");

    const now = new Date().toISOString();
    const actor = await getActorName(ctx, args.actor);
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!SYSTEM_FIELDS.has(key)) next[key] = value;
    }
    next.status = args.status;
    next.order = args.order;
    next.updatedAt = now;
    next.updatedBy = actor;
    await ctx.db.replace(row._id as Id<"notes">, next as unknown as Doc<"notes">);

    if (row.status !== args.status) {
      await ctx.db.insert("activity", {
        id: makeActivityId(args.id, now),
        noteId: args.id,
        noteTitle: row.title,
        action: "moved",
        actor,
        at: now,
      });
    }
    return null;
  },
});

export const remove = mutation({
  args: { id: v.string(), actor: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await getNoteById(ctx, args.id);
    if (!row) return null;

    const now = new Date().toISOString();
    await ctx.db.delete(row._id as Id<"notes">);
    await ctx.db.insert("activity", {
      id: makeActivityId(args.id, now),
      noteId: args.id,
      noteTitle: row.title,
      action: "deleted",
      actor: await getActorName(ctx, args.actor),
      at: now,
    });
    return null;
  },
});
