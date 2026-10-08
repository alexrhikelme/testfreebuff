import type { Note, NoteStatus } from "./types";

export const STATUS_ORDER: NoteStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

export const STATUS_LABEL: Record<NoteStatus, string> = {
  not_started: "Não iniciada",
  in_progress: "Em andamento",
  completed: "Concluída",
  blocked: "Bloqueada",
};

const STATUS_CLASSES: Record<NoteStatus, string> = {
  not_started: "bg-surface-container text-on-surface-variant border-outline-variant",
  in_progress: "bg-primary/15 text-sky-400 border-primary/40",
  completed: "bg-tertiary/15 text-emerald-400 border-tertiary/40",
  blocked: "bg-error/15 text-red-400 border-error/40",
};

export function NoteStatusChip({ status }: { status: NoteStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium border ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Chip que também funciona como select inline de status (2 cliques, sem modal). */
export function StatusSelect({
  status,
  onChange,
}: {
  status: NoteStatus;
  onChange: (status: NoteStatus) => void;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <NoteStatusChip status={status} />
      <select
        value={status}
        onChange={(e) => onChange(e.target.value as NoteStatus)}
        aria-label="Mudar status"
        title="Mudar status"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
    </span>
  );
}

export type NoteViewMode = "grid" | "kanban" | "list";

/**
 * Ordena notas dentro de uma coluna do Kanban.
 * `order` é o mapa id → posição; notas sem posição vão para o fim,
 * estáveis entre si (ordenadas por updatedAt desc).
 */
export function sortNotesForColumn(
  notes: Note[],
  order: Record<string, number>
): Note[] {
  return [...notes].sort((a, b) => {
    const posA = order[a.id];
    const posB = order[b.id];
    if (posA !== undefined && posB !== undefined) return posA - posB;
    if (posA !== undefined) return -1;
    if (posB !== undefined) return 1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
