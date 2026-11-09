import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Sprint 11 (P1) — Autorização do backend.
 *
 * O servidor nunca confia no cliente: o usuário é resolvido pela sessão do
 * Convex Auth (`getAuthUserId`) e o papel vem da tabela `members` (o mais
 * privilegiado entre os dashboards em que o e-mail foi convidado).
 *
 * Escala de papéis:
 * - viewer  → somente leitura;
 * - editor  → cria/edita/move/exclui anotações e dashboards;
 * - admin   → tudo do editor + excluir dashboards e gerenciar membros.
 *
 * A conta de demonstração/desenvolvimento (`ana@unicap.br`) é admin por
 * definição: ela precisa enxergar e operar todos os registros da demo,
 * mesmo antes de qualquer convite existir no banco.
 */

export type AppRole = "admin" | "editor" | "viewer";

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: AppRole;
};

/** Conta de teste mantida pelos desenvolvedores (ver relatório do produto). */
export const DEMO_ACCOUNT = {
  email: "ana@unicap.br",
  name: "Ana Costa",
  role: "admin" as const,
};

const ROLE_RANK: Record<AppRole, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

export const AUTH_ERROR = "Faça login para continuar.";
const EDITOR_ERROR =
  "Seu perfil é somente leitura. Peça a um administrador para liberar a edição.";
const ADMIN_ERROR = "Apenas administradores podem executar esta ação.";
const PROJECT_ERROR = "Apenas o responsável pelo projeto pode executar esta ação.";

/** `true` quando o papel atende ao mínimo exigido. */
export function hasAtLeast(role: AppRole | null, min: AppRole): boolean {
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Mensagem de recusa por papel mínimo. */
export function permissionError(min: AppRole): string {
  if (min === "admin") return ADMIN_ERROR;
  if (min === "editor") return EDITOR_ERROR;
  return AUTH_ERROR;
}

export const projectPermissionError = PROJECT_ERROR;

type Ctx = QueryCtx | MutationCtx;

/** Contexto mínimo usado pelos helpers (facilita testes com ctx falso). */
type DbCtx = { db: any };

/** Id do usuário da sessão; `null` quando não há autenticação válida. */
export async function sessionUserId(ctx: Ctx): Promise<string | null> {
  try {
    return (await getAuthUserId(ctx as never)) ?? null;
  } catch {
    return null;
  }
}

/**
 * Papel derivado do e-mail: o mais alto entre os convites da tabela
 * `members`. A conta de demonstração é admin por definição.
 */
export async function roleForEmail(ctx: DbCtx, email: string): Promise<AppRole> {
  const normalized = email.trim().toLowerCase();
  let best: AppRole = normalized === DEMO_ACCOUNT.email ? "admin" : "viewer";

  const members: Array<{ email: string; role: AppRole }> =
    await ctx.db.query("members").collect();
  for (const member of members) {
    if (member.email.trim().toLowerCase() !== normalized) continue;
    if (ROLE_RANK[member.role] > ROLE_RANK[best]) best = member.role;
  }
  return best;
}

/** Usuário autenticado com o papel do domínio (ou `null` sem sessão). */
export async function currentUser(ctx: Ctx): Promise<SessionUser | null> {
  const userId = await sessionUserId(ctx);
  if (!userId) return null;

  const user = (await (ctx as unknown as DbCtx).db.get(
    userId as Id<"users">
  )) as Doc<"users"> | null;
  if (!user?.email) return null;

  const email = user.email.trim().toLowerCase();
  return {
    userId,
    name: user.name?.trim() || email,
    email,
    role: await roleForEmail(ctx as unknown as DbCtx, email),
  };
}

/** Exige sessão válida. */
export async function requireUser(ctx: Ctx): Promise<SessionUser> {
  const user = await currentUser(ctx);
  if (!user) throw new Error(AUTH_ERROR);
  return user;
}

/** Exige sessão com papel mínimo (`editor` ou `admin`). */
export async function requireRole(
  ctx: Ctx,
  min: AppRole
): Promise<SessionUser> {
  const user = await requireUser(ctx);
  if (!hasAtLeast(user.role, min)) throw new Error(permissionError(min));
  return user;
}

/** Atalho: exige admin. */
export function requireAdmin(ctx: Ctx): Promise<SessionUser> {
  return requireRole(ctx, "admin");
}

/** Vínculo do usuário (por e-mail) com o projeto. */
export async function projectMembership(
  ctx: DbCtx,
  projectId: string,
  userId: string
): Promise<{ id: string; role: string } | undefined> {
  const rows: Array<{ id: string; projectId: string; userId: string; role: string }> =
    await ctx.db
      .query("projectMembers")
      .withIndex("by_project", (q: any) => q.eq("projectId", projectId))
      .collect();
  return rows.find((row) => row.userId === userId);
}

/**
 * Exige admin global OU papel owner/admin no projeto informado.
 * Usado por atualização, exclusão e gestão de membros do projeto.
 */
export async function requireProjectManager(
  ctx: Ctx,
  projectId: string
): Promise<SessionUser> {
  const user = await requireUser(ctx);
  if (user.role === "admin") return user;

  const membership = await projectMembership(
    ctx as unknown as DbCtx,
    projectId,
    user.email
  );
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    throw new Error(PROJECT_ERROR);
  }
  return user;
}
