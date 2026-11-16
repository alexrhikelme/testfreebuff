import { Navigate, Outlet, useLocation } from "react-router-dom";
import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { getFirebaseAuth } from "@/shared/firebase";
import { getBackendMode } from "@/shared/backend/config";
import {
  authenticate,
  registerAccount,
} from "@/shared/auth/localAccounts";

type AuthRole = "admin" | "editor" | "viewer";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
};

type SignInOptions = {
  email?: string;
  password?: string;
  name?: string;
  /** "signIn" para entrar, "signUp" para criar conta. */
  flow?: "signIn" | "signUp";
};

type SignInResult = { ok: boolean; error?: string };

type ReturnToState = {
  path: string;
  from: { pathname: string; search: string; hash: string };
};

type AuthContextValue = {
  user: AuthUser | null;
  /** Autenticação em carregamento (apenas modo Convex). */
  isLoading: boolean;
  signIn: (next: string, options?: SignInOptions) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  returnTo: ReturnToState | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthShell");
  }
  return ctx;
};

/** 
 * Variante segura para uso fora do AuthShell (ex.: stores em testes):
 * sem provider, devolve usuário nulo em vez de lançar erro.
 */
export const useOptionalAuth = (): { user: AuthUser | null } => {
  const ctx = useContext(AuthContext);
  return { user: ctx?.user ?? null };
};

/* ------------------------------------------------------------------ */
/* Modo local (protótipo e testes): sessão simulada, API idêntica.     */
/* ------------------------------------------------------------------ */

function LocalAuthShell({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);

  const signIn = async (
    next: string,
    options?: SignInOptions,
  ): Promise<SignInResult> => {
    // Pequena latência simulada para estados de loading.
    await new Promise((r) => setTimeout(r, 300));
    try {
      // P1 — mesmas regras do Convex Auth: credenciais validadas, e-mail
      // único e papel definido pelo cadastro (novas contas = viewer).
      const account =
        options?.flow === "signUp"
          ? registerAccount({
              name: options.name ?? "",
              email: options.email ?? "",
              password: options.password ?? "",
            })
          : (() => {
              const result = authenticate(
                options?.email ?? "",
                options?.password ?? "",
              );
              if (!result.ok) throw new Error(result.error);
              return result.account;
            })();

      setUser({
        id: `local-${account.email}`,
        name: account.name,
        email: account.email,
        role: account.role,
      });
      setReturnTo({ path: next, from: { pathname: next, search: "", hash: "" } });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Não foi possível concluir o acesso.",
      };
    }
  };

  const signOut = async () => {
    setUser(null);
    setReturnTo(null);
  };

  const value: AuthContextValue = {
    user,
    isLoading: false,
    signIn,
    signOut,
    returnTo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Modo Firebase: sessão real via Firebase Auth (e-mail + senha).      */
/* ------------------------------------------------------------------ */

function mapFirebaseAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "E-mail ou senha incorretos.";
    case "auth/invalid-email":
      return "Informe um e-mail válido.";
    case "auth/email-already-in-use":
      return "Já existe uma conta com este e-mail.";
    case "auth/weak-password":
      return "A senha deve ter pelo menos 6 caracteres.";
    case "auth/operation-not-allowed":
      return "Login por e-mail/senha está desativado no projeto Firebase.";
    case "auth/network-request-failed":
      return "Falha de rede ao falar com o Firebase. Tente novamente.";
    case "auth/too-many-requests":
      return "Muitas tentativas. Aguarde um instante e tente de novo.";
    case "auth/unauthorized-domain":
      return "Domínio não autorizado no Firebase Auth (adicione-o no console).";
    default:
      return "Não foi possível concluir o acesso. Tente novamente.";
  }
}

/**
 * Modo Firebase — o Firestore exige um usuário autenticado para ler e
 * gravar (as regras do projeto negam acesso anônimo). Por isso a sessão é
 * real: o Firestore recebe o token do Firebase Auth do usuário logado.
 *
 * Limitações conhecidas:
 * - O papel (`role`) do usuário ainda não vem do banco: usuários logados
 *   entram como administradores do workspace. Um controle por claims/documento
 *   de perfil pode ser adicionado depois.
 * - O nome exibido vem do `displayName` do Firebase Auth (preenchido no
 *   cadastro) ou do prefixo do e-mail.
 */
