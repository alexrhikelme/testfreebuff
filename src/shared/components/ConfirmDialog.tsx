import { useEffect } from "react";

/**
 * Sprint 10 — Heurística 3 (prevenção e reversão de erros).
 * Confirmação para ações destrutivas: a ação só roda se o usuário confirmar.
 * Acessível (role="dialog", aria-modal, ESC, backdrop) e com foco no botão
 * perigoso.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl"
      >
        <h2 className="font-display text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            autoFocus
            className="rounded-md bg-error px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
