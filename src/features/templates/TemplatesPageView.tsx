import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TEMPLATES,
  TAB_LABEL,
  type Template,
  type TemplateTab,
} from "./templates";
import { useNotes } from "@/features/notes";
import { useToast } from "@/shared/components/Toast";

type Filter = "todos" | TemplateTab;

const TABS: Filter[] = ["todos", "gestao", "documentos", "design", "jogos"];

export function TemplatesPageView() {
  const navigate = useNavigate();
  const { createNote } = useNotes();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState<Template[]>([]);
  const [creating, setCreating] = useState(false);

  const all = useMemo(() => [...TEMPLATES, ...custom], [custom]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(
      (t) =>
        (tab === "todos" || t.tab === tab) &&
        (q === "" ||
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.author.toLowerCase().includes(q))
    );
  }, [all, tab, query]);

  const useTemplate = (t: Template) => {
    createNote({ title: t.title, content: t.body, tags: ["template"] });
    showToast("success", `Modelo “${t.title}” aplicado — nova anotação criada.`);
    navigate("/app/notes");
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-on-surface">
            Templates
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Modelos padronizados para iniciar sprints, documentações e pesquisas com agilidade.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Criar Modelo
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTab(f)}
              aria-pressed={tab === f}
              className={
                "rounded-lg px-3.5 py-2 text-sm font-medium transition " +
                (tab === f
                  ? "bg-surface-container text-on-surface ring-1 ring-outline-variant/60"
                  : "text-on-surface-variant hover:text-on-surface")
              }
            >
              {f === "todos" ? "Todos" : TAB_LABEL[f]}
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
            placeholder="Buscar template..."
            aria-label="Buscar template"
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-12 text-center">
          <p className="text-sm font-medium text-on-surface">Nenhum template encontrado.</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Tente outro termo ou crie um novo modelo.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => (
            <article
              key={t.id}
              className="flex flex-col rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-5 transition hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-glow ring-1 ring-brand/20">
                  <TemplateIcon name={t.icon} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  {t.categoryLabel}
                </span>
              </div>

              <h2 className="font-display text-base font-semibold text-on-surface">
                {t.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                {t.description}
              </p>

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
                <span className="truncate text-xs text-on-surface-variant">{t.author}</span>
                <button
                  type="button"
                  onClick={() => useTemplate(t)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-container px-3 py-1.5 text-sm font-medium text-on-surface ring-1 ring-outline-variant/50 transition hover:border-brand hover:ring-brand/50"
                >
                  Usar modelo
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && (
        <CreateTemplateModal
          onClose={() => setCreating(false)}
          onCreate={(t) => {
            setCustom((prev) => [...prev, t]);
            showToast("success", `Modelo “${t.title}” criado.`);
          }}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (t: Template) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<TemplateTab>("gestao");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Informe o título do modelo.");
      return;
    }
    onCreate({
      id: `tpl-custom-${Date.now().toString(36)}`,
      tab,
      categoryLabel: TAB_LABEL[tab],
      title: title.trim(),
      description: description.trim() || "Modelo personalizado da equipe.",
      author: "Você",
      icon: "file",
      body: `${title.trim()}\n\n1. Contexto\n\n2. Conteúdo\n`,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-on-surface">Criar Modelo</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Plano de Testes de Campo"
              autoFocus
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Para que serve este modelo?"
              className="mt-1 block w-full resize-none rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface">Categoria</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value as TemplateTab)}
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
            >
              {(["gestao", "documentos", "design", "jogos"] as TemplateTab[]).map((t) => (
                <option key={t} value={t}>
                  {TAB_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateIcon({ name }: { name: Template["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "board") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18" />
        <path d="M15 3v18" />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    );
  }
  if (name === "palette") {
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
  if (name === "gamepad") {
    return (
      <svg {...common}>
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="4" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
