import { useEffect, useMemo, useState } from "react";
import { useNotes } from "./store";
import { useToast } from "@/shared/components/Toast";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { formatRelativeTime, isRecentlyUpdated } from "./relativeTime";
import { ActivityFeed } from "./ActivityFeed";
import {
  STATUS_ORDER,
  STATUS_LABEL,
  StatusSelect,
  type NoteViewMode,
} from "./NoteStatusChip";
import { NotesBoardView } from "./NotesBoardView";
import { NotesListView } from "./NotesListView";
import { formatDayMonth, formatPeriodShort, noteCode } from "./format";
import {
  describeDeadline,
  deadlineBadgeClasses,
  getDeadlineState,
  validatePeriod,
} from "./deadline";
import { useLab } from "@/features/dashboards/store";
import type { Note, NoteStatus } from "./types";

type DeadlineFilter = "all" | "overdue" | "today" | "soon";
type SortBy = "recent" | "due";

/** Ordem das abas como no mockup do board: Kanban primeiro. */
const VIEW_ORDER: NoteViewMode[] = ["kanban", "grid", "list"];

const VIEW_LABEL: Record<NoteViewMode, string> = {
  kanban: "Quadro Kanban",
  grid: "Grade de Cards",
  list: "Lista / Tabela",
};

const DEADLINE_FILTER_LABEL: Record<Exclude<DeadlineFilter, "all">, string> = {
  overdue: "Atrasadas",
  today: "Vencem hoje",
  soon: "Próximos 3 dias",
};

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Ícone de 14px de cada visualização da toolbar. */
function ViewIcon({ mode }: { mode: NoteViewMode }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (mode === "kanban") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="9.5" y="4" width="5" height="11" rx="1" />
        <rect x="16" y="4" width="5" height="7" rx="1" />
      </svg>
    );
  }
  if (mode === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="10" x2="9" y2="20" />
    </svg>
  );
}

