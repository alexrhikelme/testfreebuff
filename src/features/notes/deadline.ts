import type { Note } from "./types";

export type DeadlineState =
  | "none"
  | "ok"
  | "urgent"
  | "today"
  | "overdue";

/** Milliseconds per day, used to compute days-until-deadline. */
const MS_PER_DAY = 86_400_000;

/** Compares "YYYY-MM-DD" strings without timezone interference. */
function parseDateOnly(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return Number.NaN;
  return Date.UTC(y, m - 1, d);
}

/** Today's date as a UTC timestamp (date-only), stable during a render. */
export function todayUtc(now: Date = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Milliseconds in one day, exported for tests. */
export { MS_PER_DAY };

/**
 * Classifies a note's deadline for visual indicators.
 * Completed notes are never flagged (work is done, deadline is irrelevant).
 */
export function getDeadlineState(
  note: Note,
  now: Date = new Date()
): DeadlineState {
  if (note.status === "completed" || !note.dueDate) return "none";
  const due = parseDateOnly(note.dueDate);
  if (Number.isNaN(due)) return "none";
  const diffDays = Math.round((due - todayUtc(now)) / MS_PER_DAY);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "urgent";
  return "ok";
}

/** Human-readable deadline info for cards and lists. */
export function describeDeadline(
  note: Note,
  now: Date = new Date()
): string {
  switch (getDeadlineState(note, now)) {
    case "overdue":
      return "Atrasada";
    case "today":
      return "Vence hoje";
    case "urgent": {
      const due = parseDateOnly(note.dueDate!);
      const days = Math.round((due - todayUtc(now)) / MS_PER_DAY);
      return `Vence em ${days} dia${days === 1 ? "" : "s"}`;
    }
    default:
      return "";
  }
}

export type DeadlineMeta = {
  state: DeadlineState;
  label: string;
};

const DEADLINE_META: Record<
  Exclude<DeadlineState, "none" | "ok">,
  { className: string; dotClassName: string }
> = {
  overdue: {
    className: "bg-error/15 text-red-400 border-error/40",
    dotClassName: "bg-error",
  },
  today: {
    className: "bg-brand/15 text-brand-glow border-brand/40",
    dotClassName: "bg-brand",
  },
  urgent: {
    className: "bg-warning/15 text-amber-400 border-warning/40",
    dotClassName: "bg-warning",
  },
};

/** Tailwind classes for a deadline badge, per state. */
export function deadlineBadgeClasses(state: DeadlineState): {
  className: string;
  dotClassName: string;
} | null {
  if (state === "none" || state === "ok") return null;
  return DEADLINE_META[state];
}

/** Checks that a note period makes sense (start <= due). */
export function validatePeriod(
  startDate?: string,
  dueDate?: string
): string | null {
  if (startDate && !dueDate) {
    return "Informe o prazo se houver data de início.";
  }
  if (!startDate || !dueDate) return null;
  const start = parseDateOnly(startDate);
  const due = parseDateOnly(dueDate);
  if (Number.isNaN(start) || Number.isNaN(due)) {
    return "Datas inválidas.";
  }
  if (start > due) {
    return "A data de início não pode ser depois do prazo.";
  }
  return null;
}