function FirebaseAuthShell({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);

  // Sessão persistida pelo próprio SDK: restaura o usuário ao recarregar.
  React.useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setIsLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      setUser(
        next
          ? {
              id: next.uid,
              name: next.displayName || (next.email ?? "Usuário").split("@")[0],
              email: next.email ?? "",
              role: "admin",
            }
          : null,
      );
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (
    next: string,
    options?: SignInOptions,
  ): Promise<SignInResult> => {
    const auth = getFirebaseAuth();
    if (!auth) {
      return { ok: false, error: "Firebase Auth não inicializou neste ambiente." };
    }
    const email = options?.email ?? "";
    const password = options?.password ?? "";
    try {
      if (options?.flow === "signUp") {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );
        const name = options?.name?.trim();
        if (name) await updateProfile(credential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setReturnTo({
        path: next,
        from: { pathname: next, search: "", hash: "" },
      });
      return { ok: true };
    } catch (e) {
      const code =
        typeof e === "object" && e !== null && "code" in e
          ? String((e as { code: unknown }).code)
          : "";
      return { ok: false, error: mapFirebaseAuthError(code) };
    }
  };

  const signOut = async () => {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await firebaseSignOut(auth);
      } catch (e) {
        console.error("signOut falhou:", e);
      }
    }
    setReturnTo(null);
  };

  const value: AuthContextValue = { user, isLoading, signIn, signOut, returnTo };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */
/* Modo Convex (Sprint 9 — D3): sessão real via Convex Auth.           */
/* ------------------------------------------------------------------ */

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes("invalidaccountid") ||
    m.includes("invalidpassword") ||
    m.includes("credentials")
  ) {
    return "E-mail ou senha incorretos.";
  }
  if (m.includes("alreadyexists")) {
    return "Já existe uma conta com este e-mail.";
  }
  if (m.includes("password")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  return "Não foi possível concluir o acesso. Tente novamente.";
}

function ConvexAuthShell({ children }: { children?: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn: convexSignIn, signOut: convexSignOut } = useAuthActions();
  const me = useQuery(
    api.users.me,
    isAuthenticated ? {} : "skip",
  ) as {
    userId: string;
    name: string;
    email: string;
    role: AuthRole;
  } | null;
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);

  const signIn = async (
    next: string,
    options?: SignInOptions,
  ): Promise<SignInResult> => {
    try {
      await convexSignIn("password", {
        flow: options?.flow ?? "signIn",
        email: options?.email ?? "",
        password: options?.password ?? "",
        ...(options?.name ? { name: options.name } : {}),
      });
      setReturnTo({
        path: next,
        from: { pathname: next, search: "", hash: "" },
      });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: mapAuthError(e instanceof Error ? e.message : String(e)),
      };
    }
  };

  const signOut = async () => {
    try {
      await convexSignOut();
    } catch (e) {
      console.error("signOut falhou:", e);
    }
    setReturnTo(null);
  };

  const user: AuthUser | null =
    isAuthenticated && me
      ? {
          id: me.userId,
          name: me.name,
          email: me.email,
          role: me.role,
        }
      : null;

  const value: AuthContextValue = {
    user,
    isLoading,
    signIn,
    signOut,
    returnTo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ------------------------------------------------------------------ */

export function AuthShell({ children }: { children?: ReactNode }) {
  const mode = getBackendMode();
  let Shell: React.FC<{ children?: ReactNode }>;
  if (mode === "firebase") {
    Shell = FirebaseAuthShell;
  } else if (mode === "convex") {
    Shell = ConvexAuthShell;
  } else {
    Shell = LocalAuthShell;
  }
  return <Shell>{children}</Shell>;
}
export const RequireAuth: React.FC<{ children?: React.ReactNode }> = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        <span className="text-sm">Carregando…</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
export const PublicOnly: React.FC<{ children?: React.ReactNode }> = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        <span className="text-sm">Carregando…</span>
      </div>
    );
  }

  if (user) {
    // Ao sair da tela pública (login concluído) o destino é o original
    // pedido pelo usuário (returnTo), não sempre /app: sem isso o bounce
    // deste componente pode sobrescrever a volta para a rota profunda.
    const from = (location.state as { from?: { pathname?: string } } | null)
      ?.from?.pathname;
    return <Navigate to={from ?? "/app"} replace />;
  }

  return <Outlet />;
};
