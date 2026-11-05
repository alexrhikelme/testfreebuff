import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";

const PROFILE_ROLE = v.union(
  v.literal("admin"),
  v.literal("editor"),
  v.literal("viewer")
);

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Projeta o documento no contrato público (sem `_id`/`_creationTime`). */
function toProfile(row: Doc<"profiles">) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}),
    ...(row.bio ? { bio: row.bio } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Contas de usuário do produto.
 *
 * O `users` do Convex Auth guarda credenciais/sessão; esta tabela guarda o
 * perfil de produto (papel, bio, avatar) usado por projetos e permissões.
 * A criação é idempotente por e-mail: repetir o cadastro devolve o perfil
 * existente em vez de duplicar a conta.
 */
export const createProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.optional(PROFILE_ROLE),
    avatarUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  returns: v.object({
    id: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.string(),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Informe o e-mail.");
    if (!args.name.trim()) throw new Error("Informe o nome.");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      return {
        id: existing.id,
        name: existing.name,
        email: existing.email,
        role: existing.role,
        created: false,
      };
    }

    const now = nowIso();
    const id = makeId("user");
    const role = args.role ?? "viewer";

    await ctx.db.insert("profiles", {
      id,
      name: args.name.trim(),
      email,
      role,
      ...(args.avatarUrl ? { avatarUrl: args.avatarUrl } : {}),
      ...(args.bio ? { bio: args.bio } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return {
      id,
      name: args.name.trim(),
      email,
      role,
      created: true,
    };
  },
});

export const getProfileByEmail = query({
  args: { email: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      role: v.string(),
      avatarUrl: v.optional(v.string()),
      bio: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    return row ? toProfile(row) : null;
  },
});

export const getProfileById = query({
  args: { id: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      name: v.string(),
      email: v.string(),
      role: v.string(),
      avatarUrl: v.optional(v.string()),
      bio: v.optional(v.string()),
      createdAt: v.string(),
      updatedAt: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    return row ? toProfile(row) : null;
  },
});

export const updateProfile = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    role: v.optional(PROFILE_ROLE),
    bio: v.optional(v.union(v.string(), v.null())),
    avatarUrl: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("profiles")
      .withIndex("by_ref", (q) => q.eq("id", args.id))
      .unique();
    if (!row) throw new Error("Perfil não encontrado.");

    const next: Record<string, unknown> = { ...row, updatedAt: nowIso() };
    if (args.name !== undefined) {
      if (!args.name.trim()) throw new Error("Informe o nome.");
      next.name = args.name.trim();
    }
    if (args.role !== undefined) next.role = args.role;
    if (args.bio === null) delete next.bio;
    else if (args.bio !== undefined) next.bio = args.bio;
    if (args.avatarUrl === null) delete next.avatarUrl;
    else if (args.avatarUrl !== undefined) next.avatarUrl = args.avatarUrl;

    await ctx.db.replace(
      row._id as Id<"profiles">,
      next as unknown as {
        id: string;
        name: string;
        email: string;
        role: "admin" | "editor" | "viewer";
        avatarUrl?: string;
        bio?: string;
        createdAt: string;
        updatedAt: string;
      }
    );
    return null;
  },
});
