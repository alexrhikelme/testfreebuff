import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLab, canEditDashboard } from "./store";
import { DashboardFormModal } from "./DashboardsPageView";
import { useNotes } from "@/features/notes";
import type { Dashboard } from "./store";

/**
 * Projetos ativos — página dedicada com TODOS os projetos do workspace.
 * O nome de cada projeto aparece dentro de um retângulo clicável (alvo de
 * toque/clique explícito) que abre o projeto; ao lado ficam contagens e
 * atalhos para as seções principais.
 */
const QUICK_SECTIONS = [
  ["notes", "Quadro"],
  ["documents", "Anotações"],
  ["team", "Equipe"],
  ["templates", "Templates"],
] as const;

export function ActiveProjectsPageView() {
  const { dashboards, members, currentRole } = useLab();
  const { notes } = useNotes();
  const [creating, setCreating] = useState(false);

  const editable = canEditDashboard(currentRole);

  const stats = useMemo(() => {
    const map = new Map<string, { total: number; open: number; members: number }>();
    for (const d of dashboards) {
      const dNotes = notes.filter((n) => n.dashboardId === d.id);
      map.set(d.id, {
        total: dNotes.length,
        open: dNotes.filter((n) => n.status !== "completed").length,
        members: members.filter((m) => m.dashboardId === d.id).length,
      });
    }
    return map;
  }, [dashboards, notes, members]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Projetos ativos
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Todos os projetos do workspace. Clique no nome de um projeto para
            abrir o espaço de trabalho dele.
          </p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo projeto
          </button>
        )}
      </div>

      {dashboards.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Nenhum projeto ainda. Crie o primeiro para organizar sprints,
            anotações e equipe.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((d) => (
            <ProjectTile
              key={d.id}
              project={d}
              stats={stats.get(d.id) ?? { total: 0, open: 0, members: 0 }}
            />
          ))}
        </ul>
      )}

      {creating && (
        <DashboardFormModal
          title="Novo projeto"
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}

function ProjectTile({
  project,
  stats,
}: {
  project: Dashboard;
  stats: { total: number; open: number; members: number };
}) {
  const base = `/app/p/${project.id}`;
  return (
    <li className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5">
      {/* O nome é um retângulo: o item claramente pede clique. */}
      <Link
        to={base}
        aria-label={`Abrir projeto ${project.name}`}
        className="group/proj flex items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand/10 px-3.5 py-3 text-sm font-semibold text-on-surface ring-1 ring-brand/20 transition hover:border-brand hover:bg-brand hover:text-on-brand hover:shadow-md focus-ring-brand"
      >
        <span className="min-w-0 truncate">{project.name}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 transition group-hover/proj:translate-x-0.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </Link>

      {project.description && (
        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-on-surface-variant">
          {project.description}
        </p>
      )}

      <p className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant/80">
        <span className="rounded bg-surface-container px-2 py-0.5">
          {stats.total} nota{stats.total === 1 ? "" : "s"}
        </span>
        <span className="rounded bg-surface-container px-2 py-0.5">
          {stats.members} membro{stats.members === 1 ? "" : "s"}
        </span>
        {stats.open > 0 && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 font-semibold text-brand-glow">
            {stats.open} em aberto{stats.open === 1 ? "" : "s"}
          </span>
        )}
      </p>

      <div className="mt-auto flex flex-wrap gap-1.5 border-t border-outline-variant/30 pt-3">
        {QUICK_SECTIONS.map(([seg, label]) => (
          <Link
            key={seg}
            to={`${base}/${seg}`}
            aria-label={`${label} — ${project.name}`}
            className="rounded-md bg-surface-container px-2 py-1 text-[11px] font-medium text-on-surface-variant ring-1 ring-outline-variant/50 transition hover:bg-brand hover:text-on-brand hover:ring-brand/60"
          >
            {label}
          </Link>
        ))}
      </div>
    </li>
  );
}
