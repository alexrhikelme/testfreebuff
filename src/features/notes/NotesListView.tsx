import { useNotes } from "./store";
import { StatusSelect } from "./NoteStatusChip";
import { getDeadlineState, describeDeadline } from "./deadline";
import { formatDate } from "./format";
import type { Note } from "./types";

/**
 * Sprint 5 — Visualização em lista/tabela compacta.
 */
export function NotesListView({
  notes,
  onEdit,
  onDelete,
}: {
  notes: Note[];
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
}) {
  const { updateNote } = useNotes();

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
        <p className="text-sm text-on-surface-variant">Nenhuma anotação para listar.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant/30">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-outline-variant/30 bg-surface/60 text-xs uppercase tracking-wide text-on-surface-variant">
          <tr>
            <th className="px-4 py-3 font-medium">Título</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Responsável</th>
            <th className="px-4 py-3 font-medium">Período</th>
            <th className="px-4 py-3 font-medium">Tags</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20 bg-surface-container-lowest">
          {notes.map((note) => {
            const state = getDeadlineState(note);
            const deadline = describeDeadline(note);
            const isOverdue = state === "overdue";
            return (
              <tr
                key={note.id}
                className={
                  "transition hover:bg-surface-container/60 " +
                  (isOverdue ? "bg-error/5" : "")
                }
              >
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate font-medium text-on-surface">{note.title}</p>
                  {note.content && (
                    <p className="truncate text-xs text-on-surface-variant">{note.content}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusSelect
                    status={note.status}
                    onChange={(s) => updateNote(note.id, { status: s })}
                  />
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {note.assignee ?? "—"}
                </td>
                <td className="px-4 py-3 text-on-surface-variant">
                  {note.dueDate ? formatDate(note.dueDate) : "—"}
                  {deadline && (
                    <span
                      className={
                        "ml-2 rounded px-1.5 py-0.5 text-[11px] font-medium " +
                        (isOverdue
                          ? "bg-error/15 text-red-400"
                          : state === "today"
                            ? "bg-brand/15 text-brand-glow"
                            : "bg-warning/15 text-amber-400")
                      }
                    >
                      {deadline}
                    </span>
                  )}
                </td>
                <td className="max-w-[140px] px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-brand/15 px-1.5 py-0.5 text-[11px] text-brand-glow"
                      >
                        {t}
                      </span>
                    ))}
                    {note.tags.length > 2 && (
                      <span className="text-[11px] text-on-surface-variant/70">
                        +{note.tags.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(note)}
                    className="rounded px-2 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(note.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                  >
                    Excluir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
