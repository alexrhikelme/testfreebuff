import { Navigate, Outlet, useLocation } from "react-router-dom";
import React, {
  createContext,
  useContext,
  useEffect,
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
  sendEmailVerification,
  reload,
  updateProfile,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseFirestore } from "@/shared/firebase";
import { getBackendMode } from "@/shared/backend/config";
import {
  ensureUserProfile,
  requestServerAdmin,
  useAdminRequestQuery,
} from "@/shared/backend/hooks";
import type { SiteRole } from "@/features/dashboards/types";
import {
  authenticate,
  registerAccount,
} from "@/shared/auth/localAccounts";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  /** Papel no SITE (o papel por projeto vive em `members`). */
  role: SiteRole;
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

/**
 * Estado de acesso do workspace (só o modo Firebase aplica barreiras; os
 * modos local/Convex continuam sem `access`).
 */
export type AccessState = {
  /** Perfil (`users/{uid}`) ainda carregando. */
  loading: boolean;
  /** E-mail confirmado no Firebase Auth. */
  verified: boolean;
  /** Papel no site; `null` = perfil ainda não provisionado. */
  role: SiteRole | null;
  uid: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** Autenticação em carregamento (apenas modo Convex). */
  isLoading: boolean;
  signIn: (next: string, options?: SignInOptions) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  returnTo: ReturnToState | null;
  /** Presente só quando há regras de acesso a aplicar (modo Firebase). */
  access?: AccessState;
  /** Relê o perfil/verificação no Firebase (usado nas telas de bloqueio). */
  refreshAccess?: () => Promise<void>;
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
        // No modo local todos são "usuário do site"; a demo continua com
        // permissão de projeto total pelo store (que é local).
        role: "user",
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

/**
 * Normaliza o papel de site guardado em `users/{uid}`.
 * Papéis do modelo antigo (admin/editor/viewer) valem como usuário comum:
 * eles davam acesso ao site inteiro e não devem virar ServerADM.
 */
function normalizeSiteRole(value: unknown): SiteRole | null {
  if (value === "server_admin") return "server_admin";
  if (value === "user" || value === "admin" || value === "editor" || value === "viewer") {
    return "user";
  }
  return null;
}

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
 * - O papel (`role`) vem de `users/{uid}`, criado por um admin. Sem esse
 *   documento o usuário fica em "acesso pendente" (as regras do Firestore
 *   negam leitura/escrita para quem não é membro).
 * - O e-mail precisa estar verificado (`emailVerified`), também exigido
 *   pelas regras.
 * - O nome exibido vem do `displayName` do Firebase Auth (preenchido no
 *   cadastro) ou do prefixo do e-mail.
 */
function FirebaseAuthShell({ children }: { children?: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [returnTo, setReturnTo] = useState<ReturnToState | null>(null);
  const [access, setAccess] = useState<AccessState>({
    loading: false,
    verified: false,
    role: null,
    uid: null,
  });

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
              role: "user",
            }
          : null,
      );
      setAccess(
        next
          ? {
              loading: true,
              verified: next.emailVerified,
              role: null,
              uid: next.uid,
            }
          : { loading: false, verified: false, role: null, uid: null },
      );
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Papel real: `users/{uid}`. O Firestore permite que o próprio usuário leia
  // esse documento (as demais coleções exigem ser membro), então a tela de
  // "acesso pendente" sabe diferenciar "sem convite" de "erro de rede".
  const uid = user?.id ?? null;
  React.useEffect(() => {
    const firestore = getFirebaseFirestore();
    if (!firestore || !uid) return;
    let cancelled = false;

    const applyRole = (role: SiteRole | null) => {
      if (cancelled) return;
      setAccess((prev) => ({ ...prev, loading: false, role, uid }));
      if (role) setUser((prev) => (prev ? { ...prev, role } : prev));
    };

    const unsubscribe = onSnapshot(
      doc(firestore, "users", uid),
      (snap) => {
        const role = snap.exists()
          ? normalizeSiteRole((snap.data() as Record<string, unknown>).role)
          : null;
        if (role) {
          applyRole(role);
          return;
        }
        // Primeiro acesso: o perfil é criado sozinho com o papel padrão
        // "user" — não existe mais liberação manual de conta nova.
        void ensureUserProfile()
          .catch((error) => {
            console.error("Provisionamento do perfil falhou:", error);
          })
          .then(() => applyRole(null));
      },
      (error) => {
        console.error("Perfil (users/{uid}) ilegível:", error);
        applyRole(null);
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  /** Relê verificação de e-mail e perfil (telas de bloqueio). */
  const refreshAccess = async () => {
    const auth = getFirebaseAuth();
    const current = auth?.currentUser;
    if (!current) return;
    try {
      await reload(current);
    } catch (e) {
      console.error("reload do usuário falhou:", e);
    }
    setAccess((prev) => ({ ...prev, verified: current.emailVerified }));
    if (current.emailVerified) {
      // Tenta provisionar de novo (regras recém-publicadas, por exemplo).
      try {
        await ensureUserProfile();
      } catch (e) {
        console.error("Provisionamento do perfil falhou:", e);
      }
    }
  };

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
        // Sem e-mail verificado as regras bloqueiam tudo — dispara já no cadastro.
        try {
          await sendEmailVerification(credential.user);
        } catch (e) {
          console.error("Envio do e-mail de verificação falhou:", e);
        }
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

  const value: AuthContextValue = {
    user,
    isLoading,
    signIn,
    signOut,
    returnTo,
    access,
    refreshAccess,
  };

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
    role: string;
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
          // Convex guarda apenas papel de projeto; o site trata como "user".
          role: "user",
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
/* ------------------------------------------------------------------ */
/* Barreiras de acesso do modo Firebase (e-mail e convite do admin).   */
/* ------------------------------------------------------------------ */

function GateLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-on-surface">
      <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-low p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-on-surface">{title}</h1>
        <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p>
        <div className="mt-4 space-y-3 text-sm text-on-surface-variant">{children}</div>
      </div>
    </div>
  );
}

/** E-mail ainda não confirmado: as regras do Firestore negam tudo. */
function EmailVerificationGate({ email }: { email: string }) {
  const { signOut, refreshAccess } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    const current = getFirebaseAuth()?.currentUser;
    if (!current) return;
    setBusy(true);
    try {
      await sendEmailVerification(current);
      setMessage("E-mail reenviado. Confira a caixa de entrada e o spam.");
    } catch (e) {
      console.error("Reenvio de verificação falhou:", e);
      setMessage("Não foi possível reenviar agora. Tente novamente em instantes.");
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    try {
      await refreshAccess?.();
      const verified = getFirebaseAuth()?.currentUser?.emailVerified ?? false;
      setMessage(
        verified
          ? "E-mail confirmado! Liberando o acesso…"
          : "Ainda não consta como confirmado. Abra o link do e-mail e tente de novo.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <GateLayout
      title="Confirme seu e-mail"
      subtitle={`Enviamos um link de confirmação para ${email}. O acesso ao workspace só é liberado depois da confirmação.`}
    >
      {message && <p className="rounded-md bg-surface-container px-3 py-2">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void recheck()}
          disabled={busy}
          className="rounded bg-brand px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-strong disabled:opacity-60"
        >
          Já confirmei
        </button>
        <button
          type="button"
          onClick={() => void resend()}
          disabled={busy}
          className="rounded border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-surface-container disabled:opacity-60"
        >
          Reenviar e-mail
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded px-3 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Sair
        </button>
      </div>
    </GateLayout>
  );
}

/**
 * Tela de "acesso pendente" — usada SOMENTE para quem pediu o cargo de
 * ServerADM (reaproveita o layout de bloqueio e mostra o UID a enviar para
 * os desenvolvedores).
 */
export function ServerAdminRequestPage() {
  const { user, signOut } = useAuth();
  const request = useAdminRequestQuery();
  const [uidValue, setUidValue] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const uid = uidValue ?? user?.id ?? "";
  const isServerAdmin = user?.role === "server_admin";

  useEffect(() => {
    setUidValue(getFirebaseAuth()?.currentUser?.uid ?? null);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (isServerAdmin) {
    return (
      <GateLayout
        title="Você já é ServerADM"
        subtitle="Sua conta já pode ver e administrar todos os projetos do site."
      >
        <p className="text-xs">Conta: {user?.email}</p>
      </GateLayout>
    );
  }

  return (
    <GateLayout
      title="Acesso pendente"
      subtitle="Pedido de ServerADM registrado. Ele é concedido apenas pelos desenvolvedores."
    >
      <div className="rounded-md border border-outline-variant/60 bg-surface-container px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-on-surface-variant/70">Seu UID</p>
        <p className="mt-1 break-all font-mono text-xs text-on-surface">{uid}</p>
      </div>
      <p className="text-xs">
        Envie este UID para um desenvolvedor. No console do Firebase: Firestore
        → coleção <code>users</code> → documento com este UID → campo{" "}
        <code>role</code> = <code>server_admin</code>.
      </p>
      <p className="text-xs text-on-surface-variant/70">
        Conta: {user?.email} · Pedido: {request.exists ? "registrado" : "não registrado"}
      </p>
      <div className="flex flex-wrap gap-2">
        {!request.exists && (
          <button
            type="button"
            onClick={() => {
              void requestServerAdmin().catch((error) => {
                console.error("Pedido de ServerADM falhou:", error);
              });
            }}
            className="rounded bg-brand px-3 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-strong"
          >
            Registrar pedido
          </button>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="rounded border border-outline-variant px-3 py-2 text-sm font-medium transition hover:bg-surface-container"
        >
          {copied ? "Copiado" : "Copiar UID"}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded px-3 py-2 text-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Sair
        </button>
      </div>
    </GateLayout>
  );
}

export const RequireAuth: React.FC<{ children?: React.ReactNode }> = () => {
  const { user, isLoading, access } = useAuth();
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

  // Modo Firebase: a única barreira de entrada é o e-mail não confirmado
  // (sem ele as regras negam leitura/escrita e o app pareceria vazio).
  //
  // O perfil (`users/{uid}`) é dado de fundo: o app já entra com o papel
  // padrão "user" e, quando o documento chega, a UI se ajusta (por exemplo,
  // liberando o link de ServerADM). Assim não existe tela de carregamento no
  // caminho normal — e "Acesso pendente" só existe na rota de pedido.
  if (access && !access.verified) {
    return <EmailVerificationGate email={user.email} />;
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
