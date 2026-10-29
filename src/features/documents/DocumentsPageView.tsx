import { useMemo, useRef, useState } from "react";
import { SEED_DOCS, type WorkspaceDoc } from "./data";
import { importFile } from "./import";
import { useOptionalAuth } from "@/app/router/AppRouter";
import { useToast } from "@/shared/components/Toast";
import { RichTextEditor, RichContentView } from "@/features/notes/RichText";
import {
  buildMarkdown,
  buildDocHtml,
  buildPdf,
  downloadFile,
  exportFilename,
} from "./export";

/**
 * Sprint 13 — Minhas Anotações redesignado ao mockup:
 * toolbar com busca + "Nova Anotação", lista de documentos recentes e
 * painel de leitura com autor, "Salvo automaticamente às HH:MM", desfazer/
 * refazer, Compartilhar, lixeira e checklist funcional (checkboxes redondos).
 */
export function DocumentsPageView() {
  const { user } = useOptionalAuth();
  const { showToast } = useToast();
  const [docs, setDocs] = useState<WorkspaceDoc[]>(SEED_DOCS);
  const [selectedId, setSelectedId] = useState(SEED_DOCS[0].id);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  /** Pente fino (item 3): edição inline de seção com toolbar rica. */
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  /** Pente fino (item 10): menu de exportação md/doc/pdf. */
  const [exportOpen, setExportOpen] = useState(false);
  /** Importação: seletor de arquivo + arrastar e soltar sobre a página. */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggingFile, setDraggingFile] = useState(false);

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

  /** Traz um arquivo da máquina (.md, .txt, .html…) como novo documento. */
  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      const doc = await importFile(file, user?.name ?? "Ana Costa");
      setDocs((prev) => [doc, ...prev]);
      setSelectedId(doc.id);
      setQuery("");
      setEditingIndex(null);
      showToast("success", `“${doc.title}” importado de ${file.name}.`);
    } catch (e) {
      showToast(
        "error",
        e instanceof Error ? e.message : "Não foi possível importar o arquivo."
      );
    }
  };

  const savedAtLabel = (() => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  })();

  /** Abre a edição rica de uma seção do documento. */
  const startEditSection = (index: number) => {
    const section = selected?.sections[index];
    if (!section) return;
    setEditingIndex(index);
    setDraft(section.text);
    setExportOpen(false);
  };

  const saveEditSection = () => {
    if (editingIndex === null || !selected) {
      setEditingIndex(null);
      return;
    }
    const targetId = selected.id;
    const index = editingIndex;
    setDocs((prev) =>
      prev.map((d) =>
        d.id === targetId
          ? {
              ...d,
              editedLabel: `Editado agora às ${savedAtLabel}`,
              sections: d.sections.map((s, i) =>
                i === index ? { ...s, text: draft } : s
              ),
            }
          : d
      )
    );
    setEditingIndex(null);
    showToast("success", "Anotação salva.");
  };

  const cancelEditSection = () => {
    setEditingIndex(null);
    setDraft("");
  };

  /** Exporta o documento selecionado no formato escolhido. */
  const handleExport = (format: "md" | "doc" | "pdf") => {
    if (!selected) return;
    try {
      if (format === "md") {
        downloadFile(
          exportFilename(selected.title, "md"),
          buildMarkdown(selected),
          "text/markdown;charset=utf-8"
        );
      } else if (format === "doc") {
        downloadFile(
          exportFilename(selected.title, "doc"),
          buildDocHtml(selected),
          "application/msword"
        );
      } else {
        downloadFile(
          exportFilename(selected.title, "pdf"),
          buildPdf(selected),
          "application/pdf",
          { latin1: true }
        );
      }
      showToast("success", `“${selected.title}” exportado (.${format}).`);
    } catch {
      showToast("error", "Não foi possível exportar o documento.");
    }
    setExportOpen(false);
  };

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        // Só reage a arquivos soltos (não a drag de texto do editor).
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDraggingFile(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setDraggingFile(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDraggingFile(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      {draggingFile && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand/10 backdrop-blur-[1px]">
          <p className="rounded-lg border border-brand/40 bg-surface-container-lowest px-4 py-3 text-sm font-semibold text-on-surface shadow-lg">
            Solte o arquivo para importar
          </p>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <h1 className="text-base font-bold text-on-surface">Minhas Anotações</h1>
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
              className="w-64 rounded-sm border border-outline-variant bg-surface-container py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-secondary focus:outline-none focus:ring-3 focus:ring-secondary/15"
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-sm border border-outline-variant/60 bg-surface-container px-4 py-2.5 text-sm font-medium text-on-surface transition hover:bg-surface-container-high active:scale-[0.98] focus-ring-brand"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            aria-label="Importar arquivo do computador"
            accept=".md,.markdown,.txt,.text,.log,.csv,.html,.htm,.doc"
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.target.files);
              // Permite reimportar o mesmo arquivo em seguida.
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={createDoc}
            className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98] focus-ring-brand"
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
        <aside className="w-full shrink-0 lg:w-60">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Documentos Recentes
            </h2>
            <span className="text-sm font-medium text-on-surface-variant">{visible.length}</span>
          </div>
          {visible.length === 0 ? (
            <p className="rounded-sm border border-outline-variant/30 bg-surface-container-lowest px-3 py-4 text-sm text-on-surface-variant">
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
                      onClick={() => {
                        setSelectedId(d.id);
                        setEditingIndex(null);
                        setExportOpen(false);
                      }}
                      aria-current={active}
                      className={
                        "flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left transition " +
                        (active
                          ? "bg-surface-container text-on-surface ring-1 ring-outline-variant/50"
                          : "text-on-surface-variant hover:bg-surface-container/50 hover:text-on-surface")
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
              <p className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                <span className="font-semibold text-on-surface">{selected.author}</span>
                <span aria-hidden="true">•</span>
                <span>{selected.editedLabel}</span>
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-secondary/15 px-2 py-0.5 text-xs font-medium text-sky-300">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                  Salvo automaticamente às {savedAtLabel}
                </span>
              </p>

              <div className="flex items-center gap-2">
                <span className="inline-flex overflow-hidden rounded-md border border-outline-variant/50">
                  <button
                    type="button"
                    aria-label="Desfazer"
                    title="Desfazer"
                    className="border-r border-outline-variant/50 px-2.5 py-2 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 14 4 9 9 4" />
                      <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Refazer"
                    title="Refazer"
                    className="px-2.5 py-2 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="15 14 20 9 15 4" />
                      <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
                    </svg>
                  </button>
                </span>
                <div className="relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                    onClick={() => setExportOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-md border border-outline-variant/60 bg-surface-container px-3.5 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Exportar
                  </button>
                  {exportOpen && (
                    <div
                      role="menu"
                      aria-label="Formatos de exportação"
                      className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-outline-variant/50 bg-surface-container-lowest py-1 shadow-xl"
                    >
                      {(
                        [
                          ["md", "Markdown (.md)"],
                          ["doc", "Word (.doc)"],
                          ["pdf", "PDF (.pdf)"],
                        ] as const
                      ).map(([fmt, label]) => (
                        <button
                          key={fmt}
                          type="button"
                          role="menuitem"
                          onClick={() => handleExport(fmt)}
                          className="block w-full px-3 py-2 text-left text-sm text-on-surface transition hover:bg-surface-container"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    showToast("success", `“${selected.title}” compartilhado com a equipe.`)
                  }
                  className="inline-flex items-center gap-2 rounded-md border border-outline-variant/60 bg-surface-container px-3.5 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container-high"
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
                <button
                  type="button"
                  aria-label="Excluir documento"
                  title="Excluir documento"
                  className="rounded-md px-2 py-2 text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <h2 className="mt-6 font-display text-lg font-bold leading-snug text-on-surface">
              {selected.title}
            </h2>

            <div className="mt-4 space-y-5">
              {selected.sections.map((s, i) => (
                <div key={i}>
                  {s.heading && (
                    <h3 className="mb-1.5 text-base font-bold text-on-surface">
                      {s.heading}
                    </h3>
                  )}

                  {editingIndex === i ? (
                    <div>
                      <RichTextEditor
                        value={draft}
                        onChange={setDraft}
                        ariaLabel={`Conteúdo da anotação “${selected.title}”`}
                        placeholder="Escreva sua anotação…"
                        minHeight="min-h-[140px]"
                      />
                      <div className="mt-1.5 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditSection}
                          className="rounded px-2 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={saveEditSection}
                          className="rounded bg-brand px-2.5 py-1 text-xs font-semibold text-on-brand transition hover:bg-brand-strong"
                        >
                          Concluir
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      title="Clique para editar a anotação"
                      onClick={(e) => {
                        // Links continuam clicáveis (não abrem a edição).
                        if (
                          (e.target as HTMLElement).closest("a")
                        )
                          return;
                        startEditSection(i);
                      }}
                      className="-mx-2 cursor-text rounded-md px-2 py-1 transition hover:bg-surface-container/60"
                    >
                      <RichContentView
                        html={s.text}
                        className="text-[15px] leading-relaxed text-on-surface-variant"
                      />
                    </div>
                  )}
                </div>
              ))}

              {selected.checklist && selected.checklist.length > 0 && (
                <ul className="space-y-3 pt-1">
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
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition " +
                              (isChecked
                                ? "border-secondary bg-secondary text-white"
                                : "border-outline text-transparent")
                            }
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
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
