import { useMemo } from "react";
import { useNotes } from "@/features/notes";
import { ActivityFeed } from "@/features/notes/ActivityFeed";
import { useLab } from "@/features/dashboards/store";
import { getDeadlineState, describeDeadline } from "@/features/notes/deadline";
import { NoteStatusChip } from "@/features/notes/NoteStatusChip";
import { Link } from "react-router-dom";

export default function DashboardOverviewPage() {
  const { notes } = useNotes();
  const { dashboards, members } = useLab();

  const counts = useMemo(() => {
    const byStatus = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };
    let overdue = 0;
    for (const n of notes) {
      byStatus[n.status] += 1;
      if (getDeadlineState(n) === "overdue") overdue += 1;
    }
    return { byStatus, overdue };
  }, [notes]);

  const upcoming = useMemo(
    () =>
      notes
        .filter((n) => n.status !== "completed" && n.dueDate)
        .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
        .slice(0, 5),
    [notes]
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
          Visão geral
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Resumo do trabalho do laboratório em tempo real.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Em andamento"
          value={counts.byStatus.in_progress}
          description="Notas ativas agora"
          accent="brand"
        />
        <StatCard
          label="Atrasadas"
          value={counts.overdue}
          description="Passaram do prazo"
          accent={counts.overdue > 0 ? "error" : "tertiary"}
        />
        <StatCard
          label="Dashboards"
          value={dashboards.length}
          description="Grupos de trabalho"
          accent="primary"
        />
        <StatCard
          label="Membros"
          value={members.length}
          description="Pessoas com acesso"
          accent="tertiary"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {(
          [
            ["not_started", "Não iniciadas"],
            ["completed", "Concluídas"],
            ["blocked", "Bloqueadas"],
          ] as const
        ).map(([status, label]) => (
          <div
            key={status}
            className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">{label}</span>
              <span className="font-display text-2xl font-semibold text-on-surface">
                {counts.byStatus[status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-on-surface">
            Acesso rápido
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map((q) => (
            <Link
              key={q.to}
              to={q.to}
              className="group flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-glow ring-1 ring-brand/20">
                <QuickIcon name={q.icon} />
              </span>
              <span className="mt-3 font-display text-sm font-semibold text-on-surface">
                {q.title}
              </span>
              <span className="mt-1 text-xs leading-relaxed text-on-surface-variant">
                {q.description}
              </span>
              <span className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-glow opacity-0 transition group-hover:opacity-100">
                Abrir
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-on-surface">
            Próximas tarefas
          </h2>
          <Link
            to="/app/notes"
            className="text-sm font-medium text-brand-glow transition hover:underline"
          >
            Ver todas →
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-8 text-center">
            <p className="text-sm text-on-surface-variant">
              Nenhuma tarefa pendente com prazo. Bom trabalho! 🎉
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((n) => (
              <li
                key={n.id}
                className={
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 " +
                  (getDeadlineState(n) === "overdue"
                    ? "border-error/40 bg-error/5"
                    : "border-outline-variant/30 bg-surface-container-lowest")
                }
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-on-surface">
                    {n.title}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    {n.assignee ?? "Sem responsável"}
                    {n.dueDate
                      ? ` · ${describeDeadline(n) || "no prazo"}`
                      : ""}
                  </p>
                </div>
                <NoteStatusChip status={n.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="mt-8 max-w-sm">
        <ActivityFeed />
      </aside>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: number;
  description: string;
  accent: "brand" | "error" | "primary" | "tertiary";
}) {
  const accentClasses = {
    brand: "text-brand-glow",
    error: "text-red-400",
    primary: "text-sky-400",
    tertiary: "text-emerald-400",
  }[accent];

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
      <p className="text-sm font-medium text-on-surface-variant">{label}</p>
      <p className={"mt-1 font-display text-3xl font-semibold " + accentClasses}>
        {value}
      </p>
      <p className="mt-2 text-xs text-on-surface-variant/80">{description}</p>
    </div>
  );
}

/** Sprint 11: atalhos do dashboard para as janelas novas do workspace. */
const QUICK_LINKS = [
  {
    to: "/app/documents",
    title: "Minhas Anotações",
    description: "Documentos recentes, PRDs e checklists da equipe.",
    icon: "file-text" as const,
  },
  {
    to: "/app/team",
    title: "Equipe & Parceiros",
    description: "Times multidisciplinares, membros e convites.",
    icon: "users" as const,
  },
  {
    to: "/app/templates",
    title: "Templates",
    description: "Modelos de sprints, documentos e pesquisa.",
    icon: "layers" as const,
  },
  {
    to: "/app/trash",
    title: "Lixeira",
    description: "Itens excluídos: restaurar ou apagar definitivamente.",
    icon: "trash" as const,
  },
];

function QuickIcon({ name }: { name: (typeof QUICK_LINKS)[number]["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  if (name === "layers") {
    return (
      <svg {...common}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    );
  }
  if (name === "trash") {
    return (
      <svg {...common}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
