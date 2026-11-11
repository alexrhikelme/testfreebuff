import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { currentUser } from "./permissions";

/**
 * Sprint 9 (D3) — Identidade do usuário autenticado.
 *
 * Retorna `null` quando não há sessão; caso contrário, os dados do usuário
 * com o papel derivado em `permissions.ts` (convite por e-mail na tabela
 * `members`). Sem registro → "viewer" até ser convidado.
 */

export const me = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.id("users"),
      name: v.string(),
      email: v.string(),
      role: v.union(
        v.literal("admin"),
        v.literal("editor"),
        v.literal("viewer")
      ),
    })
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    return {
      userId: user.userId as Id<"users">,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
});
