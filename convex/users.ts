import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Sprint 9 (D3) — Identidade do usuário autenticado.
 *
 * Retorna `null` quando não há sessão; caso contrário, os dados do usuário
 * com o papel derivado da tabela `members` (convite por e-mail): o papel
 * mais privilegiado entre os dashboards em que é membro. Sem registro de
 * membro → "viewer" (somente leitura até ser convidado).
 */
const ROLE_RANK: Record<string, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user?.email) return null;

    const allMembers = await ctx.db.query("members").collect();
    const mine = allMembers.filter(
      (m) => m.email.toLowerCase() === user.email!.toLowerCase()
    );
    let best = "viewer";
    for (const m of mine) {
      if (ROLE_RANK[m.role] > ROLE_RANK[best]) best = m.role;
    }

    return {
      userId,
      name: user.name ?? user.email,
      email: user.email,
      role: best as "admin" | "editor" | "viewer",
    };
  },
});
