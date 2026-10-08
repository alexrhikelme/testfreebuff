import { useState } from "react";
import { useNotes } from "./store";
import { STATUS_LABEL, sortNotesForColumn } from "./NoteStatusChip";
import { NoteStatusChip } from "./NoteStatusChip";
import { getDeadlineState, describeDeadline, deadlineBadgeClasses } from "./deadline";
import {
  formatDayMonth,
  formatPeriodShort,
  noteCode,
  initialsOf,
  avatarClasses,
  tagClasses,
} from "./format";
import type { Note, NoteStatus } from "./types";

/**
 * Sprint 5 — Kanban por status com drag-and-drop nativo (HTML5).
 * Sem dependências externas: dragstart/dragover/drop em cada coluna.
 *
 * Sprint 12 — ordem e acabamento do mockup do board: colunas com ponto
 * colorido, contadores, alta por coluna e rodapé "Adicionar nota".
 */
const BOARD_ORDER: NoteStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
];

const COLUMN_DOT: Record<NoteStatus, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-sky-400",
  blocked: "bg-error",
  completed: "bg-tertiary",
};

const CODE_CLASSES: Record<NoteStatus, string> = {
  not_started: "text-on-surface-variant",
  in_progress: "text-brand-glow",
  blocked: "text-red-400",
  completed: "text-emerald-400",
};

export function NotesBoardView({
  notes,
  onEdit,
  onDelete,
  onAddNote,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  /** Abre o formulário já com o status da coluna (botões "+" / "Adicionar nota"). */
  onAddNote?: (status: NoteStatus) => void;
}) {
  const { moveNote, order } = useNotes();
  const [dragOverColumn, setDragOverColumn] = useState<NoteStatus | null>(null);

  const byStatus = new Map<NoteStatus, Note[]>();
  for (const s of BOARD_ORDER) byStatus.set(s, []);
  for (const n of notes) byStatus.get(n.status)?.push(n);

  const handleDrop = (status: NoteStatus) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/note-id");
    if (!id) return;
    // Calcula sobre qual card caiu para inserir antes dele.
    const column = byStatus.get(status) ?? [];
    const sorted = sortNotesForColumn(column, order);
    const afterId = getDropTargetId(e, sorted);
    moveNote(id, status, afterId ?? undefined);
  };

  return (
    <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_ORDER.map((status) => {
        const columnNotes = sortNotesForColumn(byStatus.get(status) ?? [], order);
        const isOver = dragOverColumn === status;
        return (
          <section
            key={status}
            aria-label={`Coluna ${STATUS_LABEL[status]}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(status);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverColumn((cur) => (cur === status ? null : cur));
              }
            }}
            onDrop={handleDrop(status)}
            className={
              "flex min-h-[280px] flex-col rounded-xl border p-3 transition " +
              (isOver
                ? "border-brand/60 bg-brand/5 ring-2 ring-brand/30"
                : "border-outline-variant/30 bg-surface/40")
            }
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${COLUMN_DOT[status]}`}
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-on-surface">
                {STATUS_LABEL[status]}
              </h3>
              <span className="ml-auto flex items-center gap-1.5">
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-xs font-medium text-on-surface-variant">
                  {columnNotes.length}
                </span>
                <button
                  type="button"
                  onClick={() => onAddNote?.(status)}
                  aria-label={`Adicionar nota em ${STATUS_LABEL[status]}`}
                  title={`Adicionar nota em ${STATUS_LABEL[status]}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-2">
              {columnNotes.length === 0 && (
                <p className="rounded-lg border border-dashed border-outline-variant/40 p-4 text-center text-xs text-on-surface-variant/60">
                  Arraste notas para cá
                </p>
              )}
              {columnNotes.map((note) => (
                <BoardCard
                  key={note.id}
                  note={note}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
              <button
                type="button"
                onClick={() => onAddNote?.(status)}
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 px-3 py-2 text-xs font-medium text-on-surface-variant transition hover:border-brand/50 hover:text-brand-glow"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Adicionar nota
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** Retorna o id da nota sobre a qual o cursor está (para inserir antes). */
function getDropTargetId(e: React.DragEvent, columnNotes: Note[]): string | null {
  const cards = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("[data-note-id]")
  );
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    if (
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right
    ) {
      const id = card.dataset.noteId;
      if (id && columnNotes.some((n) => n.id === id)) return id;
    }
  }
  return null;
}

function BoardCard({
  note,
  onEdit,
  onDelete,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const state = getDeadlineState(note);
  const meta = deadlineBadgeClasses(state);
  const label =
    state === "overdue" && note.dueDate
      ? `Atrasado (${formatDayMonth(note.dueDate)})`
      : describeDeadline(note);
  const isOverdue = state === "overdue";
  const isBlocked = note.status === "blocked";

  return (
    <article
      data-note-id={note.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/note-id", note.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={
        "group cursor-grab rounded-lg border bg-surface-container-lowest p-3 shadow-sm transition active:cursor-grabbing " +
        (isOverdue || isBlocked
          ? "border-error/50 hover:shadow-md"
          : "border-outline-variant/30 hover:border-outline-variant/60 hover:shadow-md")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[11px] font-semibold tracking-wide ${CODE_CLASSES[note.status]}`}
        >
          {noteCode(note.id)}
        </span>
        <NoteStatusChip status={note.status} />
      </div>

      <h4 className="mt-1.5 text-sm font-semibold leading-snug text-on-surface">
        {note.title}
      </h4>

      {note.content &&
        (isBlocked ? (
          <div className="mt-1.5 rounded border border-error/40 bg-error/10 p-2 text-xs leading-relaxed text-red-300">
            <span className="font-semibold text-red-200">Bloqueio:</span>{" "}
            {note.content}
          </div>
        ) : (
          <p className="mt-1.5 line-clamp-2 text-xs text-on-surface-variant">
            {note.content}
          </p>
        ))}

      {meta && label && (
        <span
          className={`mt-2 inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-medium ${meta.className}`}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {label}
        </span>
      )}

      {note.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${tagClasses(tag)}`}
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-[11px] text-on-surface-variant/70">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1.5 truncate">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {formatPeriodShort(note.startDate, note.dueDate)}
        </span>
        {note.assignee && (
          <span
            title={note.assignee}
            aria-label={`Responsável: ${note.assignee}`}
            className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold ${avatarClasses(note.assignee)}`}
          >
            {initialsOf(note.assignee)}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-on-surface-variant">
        <span className="truncate opacity-80">
          {note.assignee ?? "Sem responsável"}
        </span>
        <span className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(note)}
            className="rounded px-1.5 py-0.5 transition hover:bg-surface-container hover:text-on-surface"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => onDelete(note.id)}
            className="rounded px-1.5 py-0.5 transition hover:bg-error/10 hover:text-error"
          >
            Excluir
          </button>
        </span>
      </div>
    </article>
  );
}
