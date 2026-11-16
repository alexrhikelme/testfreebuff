/**
 * Sprint 8 (D1) — Persistência real com Firebase (Firestore).
 *
 * O app opera em três modos, decididos em tempo de execução:
 * - "firebase": VITE_FIREBASE_PROJECT_ID configurada E o Firestore inicializa
 *   no navegador → dados no banco Firebase, sincronizados em tempo real entre
 *   usuários (via onSnapshot).
 * - "convex": VITE_CONVEX_URL configurada e alcançável pelo navegador → dados
 *   no banco Convex, sincronizados em tempo real entre usuários.
 * - "local": modo protótipo em memória, usado pelos testes e como fallback
 *   (mesma API, zero mudança nas views).
 *
 * Regra de ativação do Firebase: VITE_FIREBASE_PROJECT_ID deve estar
 * configurada e o Firebase deve inicializar com sucesso no navegador. Em
 * previews hospedados sem essa configuração, o app cai para o modo local até
 * que uma configuração de projeto Firebase esteja acessível.
 */
export type BackendMode = "firebase" | "convex" | "local";

/**
 * Seleção explícita do backend via VITE_BACKEND_MODE
 * ("firebase" | "convex" | "local"). Sem valor, o app usa Firebase.
 */
function getBackendOverride(): BackendMode | undefined {
  const value = import.meta.env.VITE_BACKEND_MODE;
  if (value === "firebase" || value === "convex" || value === "local") {
    return value;
  }
  return undefined;
}

function isLoopbackHost(host: string): boolean {
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1"
  );
}

function isFirebaseHost(host: string): boolean {
  return host.endsWith(".firebaseapp.com") || host.endsWith(".web.app");
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

/**
 * Configuração do Firebase: o app usa Firebase quando a variável de ambiente
 * VITE_FIREBASE_PROJECT_ID está definida. O Firebase pode também usar
 * VITE_FIREBASE_EMULATOR_HOST para conexão local durante o desenvolvimento.
 */
export function getFirebaseProjectId(): string | undefined {
  const id = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

/**
 * Resolve o modo do backend.
 *
 * Firebase é o backend padrão do app: a configuração do projeto está em
 * src/shared/firebase.ts, então o Firestore está sempre disponível no
 * navegador, sem depender de variáveis de ambiente. Os outros modos só
 * entram em cena por escolha explícita:
 * - "local": protótipo em memória (também usado pelos testes);
 * - "convex": backend Convex, quando VITE_BACKEND_MODE=convex.
 */
export function getBackendMode(): BackendMode {
  // Testes rodam sempre contra o protótipo em memória (determinístico).
  if (import.meta.env.MODE === "test") return "local";

  const override = getBackendOverride();
  if (override) return override;

  // Firebase é o backend padrão: configuração embutida no cliente.
  return "firebase";
}

/** Usuário simulado da sessão (o auth da Sprint 1 é simulado). */
export const CURRENT_USER = "Ana Costa";

export const MAX_ACTIVITY = 30;

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
