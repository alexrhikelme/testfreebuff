import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * Sprint 8 (D1) — Persistência real com Convex.
 * Sprint 9 (D3) — Tabelas de auth (users, authSessions, authAccounts,
 * authVerificationCodes, authRateLimits) via authTables.
 *
 * Todas as tabelas de domínio vivem em um único "workspace" global; o
 * isolamento fino por usuário/organização virá com a autorização por papel.
 */
export default defineSchema({
  ...authTables,

  notes: defineTable({
    id: v.string(),
    title: v.string(),
    content: v.string(),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("blocked")
    ),
    tags: v.array(v.string()),
    assignee: v.optional(v.string()),
    startDate: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    dashboardId: v.optional(v.string()),
    order: v.optional(v.number()),
    createdAt: v.string(),
    updatedAt: v.string(),
    updatedBy: v.optional(v.string()),
  }).index("by_ref", ["id"]),

  dashboards: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_ref", ["id"]),

  members: defineTable({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    dashboardId: v.string(),
    invitedAt: v.string(),
  }).index("by_ref", ["id"]),

  activity: defineTable({
    id: v.string(),
    noteId: v.string(),
    noteTitle: v.string(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("status_changed"),
      v.literal("moved"),
      v.literal("deleted")
    ),
    actor: v.string(),
    at: v.string(),
  }),

  /**
   * Perfis de produto ligados à conta autenticada (auth `users`).
   * O `users` do auth guarda e-mail/nome; aqui ficam papel, bio e avatar.
   */
  profiles: defineTable({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_ref", ["id"])
    .index("by_email", ["email"]),

  /** Projetos/laboratórios do sistema. */
  projects: defineTable({
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("planning"),
      v.literal("paused"),
      v.literal("finished")
    ),
    createdAt: v.string(),
    updatedAt: v.string(),
    createdBy: v.string(),
  }).index("by_ref", ["id"]),

  /** Vínculo usuário ↔ projeto com papel (permissões). */
  projectMembers: defineTable({
    id: v.string(),
    projectId: v.string(),
    userId: v.string(),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("editor"),
      v.literal("viewer")
    ),
    joinedAt: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  /** Estado da sincronização com o Firestore. */
  firebaseSyncState: defineTable({
    enabled: v.boolean(),
    lastSyncAt: v.optional(v.string()),
    lastError: v.optional(v.string()),
    lastSyncCount: v.optional(v.number()),
  }).index("by_ref", ["enabled"]),
});
