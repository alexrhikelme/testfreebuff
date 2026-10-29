import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useNotes } from "./store";
import { formatRelativeTime } from "./relativeTime";
import type { ActivityEntry } from "./types";

/**
 * Pente fino (item 7) — o sino de notificações ganha uma janelinha com o
 * que aconteceu recentemente no workspace: feed de atividade (quem fez o
 * quê, em qual anotação e quando). Fecha com ESC ou clique fora.
 */

const ACTION_LABEL: Record<ActivityEntry["action"], string> = {
  created: "criou",
  updated: "editou",
  status_changed: "mudou o status de",
  moved: "moveu",
  deleted: "excluiu",
};

const DOT_COLOR: Record<ActivityEntry["action"], string> = {
  created: "bg-emerald-400",
  updated: "bg-sky-400",
  status_changed: "bg-brand",
  moved: "bg-amber-400",
  deleted: "bg-error",
};

export function NotificationsBell() {
  const { activity } = useNotes();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Fecha com ESC ou clique fora da janelinha.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  const recent = activity.slice(0, 8);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-label="Notificações"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={
          activity.length > 0
            ? `${activity.length} notificação(ões) recente(s)`
            : "Notificações"
        }
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-ring-brand"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {activity.length > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-surface bg-brand-glow"
          />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className="absolute right-0 top-full z-50 mt-2 w-[335px] overflow-hidden rounded-xl border border-outline-variant/50 bg-surface-container-lowest shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-4 py-3">
            <p className="text-sm font-semibold text-on-surface">
              Notificações
            </p>
            <span className="text-[11px] font-medium text-on-surface-variant">
              {activity.length === 0
                ? "sem eventos"
                : `${activity.length} recente(s)`}
            </span>
          </div>

          {recent.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs leading-relaxed text-on-surface-variant/70">
              Nenhuma notificação ainda. Crie, edite ou mova anotações para ver
              o que aconteceu recentemente por aqui.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-2">
              {recent.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-surface-container"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLOR[entry.action]}`}
                  />
                  <p className="text-xs leading-relaxed text-on-surface-variant">
                    <strong className="font-semibold text-on-surface">
                      {entry.actor}
                    </strong>{" "}
                    <span className="text-brand-glow">
                      {ACTION_LABEL[entry.action]}
                    </span>{" "}
                    <span className="font-medium text-on-surface">
                      “{entry.noteTitle}”
                    </span>
                    <span className="ml-1 text-on-surface-variant/60">
                      · {formatRelativeTime(entry.at)}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-outline-variant/40 px-4 py-2.5 text-right">
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-brand-glow transition hover:underline"
            >
              Ver atividade →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
