import { useMemo, useState } from "react";
import { useTrash, describeDeletedAt, type TrashKind } from "./store";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useToast } from "@/shared/components/Toast";

type Filter = "todos" | TrashKind;

const FILTER_LABEL: Record<Filter, string> = {
  todos: "Todos",
  projeto: "Projetos",
  documento: "Documentos",
};

export function TrashPageView() {
  const { items, restore, remove, empty } = useTrash();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  /** Item aguardando confirmação de exclusão definitiva. */
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const counts = useMemo(
    () => ({
      todos: items.length,
      projeto: items.filter((i) => i.kind === "projeto").length,
      documento: items.filter((i) => i.kind === "documento").length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) =>
        (filter === "todos" || i.kind === filter) &&
        (q === "" || i.title.toLowerCase().includes(q))
    );
  }, [items, filter, query]);

  const pendingItem = items.find((i) => i.id === pendingDelete) ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Lixeira
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Itens e projetos excluídos recentemente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmEmpty(true)}
          disabled={items.length === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-medium text-on-surface transition hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
          Esvaziar Lixeira
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(["todos", "projeto", "documento"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={
                "rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                (filter === f
                  ? "bg-brand text-on-brand"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface")
              }
            >
              {FILTER_LABEL[f]}{" "}
              <span className={filter === f ? "opacity-80" : "text-on-surface-variant/70"}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar na lixeira..."
            aria-label="Buscar na lixeira"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-sm font-medium text-on-surface">
            {items.length === 0 ? "A lixeira está vazia." : "Nenhum item encontrado."}
          </p>
          <p className="mt-1 text-sm text-on-surface-variant">
            {items.length === 0
              ? "Os itens excluídos aparecem aqui antes da exclusão definitiva."
              : "Tente outro termo ou filtro."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-surface-container/40"
            >
              <TrashKindIcon kind={item.kind} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-on-surface">{item.title}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">
                  {item.kind === "projeto" ? "Projeto" : "Documento"} •{" "}
                  {describeDeletedAt(item.deletedAt)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    restore(item.id);
                    showToast("success", `“${item.title}” restaurado.`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface transition hover:bg-surface-container"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDelete(item.id)}
                  aria-label={`Excluir definitivamente “${item.title}”`}
                  title="Excluir definitivamente"
                  className="rounded-lg p-2 text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pendingItem && (
        <ConfirmDialog
          title="Excluir definitivamente?"
          description={`“${pendingItem.title}” será removido permanentemente. Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir definitivamente"
          onConfirm={() => {
            remove(pendingItem.id);
            showToast("success", "Item excluído definitivamente.");
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {confirmEmpty && (
        <ConfirmDialog
          title="Esvaziar lixeira?"
          description={`Todos os ${items.length} itens serão excluídos permanentemente. Esta ação não pode ser desfeita.`}
          confirmLabel="Esvaziar"
          onConfirm={() => {
            empty();
            showToast("success", "Lixeira esvaziada.");
            setConfirmEmpty(false);
          }}
          onCancel={() => setConfirmEmpty(false)}
        />
      )}
    </div>
  );
}

function TrashKindIcon({ kind }: { kind: TrashKind }) {
  if (kind === "projeto") {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand-glow ring-1 ring-brand/20">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant ring-1 ring-outline-variant/40">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </span>
  );
}
