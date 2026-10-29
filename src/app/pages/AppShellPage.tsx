import {
  Link,
  NavLink,
  Outlet,
  matchPath,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../router/AppRouter";
import { ROLE_LABEL } from "@/features/dashboards/types";
import { useLab } from "@/features/dashboards/store";
import { useNotes } from "@/features/notes";
import { NotificationsBell } from "@/features/notes/NotificationsBell";
import { Logo } from "@/shared/components/Logo";

/**
 * Shell "Combogó Unicap" — sidebar 100% dirigida por PROJETOS:
 * cada projeto (dashboards do LabProvider) expande e revela as seções
 * principais (Visão geral, Quadro de Notas, Minhas Anotações,
 * Equipe & Parceiros, Templates, Lixeira), todas escopadas ao projeto em
 * /app/p/:projectId/*. O antigo grupo "Principal" separado não existe mais:
 * o que é do projeto fica dentro do projeto.
 */

type SectionDef = {
  /** Subrota sob /app/p/:projectId ("" = visão geral do projeto). */
  seg: string;
  label: string;
  icon: string;
};

const PROJECT_SECTIONS: SectionDef[] = [
  { seg: "", label: "Visão geral", icon: "layout-dashboard" },
  { seg: "notes", label: "Quadro de Notas", icon: "edit" },
  { seg: "documents", label: "Minhas Anotações", icon: "file-text" },
  { seg: "team", label: "Equipe & Parceiros", icon: "users" },
  { seg: "templates", label: "Templates", icon: "layers" },
  { seg: "trash", label: "Lixeira", icon: "trash" },
];

const PROJECT_ICONS = [
  { icon: "rocket", className: "text-sky-300" },
  { icon: "zap", className: "text-brand-glow" },
  { icon: "palette", className: "text-violet-300" },
] as const;

export default function AppShellPage() {
  const { user, signOut } = useAuth();
  const { dashboards } = useLab();
  const { notes } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  /** Projetos cujo acordeão o usuário abriu/fechou manualmente. */
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  const projects = dashboards.map((d, i) => ({
    id: d.id,
    label: d.name,
    icon: PROJECT_ICONS[i % PROJECT_ICONS.length],
    activeCount: notes.filter((n) => n.dashboardId === d.id && n.status !== "completed").length,
  }));

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  /** Projeto aberto na URL (/app/p/:projectId/...). */
  const activeProjectId =
    matchPath({ path: "/app/p/:projectId", end: false }, location.pathname)
      ?.params.projectId ?? null;
  /** Projeto expandido por padrão: o ativo, ou o primeiro da lista. */
  const defaultOpenId = activeProjectId ?? projects[0]?.id ?? null;
  const isOpen = (id: string) =>
    id in toggled ? toggled[id] : id === defaultOpenId;
  const toggleProject = (id: string) =>
    setToggled((prev) => ({
      ...prev,
      [id]: id in prev ? !prev[id] : id !== defaultOpenId,
    }));

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-outline-variant/40 bg-surface">
        {/* Switcher do workspace */}
        <div className="flex items-center gap-3 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-lg font-bold text-on-brand">
            C
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-on-surface">
              Combogó Unicap
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-tertiary" />
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              Gestão &amp; Projetos
            </p>
          </div>
          <button
            type="button"
            aria-label="Trocar workspace"
            className="flex flex-col items-center gap-0.5 rounded p-1 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 3 18 9" />
              <polyline points="6 15 12 21 18 15" />
            </svg>
          </button>
        </div>

        {/* Busca no workspace (⌘K) */}
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center gap-2 rounded-md border border-outline-variant/60 bg-surface-container px-3 py-2.5 text-sm text-on-surface-variant transition hover:border-outline hover:text-on-surface focus-ring-brand"
          >              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            <span className="flex-1 text-left">Buscar no workspace...</span>
            <kbd className="rounded border border-outline-variant/70 bg-surface-container-high px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {/* PROJETOS ATIVOS — cada projeto reúne as seções principais */}
          <div className="flex items-center justify-between px-2 pb-2">
            <Link
              to="/app/projects"
              title="Ver todos os projetos"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant/80 transition hover:text-brand-glow focus-ring-brand"
            >
              Projetos ativos
            </Link>
            <Link
              to="/app/projects"
              aria-label="Novo projeto"
              title="Novo projeto"
              className="rounded p-0.5 text-on-surface-variant transition hover:bg-surface-container hover:text-brand-glow"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Link>
          </div>
          <ul className="flex flex-col gap-1">
            {projects.map((p) => {
              const open = isOpen(p.id);
              const base = `/app/p/${p.id}`;
              const projectActive =
                location.pathname === base ||
                location.pathname.startsWith(base + "/");
              return (
                <li key={p.id}>
                  <div
                    className={
                      "flex items-center gap-1 rounded-md pr-2 transition " +
                      (projectActive
                        ? "bg-brand/10 ring-1 ring-brand/30"
                        : "hover:bg-surface-container")
                    }
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-label={`${open ? "Recolher" : "Expandir"} projeto ${p.label}`}
                      onClick={() => toggleProject(p.id)}
                      className="rounded p-2 text-on-surface-variant transition hover:text-on-surface focus-ring-brand"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={"transition-transform " + (open ? "rotate-90" : "")}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <Link
                      to={base}
                      className="flex min-w-0 flex-1 items-center gap-3 py-2 text-sm font-medium text-on-surface"
                    >
                      <Icon
                        name={p.icon.icon}
                        className={"h-4 w-4 shrink-0 " + p.icon.className}
                      />
                      <span className="truncate">{p.label}</span>
                    </Link>
                    <span
                      className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant"
                      title={`${p.activeCount} nota(s) em aberto no projeto`}
                    >
                      {p.activeCount}
                    </span>
                  </div>

                  {open && (
                    <ul className="ml-[22px] mt-0.5 flex flex-col gap-0.5 border-l border-outline-variant/40 pl-3">
                      {PROJECT_SECTIONS.map((s) => {
                        const to = s.seg ? `${base}/${s.seg}` : base;
                        const active =
                          s.seg === ""
                            ? location.pathname === base
                            : location.pathname === to;
                        return (
                          <li key={s.seg}>
                            <NavLink
                              to={to}
                              end={s.seg === ""}
                              className={
                                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition focus-ring-brand " +
                                (active
                                  ? "bg-brand font-semibold text-on-brand shadow-sm"
                                  : "font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface")
                              }
                            >
                              <Icon name={s.icon} className="h-4 w-4 shrink-0" />
                              <span className="truncate">{s.label}</span>
                            </NavLink>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé */}
        <div className="border-t border-outline-variant/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-on-surface-variant">v4.8.2</p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Configurações"
                title="Configurações"
                className="rounded p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Ajuda"
                title="Ajuda"
                className="rounded p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* TOPBAR + CONTEÚDO */}
      <div className="flex min-w-0 flex-1 flex-col pl-[300px]">
        <header className="sticky top-0 z-30 border-b border-outline-variant/40 bg-surface/85 backdrop-blur">
          <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <Logo size="sm" withText={false} to="/app" />
            </div>

            <div className="min-w-0 flex-1" />

            <div className="flex items-center gap-2">
              <NotificationsBell />

              <button
                type="button"
                onClick={handleSignOut}
                title={`Sair (${user?.name ?? ""}) — ${user?.role ? ROLE_LABEL[user.role] : ""}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand text-xs font-bold text-on-brand transition hover:bg-brand-strong"
                aria-label={`Sair da conta de ${user?.name ?? "usuário"}`}
              >
                {initialsOf(user?.name ?? "")}
              </button>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Busca global (⌘K) — placeholder acessível */}
      {searchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buscar no workspace"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[15vh] backdrop-blur-[2px]"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                autoFocus
                type="search"
                aria-label="Termo de busca"
                placeholder="Buscar projetos, notas, membros…"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearchOpen(false);
                }}
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/60"
              />
              <kbd className="rounded border border-outline-variant/70 bg-surface-container px-1.5 py-0.5 text-[10px] text-on-surface-variant">ESC</kbd>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CU";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Icon({ name, className }: { name: string; className?: string }) {
  const common = {
    className,
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "layout-dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    );
  }
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
      </svg>
    );
  }
  if (name === "rocket") {
    return (
      <svg {...common}>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.32 22.32 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
    );
  }
  if (name === "zap") {
    return (
      <svg {...common}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    );
  }
  if (name === "palette") {
    return (
      <svg {...common}>
        <circle cx="13.5" cy="6.5" r="1" />
        <circle cx="17.5" cy="10.5" r="1" />
        <circle cx="8.5" cy="7.5" r="1" />
        <circle cx="6.5" cy="12.5" r="1" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12a1.64 1.64 0 0 1 1.23-2.8h2c3.05 0 5.56-2.5 5.56-5.55C22 6.01 17.5 2 12 2z" />
      </svg>
    );
  }
  if (name === "file-text") {
    return (
      <svg {...common}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (name === "kanban") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
    );
  }
  if (name === "kanban2") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 7v9" />
        <path d="M12 7v5" />
        <path d="M16 7v7" />
      </svg>
    );
  }
  return null;
}
