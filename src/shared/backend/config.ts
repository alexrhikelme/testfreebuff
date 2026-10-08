/**
 * Sprint 8 (D1) — Persistência real com Convex.
 *
 * O app opera em dois modos, decididos em tempo de execução:
 * - "convex": VITE_CONVEX_URL configurada E alcançável pelo navegador →
 *   dados no banco Convex, sincronizados em tempo real entre usuários.
 * - "local": modo protótipo em memória, usado pelos testes e como fallback
 *   (mesma API, zero mudança nas views).
 *
 * Regra de ativação: uma URL local (127.0.0.1/localhost) só é usada quando
 * o próprio navegador roda na mesma máquina (dev local). Em previews
 * hospedados, o navegador do usuário não alcança 127.0.0.1 do servidor —
 * nesses casos caímos para o modo local até haver uma URL de backend
 * persistente (ex.: deployment Convex em nuvem).
 */
export type BackendMode = "convex" | "local";

function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

/** URL do backend Convex quando utilizável a partir deste navegador. */
export function getConvexUrl(): string | undefined {
  const url = import.meta.env.VITE_CONVEX_URL;
  if (typeof url !== "string" || url.length === 0) return undefined;
  try {
    const parsed = new URL(url);
    if (
      isLoopbackHost(parsed.hostname) &&
      typeof window !== "undefined" &&
      !isLoopbackHost(window.location.hostname)
    ) {
      // Navegador remoto não alcança o loopback do servidor.
      return undefined;
    }
    return url;
  } catch {
    return undefined;
  }
}

export function getBackendMode(): BackendMode {
  // Testes rodam sempre contra o protótipo em memória (determinístico).
  if (import.meta.env.MODE === "test") return "local";
  return getConvexUrl() ? "convex" : "local";
}

/** Usuário simulado da sessão (o auth da Sprint 1 é simulado). */
export const CURRENT_USER = "Ana Costa";

export const MAX_ACTIVITY = 30;

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
