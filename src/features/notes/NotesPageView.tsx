import { useMemo, useState } from "react";
import { useNotes } from "./store";
import { NoteStatusChip, STATUS_LABEL } from "./NoteStatusChip";
import {
  describeDeadline,
  deadlineBadgeClasses,
  getDeadlineState,
  validatePeriod,
} from "./deadline";
import type { Note, NoteStatus } from "./types";

export const STATUS_ORDER: NoteStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

function parseTags(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
      new Date(iso)
    );
  } catch {
    return iso;
  }
}

export function NotesPageView() {
  const { notes, createNote, updateNote, deleteNote } = useNotes();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<NoteStatus | "all">("all");
  const [editing, setEditing] = useState<Note | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes.filter((n) => {
      const matchesQuery =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === "all" || n.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [notes, query, statusFilter]);

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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Anotações
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Crie, edite e organize as anotações do laboratório.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova anotação
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Buscar por título, conteúdo ou tag..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as NoteStatus | "all")
          }
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
        >
          <option value="all">Todos os status</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          {STATUS_ORDER.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/40 bg-surface-container px-2.5 py-1 text-on-surface-variant"
            >
              <span className="font-medium">{STATUS_LABEL[s]}:</span>
              {counts[s]}
            </span>
          ))}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-error/40 bg-error/15 px-2.5 py-1 font-medium text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-error" />
              {overdueCount} atrasada{overdueCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Nenhuma anotação encontrada{query ? ` para "${query}"` : ""}.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => {
                setEditing(note);
                setFormOpen(true);
              }}
              onDelete={() => deleteNote(note.id)}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <NoteFormModal note={editing} onClose={() => setFormOpen(false)} />
      )}
    </div>
  );
}

function NoteCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold text-on-surface">
          {note.title}
        </h3>
        <NoteStatusChip status={note.status} />
      </div>

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
              className="rounded bg-brand/15 px-2 py-0.5 text-xs font-medium text-brand-glow"
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
          {formatPeriod(note)}
        </span>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-error/10 hover:text-error"
        >
          Excluir
        </button>
      </div>
    </article>
  );
}

/** Visual deadline indicator: overdue / today / urgent badges. */
function DeadlineBadges({ note }: { note: Note }) {
  const state = getDeadlineState(note);
  const meta = deadlineBadgeClasses(state);
  const label = describeDeadline(note);
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

/** Formats the period row: "início → prazo" or just one of them. */
function formatPeriod(note: Note): string {
  const start = note.startDate ? formatDate(note.startDate) : null;
  const due = note.dueDate ? formatDate(note.dueDate) : null;
  if (start && due) return `${start} → ${due}`;
  if (due) return due;
  if (start) return `Início: ${start}`;
  return "Sem prazo";
}

function NoteFormModal({
  note,
  onClose,
}: {
  note: Note | null;
  onClose: () => void;
}) {
  const { createNote, updateNote } = useNotes();
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [status, setStatus] = useState<NoteStatus>(
    note?.status ?? "not_started"
  );
  const [tagsInput, setTagsInput] = useState(note?.tags.join(", ") ?? "");
  const [assignee, setAssignee] = useState(note?.assignee ?? "");
  const [startDate, setStartDate] = useState(note?.startDate ?? "");
  const [dueDate, setDueDate] = useState(note?.dueDate ?? "");
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
    };
    if (note) {
      updateNote(note.id, payload);
    } else {
      createNote(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl">
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
