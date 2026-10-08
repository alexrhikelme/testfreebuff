import { useMemo, useState } from "react";
import { SEED_DOCS, type WorkspaceDoc } from "./data";
import { useOptionalAuth } from "@/app/router/AppRouter";
import { useToast } from "@/shared/components/Toast";

/**
 * Sprint 11 — Janela "Minhas Anotações":
 * lista de documentos recentes + painel de leitura/edição com checklist
 * de tarefas (Heurística 1 de Nielsen: visibilidade de estado).
 */
export function DocumentsPageView() {
  const { user } = useOptionalAuth();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<WorkspaceDoc[]>(SEED_DOCS);
  const [selectedId, setSelectedId] = useState(SEED_DOCS[0].id);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => q === "" || d.title.toLowerCase().includes(q));
  }, [docs, query]);

  const selected = docs.find((d) => d.id === selectedId) ?? visible[0] ?? docs[0];

  const toggleCheck = (docId: string, index: number) => {
    setChecked((prev) => {
      const doc = docs.find((d) => d.id === docId);
      const initial = doc?.checklist?.[index]?.checked ?? false;
      const key = `${docId}:${index}`;
      return { ...prev, [key]: !(key in prev ? prev[key] : initial) };
    });
  };

  const getChecked = (docId: string, index: number) => {
    const doc = docs.find((d) => d.id === docId);
    const initial = doc?.checklist?.[index]?.checked ?? false;
    const key = `${docId}:${index}`;
    return key in checked ? checked[key] : initial;
  };

  const createDoc = () => {
    const id = `doc-${Date.now().toString(36)}`;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const doc: WorkspaceDoc = {
      id,
      kind: "nota",
      title: "Nova Anotação",
      dateLabel: "Agora",
      author: user?.name ?? "Ana Costa",
      editedLabel: `Editado agora às ${hh}:${mm}`,
      sections: [
        {
          text: "Comece a escrever sua anotação, rascunho ou documentação rápida da equipe.",
        },
      ],
    };
    setDocs((prev) => [doc, ...prev]);
    setSelectedId(id);
    showToast("success", "Nova anotação criada.");
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Minhas Anotações
          </h1>
          <p className="mt-1 max-w-xl text-sm text-on-surface-variant">
            Espaço de notas, rascunhos e documentação rápida da equipe Combogó.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
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
              placeholder="Buscar anotação..."
              aria-label="Buscar anotação"
              className="w-56 rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <button
            type="button"
            onClick={createDoc}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Nova Anotação
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Lista de documentos recentes */}
        <aside className="w-full shrink-0 lg:w-64">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Documentos Recentes
            </h2>
            <span className="text-sm font-medium text-on-surface-variant">{visible.length}</span>
          </div>

          {visible.length === 0 ? (
            <p className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-3 py-4 text-sm text-on-surface-variant">
              Nenhum documento encontrado.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((d) => {
                const active = selected?.id === d.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(d.id)}
                      aria-current={active}
                      className={
                        "flex w-full items-center gap-2.5 rounded-lg border-l-2 px-3 py-2.5 text-left transition " +
                        (active
                          ? "border-brand bg-surface-container text-on-surface ring-1 ring-outline-variant/40"
                          : "border-transparent text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface")
                      }
                    >
                      <DocKindIcon kind={d.kind} active={active} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {d.title}
                      </span>
                      <span className="shrink-0 text-xs text-on-surface-variant">{d.dateLabel}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Painel de leitura/edição */}
        {selected ? (
          <article className="min-w-0 flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-sm sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
              <p className="text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{selected.author}</span>
                {" • "}
                {selected.editedLabel}
              </p>
              <button
                type="button"
                onClick={() =>
                  showToast("success", `“${selected.title}” compartilhado com a equipe.`)
                }
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant px-3.5 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Compartilhar
              </button>
            </div>

            <h2 className="mt-6 font-display text-xl font-semibold leading-snug text-on-surface">
              {selected.title}
            </h2>

            <div className="mt-4 space-y-5">
              {selected.sections.map((s, i) => (
                <div key={i}>
                  {s.heading && (
                    <h3 className="mb-1.5 text-base font-semibold text-on-surface">
                      {s.heading}
                    </h3>
                  )}
                  <p className="text-[15px] leading-relaxed text-on-surface-variant">{s.text}</p>
                </div>
              ))}

              {selected.checklist && selected.checklist.length > 0 && (
                <ul className="space-y-2.5 pt-1">
                  {selected.checklist.map((item, i) => {
                    const isChecked = getChecked(selected.id, i);
                    return (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(selected.id, i)}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition " +
                              (isChecked
                                ? "bg-brand text-on-brand"
                                : "border-2 border-outline-variant text-transparent")
                            }
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span
                            className={
                              isChecked
                                ? "text-on-surface-variant line-through"
                                : "text-on-surface"
                            }
                          >
                            {item.label}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </article>
        ) : (
          <div className="min-w-0 flex-1 rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-12 text-center">
            <p className="text-sm font-medium text-on-surface">Nenhum documento selecionado.</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Selecione um documento na lista ao lado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocKindIcon({
  kind,
  active,
}: {
  kind: WorkspaceDoc["kind"];
  active: boolean;
}) {
  const color = active ? "text-brand-glow" : "text-on-surface-variant";
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: color,
  };

  if (kind === "ata") {
    return (
      <svg {...common}>
        <line x1="4" y1="7" x2="20" y2="7" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <line x1="4" y1="17" x2="14" y2="17" />
      </svg>
    );
  }
  if (kind === "diretriz") {
    return (
      <svg {...common}>
        <circle cx="13.5" cy="6.5" r="1" />
        <circle cx="17.5" cy="10.5" r="1" />
        <circle cx="8.5" cy="7.5" r="1" />
        <circle cx="6.5" cy="12.5" r="1" />
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.83-.44-1.12a1.64 1.64 0 0 1 1.23-2.8h2c3.05 0 5.56-2.5 5.56-5.55C22 6.01 17.5 2 12 2z" />
      </svg>
    );
  }
  if (kind === "checklist") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="8 12 11 15 16 9" />
      </svg>
    );
  }
  // prd e nota
  return (
    <svg {...common}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
