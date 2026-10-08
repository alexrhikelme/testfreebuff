import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Sprint 10 — Heurística 9 (ajudar o usuário a reconhecer erros) e
 * Heurística 3 (controle do usuário: desfazer).
 *
 * Sistema de toasts acessível: região aria-live, auto-dismiss (6 s; erros
 * permanecem até fechar) e suporte a ação (ex.: "Desfazer" após excluir).
 */

export type ToastKind = "success" | "error" | "info";

type ToastAction = { label: string; onClick: () => void };

type Toast = {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
};

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string, action?: ToastAction) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_STYLES: Record<ToastKind, string> = {
  success: "border-tertiary/50 bg-tertiary/15 text-emerald-300",
  error: "border-error/50 bg-error/15 text-red-300",
  info: "border-outline-variant bg-surface-container-high text-on-surface",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (kind: ToastKind, message: string, action?: ToastAction) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message, action }]);
      if (kind !== "error") {
        window.setTimeout(() => dismiss(id), 6000);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      role={toast.kind === "error" ? "alert" : "status"}
      className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${TOAST_STYLES[toast.kind]}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action!.onClick();
              onDismiss();
            }}
            className="mt-1 text-xs font-semibold underline underline-offset-2 transition hover:opacity-80"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded p-0.5 transition hover:opacity-70"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/**
 * Variante segura para uso fora do ToastProvider (ex.: stores em testes):
 * sem provider, showToast vira no-op em vez de lançar erro.
 */
export function useOptionalToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? { showToast: () => {} };
}
