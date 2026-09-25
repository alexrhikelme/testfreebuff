import type { NoteStatus } from "./types";

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
