import { useEffect, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { getBackendMode, getConvexUrl } from "./config";
import { getFirebaseFirestore, isFirebaseReady } from "@/shared/firebase";

/**
 * Camada de backend compartilhada.
 *
 * - "firebase" (padrão): o Firestore é inicializado no cliente e os hooks de
 *   dados escutam as coleções em tempo real. Não há provider de contexto
 *   porque o SDK do Firebase é um singleton de módulo.
 * - "convex": envolve o app com o ConvexAuthProvider (sessão do Convex Auth).
 * - "local": protótipo em memória, sem backend.
 */
export function AppBackendProvider({ children }: { children: ReactNode }) {
  const mode = getBackendMode();

  const client = useMemo(() => {
    const url = getConvexUrl();
    if (mode !== "convex" || !url) return null;
    return new ConvexReactClient(url);
  }, [mode]);

  // Hooks sempre no topo: inicializa o Firestore quando o modo é firebase.
  // A chamada é lazy e segura fora do navegador (retorna null).
  useEffect(() => {
    if (mode !== "firebase") return;
    getFirebaseFirestore();
  }, [mode]);

  const firebaseReady = useMemo(
    () => mode === "firebase" && isFirebaseReady(),
    [mode],
  );

  // Em modo firebase os children renderizam direto: o Firestore é global.
  if (mode === "firebase") {
    // Aviso útil no console quando o SDK não inicializou (ex.: SSR, rede
    // bloqueando o Firestore ou regras de segurança inválidas).
    if (typeof window !== "undefined" && !firebaseReady) {
      console.warn(
        "Firebase não inicializou o Firestore; o app segue sem dados remotos.",
      );
    }
    return <>{children}</>;
  }

  if (!client) return <>{children}</>;

  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
