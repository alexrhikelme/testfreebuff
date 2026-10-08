import { useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { getBackendMode, getConvexUrl } from "./config";

/**
 * Sprint 8 (D1) — Camada de backend compartilhada.
 *
 * Envelopa o app com o ConvexAuthProvider quando VITE_CONVEX_URL está
 * configurado (inclui o ConvexProvider e o contexto de sessão do
 * Convex Auth, Sprint 9/D3); no modo local (protótipo/testes) retorna
 * os children direto, sem depender de nenhuma URL.
 */
export function AppBackendProvider({ children }: { children: ReactNode }) {
  const mode = getBackendMode();

  const client = useMemo(() => {
    const url = getConvexUrl();
    if (mode !== "convex" || !url) return null;
    return new ConvexReactClient(url);
  }, [mode]);

  if (!client) return <>{children}</>;

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
