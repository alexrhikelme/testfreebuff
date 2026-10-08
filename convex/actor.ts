import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Sprint 9 (D3) — Resolve o nome do ator a partir da sessão autenticada.
 * O cliente envia `actor` apenas como fallback (modo local/protótipo);
 * quando há sessão real, o servidor SEMPRE prevalece — o cliente não
 * pode forjar autoria.
 */
export async function getActorName(
  ctx: { db: any },
  fallback: string
): Promise<string> {
  let userId: any = null;
  try {
    userId = await getAuthUserId(ctx as any);
  } catch {
    return fallback;
  }
  if (!userId) return fallback;
  const user = await ctx.db.get(userId);
  return user?.name ?? user?.email ?? fallback;
}
