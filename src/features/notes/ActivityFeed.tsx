import { useNotes } from "./store";
import { formatRelativeTime } from "./relativeTime";
import type { ActivityEntry } from "./types";

const ACTION_LABEL: Record<ActivityEntry["action"], string> = {
  created: "criou",
  updated: "editou",
  status_changed: "mudou o status de",
  moved: "moveu",
  deleted: "excluiu",
};

const ACTION_COLOR: Record<ActivityEntry["action"], string> = {
  created: "text-emerald-400",
  updated: "text-sky-400",
  status_changed: "text-brand-glow",
  moved: "text-amber-400",
  deleted: "text-red-400",
};

/**
 * Sprint 6 — Feed de atividade colaborativa: mostra quem fez o quê e quando,
 * para que mudanças assíncronas não peguem o time de surpresa.
 */
export function ActivityFeed() {
  const { activity } = useNotes();

  if (activity.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
          Atividade recente
        </h3>
        <p className="mt-2 text-xs text-on-surface-variant/70">
          Nenhuma atividade nesta sessão. Crie, edite ou mova anotações para ver
          o histórico aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-5">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
        Atividade recente
      </h3>
      <ul className="mt-3 space-y-2.5">
        {activity.slice(0, 8).map((entry) => (
          <li key={entry.id} className="flex items-start gap-2 text-xs">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${dotColor(entry.action)}`} />
            <span className="text-on-surface-variant">
              <strong className="font-semibold text-on-surface">{entry.actor}</strong>{" "}
              <span className={ACTION_COLOR[entry.action]}>{ACTION_LABEL[entry.action]}</span>{" "}
              <span className="font-medium text-on-surface">
                {entry.action === "deleted" ? `“${entry.noteTitle}”` : `“${entry.noteTitle}”`}
              </span>
              <span className="ml-1 text-on-surface-variant/60">
                · {formatRelativeTime(entry.at)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function dotColor(action: ActivityEntry["action"]): string {
  return {
    created: "bg-emerald-400",
    updated: "bg-sky-400",
    status_changed: "bg-brand",
    moved: "bg-amber-400",
    deleted: "bg-error",
  }[action];
}
