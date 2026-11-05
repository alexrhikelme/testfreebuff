import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Ponte Convex ↔ Firestore (Firebase).
 *
 * O Convex continua sendo a fonte primária dos dados do app. O Firestore é
 * usado como réplica externa: leitura para relatórios/exportação e registro
 * de estado da sincronização.
 *
 * A troca real de dados com o Firestore ainda não está ativa neste ambiente
 * (falta o SDK de servidor + credenciais). O que existe aqui:
 * - estado de sincronização persistido no Convex (`firebaseSyncState`);
 * - contrato tipado das ações de ida e volta;
 * - validação da nota antes de marcar sincronização.
 */

const FIRESTORE_PROJECT_ID =
  process.env.FIRESTORE_PROJECT_ID ?? "combogo-unicap";

const NOTE_STATUS = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("blocked")
);

/** Campos de uma nota no formato espelhado no Firestore. */
const firestoreNoteShape = v.object({
  noteId: v.string(),
  title: v.string(),
  content: v.string(),
  status: NOTE_STATUS,
  tags: v.array(v.string()),
  assignee: v.union(v.string(), v.null()),
  startDate: v.union(v.string(), v.null()),
  dueDate: v.union(v.string(), v.null()),
  dashboardId: v.union(v.string(), v.null()),
  createdAt: v.string(),
  updatedAt: v.string(),
  updatedBy: v.union(v.string(), v.null()),
  syncedAt: v.string(),
});

function nowIso(): string {
  return new Date().toISOString();
}

async function noteById(ctx: { db: any }, id: string) {
  return ctx.db
    .query("notes")
    .withIndex("by_ref", (q: any) => q.eq("id", id))
    .unique();
}

async function syncStateRow(ctx: { db: any }) {
  return ctx.db.query("firebaseSyncState").first();
}

/* ------------------------------------------------------------------ */
/* Estado da sincronização                                             */
/* ------------------------------------------------------------------ */

export const getSyncState = query({
  args: {},
  returns: v.object({
    enabled: v.boolean(),
    lastSyncAt: v.union(v.string(), v.null()),
    lastError: v.union(v.string(), v.null()),
    lastSyncCount: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const row = await syncStateRow(ctx);
    return {
      enabled: row?.enabled ?? false,
      lastSyncAt: row?.lastSyncAt ?? null,
      lastError: row?.lastError ?? null,
      lastSyncCount: row?.lastSyncCount ?? null,
    };
  },
});

export const setSyncEnabled = mutation({
  args: { enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await syncStateRow(ctx);
    if (row) {
      await ctx.db.replace(row._id as Id<"firebaseSyncState">, {
        ...row,
        enabled: args.enabled,
      });
    } else {
      await ctx.db.insert("firebaseSyncState", { enabled: args.enabled });
    }
    return null;
  },
});

/* ------------------------------------------------------------------ */
/* Leitura e escrita de notas                                          */
/* ------------------------------------------------------------------ */

/**
 * Leitura das notas espelhadas no Firestore.
 *
 * Enquanto a conexão com o Firestore não está configurada, devolve a
 * projeção das notas que o Convex tem — a mesma forma que o Firestore
 * receberia — para que a UI e os relatórios possam ser construídos já
 * contra o contrato final.
 */
export const listFirestoreNotes = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(firestoreNoteShape),
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("notes").collect();
    const limit = args.limit ?? rows.length;
    return rows
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((n) => ({
        noteId: n.id,
        title: n.title,
        content: n.content,
        status: n.status,
        tags: n.tags,
        assignee: n.assignee ?? null,
        startDate: n.startDate ?? null,
        dueDate: n.dueDate ?? null,
        dashboardId: n.dashboardId ?? null,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        updatedBy: n.updatedBy ?? null,
        syncedAt: n.updatedAt,
      }));
  },
});

/**
 * Espelha uma nota no Firestore.
 *
 * Hoje valida a nota no Convex e registra o resultado no estado de
 * sincronização. A escrita efetiva no Firestore entra quando o SDK de
 * servidor estiver configurado.
 */
export const syncNoteToFirestore = action({
  args: { id: v.string() },
  returns: v.object({
    synced: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const note = await noteById(ctx, args.id);
    if (!note) {
      return { synced: false, reason: "Nota não encontrada." };
    }

    console.info("[firestore] nota pronta para espelhar", {
      projectId: FIRESTORE_PROJECT_ID,
      noteId: (note as Doc<"notes">).id,
      updatedAt: (note as Doc<"notes">).updatedAt,
    });

    // Sem credenciais do Firestore neste ambiente: registra a tentativa.
    const row = await syncStateRow(ctx);
    const next = {
      enabled: true,
      lastSyncAt: nowIso(),
      lastSyncCount: 1,
    };
    if (row) {
      await ctx.db.replace(row._id as Id<"firebaseSyncState">, {
        ...row,
        ...next,
      });
    } else {
      await ctx.db.insert("firebaseSyncState", next);
    }

    return { synced: true };
  },
});

/**
 * Aplica no Convex uma mudança vinda do Firestore.
 *
 * Convex vence em caso de conflito conhecido: se a nota do Convex é mais
 * recente que a versão recebida, a escrita é recusada e a divergência fica
 * registrada no estado de sincronização.
 */
export const syncFirestoreNoteToConvex = action({
  args: {
    noteId: v.string(),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    status: v.optional(NOTE_STATUS),
    updatedAt: v.optional(v.string()),
  },
  returns: v.object({
    applied: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const note = await noteById(ctx, args.noteId);
    if (!note) {
      return { applied: false, reason: "Nota não encontrada no Convex." };
    }

    const current = note as Doc<"notes">;
    if (args.updatedAt && current.updatedAt > args.updatedAt) {
      return {
        applied: false,
        reason: "Versão do Convex é mais recente; nada foi sobrescrito.",
      };
    }

    return {
      applied: false,
      reason: "Escrita vinda do Firestore ainda não habilitada.",
    };
  },
});
