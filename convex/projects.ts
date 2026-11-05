import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const PROJECT_STATUS = v.union(
  v.literal("active"),
  v.literal("planning"),
  v.literal("paused"),
  v.literal("finished")
);

const MEMBER_ROLE = v.union(
  v.literal("owner"),
  v.literal("admin"),
  v.literal("editor"),
  v.literal("viewer")
);

async function projectById(ctx: { db: any }, id: string) {
  return ctx.db
    .query("projects")
    .withIndex("by_ref", (q: any) => q.eq("id", id))
    .unique();
}

/**
 * Projetos/laboratórios: criação, listagem, atualização e remoção.
 * O criador entra como `owner` automaticamente (permissão máxima).
 */
export const createProject = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.optional(PROJECT_STATUS),
    createdBy: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await projectById(ctx, args.id);
    if (existing) throw new Error("Já existe um projeto com este identificador.");
    if (!args.name.trim()) throw new Error("Informe o nome do projeto.");

    const now = nowIso();
    await ctx.db.insert("projects", {
      id: args.id,
      name: args.name.trim(),
      description: args.description,
      status: args.status ?? "planning",
      createdAt: now,
      updatedAt: now,
      createdBy: args.createdBy,
    });
    await ctx.db.insert("projectMembers", {
      id: makeId("pmem"),
      projectId: args.id,
      userId: args.createdBy,
      role: "owner",
      joinedAt: now,
    });
    return null;
  },
});

export const listProjects = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
      createdBy: v.string(),
    })
  ),
  handler: async (ctx) => {
    const rows = await ctx.db.query("projects").collect();
    return rows
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((p) => ({
        id: p.id,
        name: p.name,
        ...(p.description ? { description: p.description } : {}),
        status: p.status,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        createdBy: p.createdBy,
      }));
  },
});

/** Projetos em que o usuário participa, com o papel dele. */
export const listProjectsForUser = query({
  args: { userId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      status: v.string(),
      createdAt: v.string(),
      updatedAt: v.string(),
      createdBy: v.string(),
      role: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const out: Array<{
      id: string;
      name: string;
      description?: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      createdBy: string;
      role: string;
    }> = [];

    for (const m of memberships) {
      const project = await projectById(ctx, m.projectId);
      if (!project) continue;
      out.push({
        id: project.id,
        name: project.name,
        ...(project.description ? { description: project.description } : {}),
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        createdBy: project.createdBy,
        role: m.role,
      });
    }

    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
});

export const updateProject = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(PROJECT_STATUS),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await projectById(ctx, args.id);
    if (!project) throw new Error("Projeto não encontrado.");

    const next = { ...project, updatedAt: nowIso() } as Record<string, unknown>;
    if (args.name !== undefined) {
      if (!args.name.trim()) throw new Error("Informe o nome do projeto.");
      next.name = args.name.trim();
    }
    if (args.description === null) delete next.description;
    else if (args.description !== undefined) next.description = args.description;
    if (args.status !== undefined) next.status = args.status;

    await ctx.db.replace(
      project._id as Id<"projects">,
      next as unknown as Doc<"projects">
    );
    return null;
  },
});

export const removeProject = mutation({
  args: { id: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await projectById(ctx, args.id);
    if (!project) return null;

    // Remove também os vínculos de membros do projeto.
    const memberships = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const m of memberships) {
      await ctx.db.delete(m._id as Id<"projectMembers">);
    }

    await ctx.db.delete(project._id as Id<"projects">);
    return null;
  },
});

async function membershipOf(ctx: { db: any }, projectId: string, userId: string) {
  const rows = await ctx.db
    .query("projectMembers")
    .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
    .collect();
  return rows.find((m: { userId: string }) => m.userId === userId);
}

export const addProjectMember = mutation({
  args: {
    projectId: v.string(),
    userId: v.string(),
    role: MEMBER_ROLE,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const project = await projectById(ctx, args.projectId);
    if (!project) throw new Error("Projeto não encontrado.");

    const existing = await membershipOf(ctx, args.projectId, args.userId);
    if (existing) throw new Error("Este usuário já está no projeto.");

    await ctx.db.insert("projectMembers", {
      id: makeId("pmem"),
      projectId: args.projectId,
      userId: args.userId,
      role: args.role,
      joinedAt: nowIso(),
    });
    return null;
  },
});

export const updateProjectMemberRole = mutation({
  args: {
    projectId: v.string(),
    userId: v.string(),
    role: MEMBER_ROLE,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await membershipOf(ctx, args.projectId, args.userId);
    if (!membership) throw new Error("Membro não encontrado no projeto.");

    await ctx.db.replace(
      membership._id as Id<"projectMembers">,
      { ...membership, role: args.role }
    );
    return null;
  },
});

export const removeProjectMember = mutation({
  args: {
    projectId: v.string(),
    userId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const membership = await membershipOf(ctx, args.projectId, args.userId);
    if (!membership) return null;
    await ctx.db.delete(membership._id as Id<"projectMembers">);
    return null;
  },
});

export const listProjectMembers = query({
  args: { projectId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      projectId: v.string(),
      userId: v.string(),
      role: v.string(),
      joinedAt: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return rows.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  },
});

/** Membros do projeto já com nome/e-mail do perfil do usuário. */
export const listProjectMembersWithUser = query({
  args: { projectId: v.string() },
  returns: v.array(
    v.object({
      id: v.string(),
      projectId: v.string(),
      userId: v.string(),
      role: v.string(),
      joinedAt: v.string(),
      userName: v.optional(v.string()),
      userEmail: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const out = [];
    for (const m of rows) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_ref", (q) => q.eq("id", m.userId))
        .unique();
      out.push({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        ...(profile?.name ? { userName: profile.name } : {}),
        ...(profile?.email ? { userEmail: profile.email } : {}),
      });
    }
    return out;
  },
});