export function NotesPageView() {
  const { notes, createNote, updateNote, deleteNote, isLoading } = useNotes();
  const toast = useToast();
  const [query, setQuery] = useState("");
  /** Tick para recomputar "há X min" e o pulso de alteração recente. */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 5_000);
    return () => window.clearInterval(timer);
  }, []);
  const [statusFilter, setStatusFilter] = useState<NoteStatus | "all">("all");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [viewMode, setViewMode] = useState<NoteViewMode>("kanban");
  const [editing, setEditing] = useState<Note | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  /** Status inicial quando o "+" de uma coluna abre o formulário. */
  const [defaultStatus, setDefaultStatus] = useState<NoteStatus | undefined>();
  /** Sprint 10 (H3): nota aguardando confirmação de exclusão. */
  const [pendingDelete, setPendingDelete] = useState<Note | null>(null);

  const hasActiveFilters =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    deadlineFilter !== "all" ||
    memberFilter !== "all" ||
    tagFilter !== "all";

  const members = useMemo(
    () =>
      Array.from(
        new Set(notes.map((n) => n.assignee).filter((a): a is string => !!a))
      ).sort((a, b) => a.localeCompare(b)),
    [notes]
  );

  const uniqueTags = useMemo(
    () => Array.from(new Set(notes.flatMap((n) => n.tags))).sort(),
    [notes]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = notes.filter((n) => {
      const matchesQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "all" || n.status === statusFilter;
      const state = getDeadlineState(n);
      const matchesDeadline =
        deadlineFilter === "all" || state === deadlineFilter;
      const matchesMember =
        memberFilter === "all" || n.assignee === memberFilter;
      const matchesTag = tagFilter === "all" || n.tags.includes(tagFilter);
      return (
        matchesQuery &&
        matchesStatus &&
        matchesDeadline &&
        matchesMember &&
        matchesTag
      );
    });
    return result.sort((a, b) => {
      if (sortBy === "due") {
        // Sem prazo vai para o fim; entre as com prazo, o mais urgente primeiro.
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [notes, query, statusFilter, deadlineFilter, memberFilter, tagFilter, sortBy]);

  const overdueCount = useMemo(
    () => notes.filter((n) => getDeadlineState(n) === "overdue").length,
    [notes]
  );

  const counts = useMemo(() => {
    const byStatus: Record<NoteStatus, number> = {
      not_started: 0,
      in_progress: 0,
      completed: 0,
      blocked: 0,
    };
    for (const n of notes) byStatus[n.status] += 1;
    return byStatus;
  }, [notes]);

  /** Prazo do board: menor vencimento entre as notas que ainda não concluíram. */
  const boardDue = useMemo(() => {
    const dues = notes
      .filter((n) => n.status !== "completed" && n.dueDate)
      .map((n) => n.dueDate!)
      .sort();
    return dues[0] ? formatDayMonth(dues[0]) : "—";
  }, [notes]);

  const boardBadge =
    notes.length > 0 && counts.completed === notes.length
      ? "Concluído"
      : counts.in_progress > 0
        ? "Em Execução"
        : "Planejamento";

  const openNewNote = (status?: NoteStatus) => {
    setEditing(null);
    setDefaultStatus(status);
    setFormOpen(true);
  };

  const openEditNote = (note: Note) => {
    setEditing(note);
    setDefaultStatus(undefined);
    setFormOpen(true);
  };

  const requestDelete = (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (target) setPendingDelete(target);
  };

  // Sprint 10 (H1): feedback de carregamento quando os dados vêm do banco.
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-on-surface-variant">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        Carregando anotações…
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/15 text-brand-glow"
          >
            <ViewIcon mode="kanban" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant/70">
              Quadro de notas
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
                Anotações
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary/40 bg-tertiary/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                {boardBadge}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Prazo: {boardDue}
              </span>
            </div>
            <p className="mt-1 text-sm text-on-surface-variant">
              Crie, edite e acompanhe as anotações ativas da equipe em quadro,
              grade ou lista.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/40 bg-surface-container-lowest px-3.5 py-2 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-brand-glow">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {counts.not_started + counts.in_progress} ativas
            </span>
            <span className="h-3 w-px bg-outline-variant/50" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
              {counts.completed} concluídas
            </span>
            <span className="h-3 w-px bg-outline-variant/50" aria-hidden="true" />
            <span className="inline-flex items-center gap-1.5 text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-error" />
              {counts.blocked} bloqueadas
            </span>
          </div>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error/15 px-2.5 py-1 text-xs font-medium text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-error" />
              {overdueCount} atrasada{overdueCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="tablist"
            aria-label="Visualização"
            className="flex flex-wrap gap-1 rounded-lg bg-surface-container/70 p-1"
          >
            {VIEW_ORDER.map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={viewMode === mode}
                onClick={() => setViewMode(mode)}
                className={
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition " +
                  (viewMode === mode
                    ? "bg-brand text-on-brand shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface")
                }
              >
                <ViewIcon mode={mode} />
                {VIEW_LABEL[mode]}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <input
              type="search"
              placeholder="Buscar cartões ou notas"
              aria-label="Buscar cartões ou notas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-56"
            />

            <label className="relative inline-flex items-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 text-on-surface-variant"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <select
                aria-label="Filtrar por membro"
                title="Filtrar por membro"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                className="appearance-none rounded-lg border border-outline-variant bg-surface-container py-2 pl-8 pr-7 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                <option value="all">Membros</option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative inline-flex items-center">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 text-on-surface-variant"
              >
                <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <select
                aria-label="Filtrar por tag"
                title="Filtrar por tag"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="appearance-none rounded-lg border border-outline-variant bg-surface-container py-2 pl-8 pr-7 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                <option value="all">Tags ({uniqueTags.length})</option>
                {uniqueTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => openNewNote()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nova Anotação
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-outline-variant/25 pt-3">
          <select
            value={statusFilter}
            title="Filtrar por status"
            aria-label="Filtrar por status"
            onChange={(e) =>
              setStatusFilter(e.target.value as NoteStatus | "all")
            }
            className="rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
          >
            <option value="all">Todos os status</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border border-outline-variant bg-surface-container px-3 py-1.5 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
            title="Ordenação"
            aria-label="Ordenar anotações"
          >
            <option value="recent">Editadas recentemente</option>
            <option value="due">Prazo mais próximo</option>
          </select>

          <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/70">
            Prazos:
          </span>
          <DeadlineFilterChip
            label="Todos"
            active={deadlineFilter === "all"}
            onClick={() => setDeadlineFilter("all")}
          />
          {(Object.keys(DEADLINE_FILTER_LABEL) as Array<Exclude<DeadlineFilter, "all">>).map(
            (key) => (
              <DeadlineFilterChip
                key={key}
                label={DEADLINE_FILTER_LABEL[key]}
                active={deadlineFilter === key}
                onClick={() => setDeadlineFilter(deadlineFilter === key ? "all" : key)}
                tone={key}
              />
            )
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setDeadlineFilter("all");
                setMemberFilter("all");
                setTagFilter("all");
              }}
              className="ml-1 text-xs text-on-surface-variant underline-offset-2 transition hover:text-on-surface hover:underline"
            >
              limpar filtros
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            {hasActiveFilters
              ? "Nenhuma anotação corresponde aos filtros atuais."
              : "Nenhuma anotação encontrada. Crie a primeira!"}
          </p>
        </div>
      ) : viewMode === "kanban" ? (
        <NotesBoardView
          notes={filtered}
          onEdit={openEditNote}
          onDelete={requestDelete}
          onAddNote={openNewNote}
        />
      ) : viewMode === "list" ? (
        <NotesListView
          notes={filtered}
          onEdit={openEditNote}
          onDelete={requestDelete}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              now={now}
              onEdit={() => openEditNote(note)}
              onDelete={() => setPendingDelete(note)}
              onStatusChange={(status) => updateNote(note.id, { status })}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <NoteFormModal
          note={editing}
          defaultStatus={defaultStatus}
          onClose={() => setFormOpen(false)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Excluir anotação?"
          description={`“${pendingDelete.title}” será excluída. Esta ação pode ser desfeita por alguns segundos após a confirmação.`}
          onConfirm={() => {
            const target = pendingDelete;
            deleteNote(target.id);
            setPendingDelete(null);
            // Sprint 10 (H3): desfazer recria a nota com os mesmos dados.
            toast.showToast("success", "Anotação excluída.", {
              label: "Desfazer",
              onClick: () => {
                createNote({
                  title: target.title,
                  content: target.content,
                  status: target.status,
                  tags: target.tags,
                  assignee: target.assignee,
                  startDate: target.startDate,
                  dueDate: target.dueDate,
                  dashboardId: target.dashboardId,
                });
              },
            });
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <aside className="mt-8 max-w-sm">
        <ActivityFeed />
      </aside>
    </div>
  );
}

function DeadlineFilterChip({
  label,
  active,
  onClick,
  tone,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  tone?: Exclude<DeadlineFilter, "all">;
}) {
  const toneClasses =
    tone === "overdue"
      ? "border-error/50 text-red-400"
      : tone === "today"
        ? "border-brand/50 text-brand-glow"
        : "border-warning/50 text-amber-400";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition " +
        (active
          ? toneClasses + " bg-surface-container-high"
          : "border-outline-variant/40 text-on-surface-variant hover:border-outline-variant hover:text-on-surface")
      }
    >
      {label}
    </button>
  );
}

function NoteCard({
  note,
  now,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  note: Note;
  now: Date;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: NoteStatus) => void;
}) {
  const deadlineState = getDeadlineState(note);
  const isOverdue = deadlineState === "overdue";
  const recentlyTouched = isRecentlyUpdated(note.updatedAt);
  return (
    <article
      className={
        "flex flex-col rounded-xl border bg-surface-container-lowest p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
        (isOverdue
          ? "border-error/50"
          : "border-outline-variant/30 hover:border-outline-variant/60 ") +
        (recentlyTouched ? "ring-2 ring-brand/50 animate-pulse-once" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold tracking-wide text-on-surface-variant">
          {noteCode(note.id)}
        </span>
        <StatusSelect status={note.status} onChange={onStatusChange} />
      </div>

      <h3 className="mt-1 font-display text-base font-semibold text-on-surface">
        {note.title}
      </h3>

      {note.content && (
        <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
          {note.content}
        </p>
      )}

      <DeadlineBadges note={note} />

      {note.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="rounded border border-brand/40 bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-glow"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-outline-variant/30 pt-3 text-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          {note.assignee ?? "Sem responsável"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatPeriodShort(note.startDate, note.dueDate)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-on-surface-variant/70">
          {note.updatedBy
            ? `Editada por ${note.updatedBy} · ${formatRelativeTime(note.updatedAt, now)}`
            : `Atualizada ${formatRelativeTime(note.updatedAt, now)}`}
        </span>
        <span className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded px-1.5 py-0.5 text-xs font-medium text-on-surface-variant transition hover:bg-error/10 hover:text-error"
          >
            Excluir
          </button>
        </span>
      </div>
    </article>
  );
}

/** Visual deadline indicator: overdue / today / urgent badges. */
function DeadlineBadges({ note }: { note: Note }) {
  const state = getDeadlineState(note);
  const meta = deadlineBadgeClasses(state);
  const label =
    state === "overdue" && note.dueDate
      ? `Atrasado (${formatDayMonth(note.dueDate)})`
      : describeDeadline(note);
  if (!meta || !label) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium ${meta.className}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClassName}`} />
        {label}
      </span>
    </div>
  );
}

function NoteFormModal({
  note,
  defaultStatus,
  onClose,
}: {
  note: Note | null;
  defaultStatus?: NoteStatus;
  onClose: () => void;
}) {
  const { createNote, updateNote } = useNotes();
  const { dashboards } = useLab();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [status, setStatus] = useState<NoteStatus>(
    note?.status ?? defaultStatus ?? "not_started"
  );
  const [tagsInput, setTagsInput] = useState(note?.tags.join(", ") ?? "");
  const [assignee, setAssignee] = useState(note?.assignee ?? "");
  const [startDate, setStartDate] = useState(note?.startDate ?? "");
  const [dueDate, setDueDate] = useState(note?.dueDate ?? "");
  const [dashboardId, setDashboardId] = useState(note?.dashboardId ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setError(validatePeriod(value || undefined, dueDate || undefined));
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    setError(validatePeriod(startDate || undefined, value || undefined));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("O título é obrigatório.");
      return;
    }
    const periodError = validatePeriod(
      startDate || undefined,
      dueDate || undefined
    );
    if (periodError) {
      setError(periodError);
      return;
    }
    const payload = {
      title: title.trim(),
      content,
      status,
      tags: parseTags(tagsInput),
      assignee: assignee.trim() || undefined,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      dashboardId: dashboardId || undefined,
    };
    if (note) {
      updateNote(note.id, payload);
    } else {
      createNote(payload);
    }
    onClose();
  };

  // Sprint 6: fecha com ESC e devolve o foco ao abrir (acessibilidade básica).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={note ? "Editar anotação" : "Nova anotação"}
        className="w-full max-w-lg rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-on-surface">
            {note ? "Editar anotação" : "Nova anotação"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
            title="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface">
              Título
            </label>
            <input
              type="text"
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Calibrar pipetas"
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface">
              Conteúdo
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Detalhes da tarefa..."
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-on-surface">
                Data de início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface [color-scheme:dark] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface">
                Prazo
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface [color-scheme:dark] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as NoteStatus)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface">
                Responsável
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Quem vai fazer?"
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface">
                Tags
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Separadas por vírgula"
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface">
              Dashboard
            </label>
            <select
              value={dashboardId}
              onChange={(e) => setDashboardId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
            >
              <option value="">Sem dashboard</option>
              {dashboards.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
