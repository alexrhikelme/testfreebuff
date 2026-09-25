import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../router/AppRouter";
import { Logo } from "@/shared/components/Logo";

const inputClass =
  "mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25";

export default function AuthPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/app";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function tabClass(active: boolean) {
    return active
      ? "flex-1 rounded-none border-0 border-b-2 border-brand bg-transparent px-4 py-2 text-sm font-medium text-brand-glow"
      : "flex-1 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Informe o e-mail.");
      return;
    }
    if (mode === "signin" && !password) {
      setError("Informe a senha.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Informe seu nome.");
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      signIn(from);
      navigate(from, { replace: true });
    } catch {
      setError("Não foi possível concluir o acesso. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Logo to="/" size="md" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <Logo size="xl" withText={false} />
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-on-surface">
              Acesse sua conta
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              Ou crie uma nova para começar a organizar seu laboratório.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-lg">
            <div className="flex border-b border-outline-variant/60">
              <button
                type="button"
                className={tabClass(mode === "signin")}
                onClick={() => setMode("signin")}
              >
                Entrar
              </button>
              <button
                type="button"
                className={tabClass(mode === "signup")}
                onClick={() => setMode("signup")}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-on-surface">Nome</label>
                  <input
                    type="text"
                    placeholder="Ana Costa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-on-surface">E-mail</label>
                <input
                  type="email"
                  placeholder="ana@unicap.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface">Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </div>

              {error && <p className="text-sm text-error">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-on-brand shadow-lg shadow-brand/25 transition hover:bg-brand-glow disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Entrando..." : mode === "signin" ? "Entrar" : "Criar conta"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-on-surface-variant/70">
            Ainda sem conta?{" "}
            <button
              type="button"
              className="text-brand hover:underline"
              onClick={() => setMode("signup")}
            >
              Crie agora
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
