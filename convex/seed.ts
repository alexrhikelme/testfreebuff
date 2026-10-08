import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sprint 8 (D1) — Sementes do protótipo migradas para o banco.
 * Executada automaticamente pelo NotesProvider na primeira carga
 * (idempotente: só insere se a tabela estiver vazia).
 */
/**
 * Pública e idempotente: só insere quando as tabelas estão vazias.
 * Quando o auth real (D3) chegar, isto deve virar função interna chamada
 * no primeiro acesso do usuário.
 */
export const seedIfEmpty = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const anyNote = await ctx.db.query("notes").first();
    const anyDashboard = await ctx.db.query("dashboards").first();

    if (anyDashboard === null) {
      await ctx.db.insert("dashboards", {
        id: "dash-seed-1",
        name: "Experimento A — Coleta",
        description: "Rotina de coleta e preparação de amostras.",
        createdAt: "2026-09-10T09:00:00.000Z",
        updatedAt: "2026-09-14T11:00:00.000Z",
      });
      await ctx.db.insert("dashboards", {
        id: "dash-seed-2",
        name: "Análises e Relatórios",
        description: "Resultados, curvas de calibração e relatórios.",
        createdAt: "2026-09-11T10:00:00.000Z",
        updatedAt: "2026-09-13T15:00:00.000Z",
      });
      const members = [
        {
          id: "member-seed-1",
          name: "Ana Costa",
          email: "ana@lab.local",
          role: "admin" as const,
          dashboardId: "dash-seed-1",
          invitedAt: "2026-09-10T09:05:00.000Z",
        },
        {
          id: "member-seed-2",
          name: "Bruno Lima",
          email: "bruno@lab.local",
          role: "editor" as const,
          dashboardId: "dash-seed-1",
          invitedAt: "2026-09-11T10:00:00.000Z",
        },
        {
          id: "member-seed-3",
          name: "Carla Dias",
          email: "carla@lab.local",
          role: "viewer" as const,
          dashboardId: "dash-seed-2",
          invitedAt: "2026-09-12T14:00:00.000Z",
        },
      ];
      for (const m of members) await ctx.db.insert("members", m);
    }

    if (anyNote === null) {
      const notes = [
        {
          id: "note-seed-1",
          title: "Coletar amostras do experimento A",
          content: "Preparar tubos, rotular e registrar temperatura ambiente.",
          status: "in_progress" as const,
          tags: ["laboratório", "coleta"],
          assignee: "Ana Costa",
          startDate: "2026-09-10",
          dueDate: "2026-09-18",
          dashboardId: "dash-seed-1",
          createdAt: "2026-09-10T09:00:00.000Z",
          updatedAt: "2026-09-12T14:30:00.000Z",
          updatedBy: "Bruno Lima",
        },
        {
          id: "note-seed-2",
          title: "Revisar resultados da análise B",
          content: "Conferir duplicatas e validar curva de calibração.",
          status: "not_started" as const,
          tags: ["análise"],
          assignee: "Bruno Lima",
          startDate: "2026-09-15",
          dueDate: "2026-09-22",
          dashboardId: "dash-seed-2",
          createdAt: "2026-09-11T10:15:00.000Z",
          updatedAt: "2026-09-11T10:15:00.000Z",
        },
        {
          id: "note-seed-3",
          title: "Pedir reposição de reagentes",
          content: "Buffer PBS e reagente C estão acabando.",
          status: "blocked" as const,
          tags: ["suprimentos"],
          createdAt: "2026-09-08T08:00:00.000Z",
          updatedAt: "2026-09-09T16:45:00.000Z",
          updatedBy: "Ana Costa",
        },
      ];
      for (const n of notes) await ctx.db.insert("notes", n);
    }

    return null;
  },
});

/** Feed de atividade recente (D1: agora vem do banco, compartilhado). */
export const listActivity = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("activity").collect();
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  },
});
