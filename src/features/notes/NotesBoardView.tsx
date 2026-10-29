import { useState } from "react";
import { useNotes } from "./store";
import { sortNotesForColumn } from "./NoteStatusChip";
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
import { NoteContent } from "./RichText";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";

/**
 * Sprint 5 — Kanban por status com drag-and-drop nativo (HTML5).
 * Sem dependências externas: dragstart/dragover/drop em cada coluna.
 *
 * Sprint 12 — ordem e acabamento do mockup do board: colunas com ponto
 * colorido, contadores, alta por coluna e rodapé "Adicionar nota".
 *
 * Montagem de sprints — o quadro não é mais limitado a 4 colunas: além das
 * 4 base (os status da nota) o usuário cria, renomeia e exclui sprints
 * quantos quiser. Cada sprint é uma coluna; a nota guarda o vínculo no
 * store (sprintOf) e, ao sair do sprint, volta para a coluna do seu status.
 */
const BOARD_ORDER: NoteStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "completed",
];

const COLUMN_DOT: Record<NoteStatus, string> = {
  not_started: "bg-slate-400",
  in_progress: "bg-brand-glow",
  blocked: "bg-error",
  completed: "bg-tertiary",
};

const CODE_CLASSES: Record<NoteStatus, string> = {
  not_started: "text-on-surface-variant",
  in_progress: "text-brand-glow",
  blocked: "text-red-400",
  completed: "text-emerald-400",
};

/**
 * Pente fino (item 8) — títulos das colunas base do Kanban renomeáveis.
 * Padrão "Sprint 1…4" no lugar de "Não iniciada, em andamento…";
 * clique no título edita e fica salvo (localStorage).
 */
const COLUMN_DEFAULT_TITLES: Record<NoteStatus, string> = {
  not_started: "Sprint 1",
  in_progress: "Sprint 2",
  blocked: "Sprint 3",
  completed: "Sprint 4",
};

/** Coluna criada pelo usuário: mesmo tratamento visual das base. */
const SPRINT_DOT = "bg-secondary";
const SPRINT_BADGE = "bg-secondary/15 text-sky-300";

const TITLES_STORAGE_KEY = "kanban-column-titles";

function loadColumnTitles(): Partial<Record<NoteStatus, string>> {
  try {
    const raw = window.localStorage.getItem(TITLES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<NoteStatus, string>>) : {};
  } catch {
    return {};
  }
}

/** Coluna do quadro: base (status) ou sprint criado pelo usuário. */
type BoardColumn = {
  /** Chave da coluna: nome do status ou id do sprint. */
  key: string;
  title: string;
  isBase: boolean;
  status?: NoteStatus;
  sprintId?: string;
  dotClass: string;
  badgeClass: string;
};

/** A chave identifica uma das 4 colunas base (os status)? */
function isBaseColumnKey(key: string): key is NoteStatus {
  return key in COLUMN_DEFAULT_TITLES;
}

