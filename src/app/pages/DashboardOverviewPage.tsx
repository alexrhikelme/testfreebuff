export default function DashboardOverviewPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Painel inicial após o login. Nesta sprint, a área serve como estrutura para a autenticação e navegação.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PlaceholderCard
          title="Próximas tarefas"
          value="—"
          description="Anotações em andamento mais próximas."
        />
        <PlaceholderCard
          title="Dashboards acessíveis"
          value="—"
          description="Lista de dashboards que você pode ver e editar."
        />
        <PlaceholderCard
          title="Membros do time"
          value="—"
          description="Pessoas com quem você colabora."
        />
      </div>

      <div className="mt-8 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
        <p className="text-sm text-on-surface-variant">
          Esta é uma área de demonstração da Sprint 1. As funcionalidades reais de notas, dashboards e equipe serão construídas nas próximas iterações.
        </p>
      </div>
    </div>
  );
}

function PlaceholderCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface/60 p-5">
      <p className="text-sm font-medium text-on-surface-variant">{title}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-on-surface">
        {value}
      </p>
      <p className="mt-2 text-xs text-on-surface-variant/80">{description}</p>
    </div>
  );
}
