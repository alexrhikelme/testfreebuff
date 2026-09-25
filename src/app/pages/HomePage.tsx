import { Link } from "react-router-dom";
import { Logo } from "@/shared/components/Logo";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      {/* Glow de fundo laranja */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(1000px 500px at 50% -10%, rgba(232,93,4,0.14), transparent 60%)",
        }}
      />

      <header className="relative z-10 border-b border-outline-variant/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo to="/" size="md" />
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex items-center rounded-lg border border-outline px-4 py-2 text-sm font-medium text-on-surface transition hover:border-brand hover:text-brand"
            >
              Entrar <span className="ml-1.5 text-brand">→</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col">
        <section className="mx-auto mt-12 flex max-w-4xl flex-col gap-10 px-6 text-center sm:mt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-xs font-medium text-brand-glow">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              Gestão de laboratório colaborativa
            </p>
            <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-on-surface sm:text-5xl">
              Anotações, projetos e dashboards em um só lugar
              <span className="text-brand">.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-on-surface-variant">
              Crie anotações, organize por status, defina prazos, atribua a parceiros e escolha a
              visualização que faz mais sentido: Kanban, grade ou lista.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand shadow-lg shadow-brand/30 transition hover:bg-brand-glow active:scale-[0.98]"
            >
              Começar agora
            </Link>
            <Link
              to="/app"
              className="inline-flex items-center justify-center rounded-lg border border-outline px-5 py-2.5 text-sm font-medium text-on-surface transition hover:border-brand hover:text-brand"
            >
              Ver demonstração
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 sm:text-left">
            <FeatureCard
              title="Anotações estruturadas"
              description="Status, tags, prazos e atribuição para cada nota."
            />
            <FeatureCard
              title="Dashboards colaborativos"
              description="Agrupe notas e convide membros para acompanhar o progresso."
            />
            <FeatureCard
              title="Visualizações flexíveis"
              description="Mude entre Kanban, grade ou lista sem perder o contexto."
            />
          </div>
        </section>

        <section className="mt-16 border-t border-outline-variant/50 bg-surface/40">
          <div className="mx-auto max-w-4xl px-6 py-12 text-center">
            <h2 className="font-display text-xl font-semibold tracking-tight text-on-surface">
              Focado no essencial
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-on-surface-variant">
              O SPAF nasceu para organizar o trabalho de laboratório sem sobrecarga. Menos atalhos
              obscuros, mais clareza sobre o que está acontecendo.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-on-surface-variant/70">
              <span className="inline-flex h-2 w-2 rounded-full bg-tertiary" />
              Ambiente seguro — Combogó Unicap
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest/60 p-5 text-left shadow-sm transition hover:border-brand/50">
      <h3 className="font-display text-base font-semibold text-on-surface">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">{description}</p>
    </div>
  );
}