export function NotesBoardView({
  notes,
  onEdit,
  onDelete,
  onAddNote,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  /**
   * Abre o formulário já com o destino da nota: o status da coluna base ou
   * o sprint em que o "+" foi clicado.
   */
  onAddNote?: (target: { status?: NoteStatus; sprintId?: string }) => void;
}) {
  const { moveNote, order, sprints, sprintOf, addSprint, renameSprint, removeSprint } =
    useNotes();
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  /** Títulos customizados das colunas base (Sprint 1…4 por padrão). */
  const [customTitles, setCustomTitles] = useState<
    Partial<Record<NoteStatus, string>>
  >(loadColumnTitles);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  /** Sprint aguardando confirmação de exclusão (as notas são preservadas). */
  const [pendingDelete, setPendingDelete] = useState<BoardColumn | null>(null);

  const baseColumns: BoardColumn[] = BOARD_ORDER.map((status) => ({
    key: status,
    status,
    isBase: true,
    title: customTitles[status] || COLUMN_DEFAULT_TITLES[status],
    dotClass: COLUMN_DOT[status],
    badgeClass:
      status === "in_progress"
        ? "bg-brand/20 text-brand-glow"
        : status === "blocked"
          ? "bg-error/20 text-red-300"
          : status === "completed"
            ? "bg-tertiary/20 text-emerald-300"
            : "bg-surface-container-high text-on-surface-variant",
  }));

  const sprintColumns: BoardColumn[] = sprints.map((s) => ({
    key: s.id,
    sprintId: s.id,
    isBase: false,
    title: s.title,
    dotClass: SPRINT_DOT,
    badgeClass: SPRINT_BADGE,
  }));

  const columns = [...baseColumns, ...sprintColumns];

  const startRename = (col: BoardColumn) => {
    setTitleDraft(col.title);
    setEditingTitle(col.key);
  };

  const commitRename = () => {
    const key = editingTitle;
    setEditingTitle(null);
    if (!key) return;
    const value = titleDraft.trim();
    if (!value) return;
    if (isBaseColumnKey(key)) {
      setCustomTitles((prev) => {
        const next = { ...prev, [key]: value };
        try {
          window.localStorage.setItem(TITLES_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // storage indisponível: mantém só o estado em memória
        }
        return next;
      });
      return;
    }
    renameSprint(key, value);
  };

  /** Cria um sprint e abre o campo de título já preenchido para renomear. */
  const handleAddSprint = () => {
    const column = addSprint();
    setTitleDraft(column.title);
    setEditingTitle(column.id);
  };

  /** Distribui cada nota na sua coluna: sprint válido ou coluna de status. */
  const sprintKeys = new Set(sprints.map((s) => s.id));
  const byColumn = new Map<string, Note[]>();
  for (const col of columns) byColumn.set(col.key, []);
  for (const n of notes) {
    const sprintId = sprintOf[n.id];
    const key = sprintId && sprintKeys.has(sprintId) ? sprintId : n.status;
    byColumn.get(key)?.push(n);
  }

  const handleDrop = (col: BoardColumn) => (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/note-id");
    if (!id) return;
    // Calcula sobre qual card caiu para inserir antes dele.
    const column = byColumn.get(col.key) ?? [];
    const sorted = sortNotesForColumn(column, order);
    const afterId = getDropTargetId(e, sorted);
    // Coluna de sprint mantém o status da nota; coluna base troca o status
    // e desvincula o sprint (null → volta para as colunas de status).
    const note = notes.find((n) => n.id === id);
    const status = col.status ?? note?.status ?? "not_started";
    moveNote(id, status, afterId ?? undefined, col.isBase ? null : col.sprintId);
  };

  return (
    <div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => {
          const columnNotes = sortNotesForColumn(byColumn.get(col.key) ?? [], order);
          const isOver = dragOverColumn === col.key;
          return (
            <section
              key={col.key}
              aria-label={`Coluna ${col.title}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverColumn(col.key);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn((cur) => (cur === col.key ? null : cur));
                }
              }}
              onDrop={handleDrop(col)}
              className={
                "flex min-h-[280px] min-w-[280px] flex-1 flex-col rounded-lg border p-3 shadow-sm transition " +
                (isOver
                  ? "border-brand/60 bg-brand/5 ring-2 ring-brand/30"
                  : "border-outline-variant/30 bg-surface-container-low")
              }
            >
              <header className="mb-3 flex items-center gap-2 px-1">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${col.dotClass}`}
                  aria-hidden="true"
                />
                <h3 className="min-w-0 text-sm font-semibold text-on-surface">
                {editingTitle === col.key ? (
                  <input
                    autoFocus
                    value={titleDraft}
                    aria-label={`Renomear coluna ${col.title}`}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingTitle(null);
                    }}
                    className="w-36 rounded border border-brand/60 bg-surface-container-lowest px-1.5 py-0.5 text-sm font-semibold text-on-surface focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                ) : (
                  <button
                    type="button"
                    title="Clique para editar o título da coluna"
                    onClick={() => startRename(col)}
                    className="group/hdr flex max-w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm font-semibold text-on-surface transition hover:bg-surface-container focus-ring-brand"
                  >
                    <span className="truncate">{col.title}</span>
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="shrink-0 text-on-surface-variant/50 opacity-0 transition group-hover/hdr:opacity-100"
                    >
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                )}
              </h3>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                <span
                  className={
                    "rounded-sm px-2 py-0.5 text-xs font-semibold " +
                    col.badgeClass
                  }
                >
                  {columnNotes.length}
                </span>
                {!col.isBase && (
                  <button
                    type="button"
                    onClick={() => setPendingDelete(col)}
                    aria-label={`Excluir sprint ${col.title}`}
                    title={`Excluir sprint ${col.title}`}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onAddNote?.(
                      col.isBase ? { status: col.status } : { sprintId: col.sprintId }
                    )
                  }
                  aria-label={`Adicionar nota em ${col.title}`}
                  title={`Adicionar nota em ${col.title}`}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-md text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                onClick={() =>
                  onAddNote?.(
                    col.isBase ? { status: col.status } : { sprintId: col.sprintId }
                  )
                }
                className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-outline-variant/50 px-3 py-2 text-xs font-medium text-on-surface-variant transition hover:border-brand/50 hover:text-brand-glow"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Adicionar nota
              </button>
            </div>
          </section>
        );
      })}

        {/* Montagem de sprints: cria uma nova coluna no quadro. */}
        <button
          type="button"
          onClick={handleAddSprint}
          className="flex w-[220px] shrink-0 flex-col items-center justify-center gap-2 self-stretch rounded-lg border border-dashed border-outline-variant/50 bg-surface-container-low/50 p-4 text-sm font-medium text-on-surface-variant transition hover:border-brand/60 hover:bg-brand/5 hover:text-brand-glow"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova sprint
        </button>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Excluir sprint?"
          description={`“${pendingDelete.title}” sai do quadro. As anotações voltam para as colunas de status — nenhuma é apagada.`}
          onConfirm={() => {
            removeSprint(pendingDelete.key);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
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
  /** Edição inline da descrição desativa o drag do card. */
  const [contentEditing, setContentEditing] = useState(false);
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
      draggable={!contentEditing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/note-id", note.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={
        "group cursor-grab rounded-md border bg-surface-container-lowest p-3 shadow-brand/5 transition hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing " +
        (isOverdue || isBlocked
          ? "border-error/50 hover:border-error/70"
          : "border-outline-variant/30 hover:border-outline-variant/60")
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

      <NoteContent note={note} onEditingChange={setContentEditing} />

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
