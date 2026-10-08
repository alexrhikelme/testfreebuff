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
import { getBackendMode } from "@/shared/backend/config";

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
    _options?: SignInOptions
  ): Promise<SignInResult> => {
    // Pequena latência simulada para estados de loading.
    await new Promise((r) => setTimeout(r, 300));
    const authUser: AuthUser = {
      id: "user-1",
      name: "Ana Costa",
      email: "ana@lab.local",
      role: "admin",
    };
    setUser(authUser);
    setReturnTo({ path: next, from: { pathname: next, search: "", hash: "" } });
    return { ok: true };
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
/* Modo Convex (Sprint 9 — D3): sessão real via Convex Auth.           */
/* ------------------------------------------------------------------ */

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalidaccountid") || m.includes("invalidpassword") || m.includes("credentials")) {
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
    isAuthenticated ? {} : "skip"
  ) as {
    userId: string;
    name: string;
    email: string;
    role: AuthRole;
  } | null;
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);

  const signIn = async (
    next: string,
    options?: SignInOptions
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
  const Shell = mode === "convex" ? ConvexAuthShell : LocalAuthShell;
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface-variant">
        <span className="text-sm">Carregando…</span>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
};
