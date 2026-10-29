import { useEffect, useRef, useState } from "react";
import { useNotes } from "./store";
import type { Note } from "./types";

/**
 * Conteúdo rico das anotações (pente fino):
 * - `sanitizeRichHtml` mantém só tags seguras (negrito, itálico, lista, link…)
 *   e neutraliza scripts/eventos/javascript:;
 * - `RichContentView` renderiza a descrição fiel ao que foi escrito, com
 *   links clicáveis (abrem em nova aba);
 * - `RichTextEditor` é um editor inline com toolbar (negrito, itálico,
 *   sublinhado, riscado, lista e link);
 * - `NoteContent` integra os dois ao card: clique na descrição abre a edição
 *   direto dentro da anotação e "Concluir" persiste no store.
 */

/** Tags permitidas no conteúdo salvo (allowlist). */
const ALLOWED_TAGS = new Set([
  "B",
  "STRONG",
  "I",
  "EM",
  "U",
  "S",
  "STRIKE",
  "BR",
  "P",
  "DIV",
  "UL",
  "OL",
  "LI",
  "A",
]);

/** Tags descartadas por completo (nem o texto interno é mantido). */
const DROP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "IFRAME",
  "OBJECT",
  "EMBED",
  "SVG",
  "IMG",
  "INPUT",
  "BUTTON",
  "FORM",
]);

function safeHref(href: string): string | null {
  const value = href.trim();
  if (/^(https?:\/\/|mailto:|#|\/)/i.test(value)) return value;
  return null;
}

function cleanNode(src: Node, dst: Node, doc: Document): void {
  src.childNodes.forEach((child) => {
    // Texto: preservado (React/innerHTML escapam naturalmente).
    if (child.nodeType === 3) {
      dst.appendChild(doc.createTextNode(child.textContent ?? ""));
      return;
    }
    if (child.nodeType !== 1) return; // comentários etc. são descartados
    const el = child as Element;
    const tag = el.tagName.toUpperCase();
    if (DROP_TAGS.has(tag)) return;
    if (!ALLOWED_TAGS.has(tag)) {
      // Tag não permitida: só o texto dos filhos é mantido (desconecta).
      cleanNode(el, dst, doc);
      return;
    }
    if (tag === "BR") {
      dst.appendChild(doc.createElement("br"));
      return;
    }
    if (tag === "A") {
      const href = safeHref(el.getAttribute("href") ?? "");
      if (!href) {
        cleanNode(el, dst, doc);
        return;
      }
      const a = doc.createElement("a");
      a.setAttribute("href", href);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
      cleanNode(el, a, doc);
      dst.appendChild(a);
      return;
    }
    const out = doc.createElement(tag.toLowerCase());
    cleanNode(el, out, doc);
    dst.appendChild(out);
  });
}

/** Reduz o HTML a tags seguras; links ganham target/rel para nova aba. */
export function sanitizeRichHtml(raw: string): string {
  if (!raw) return "";
  const doc = new DOMParser().parseFromString(`<div>${raw}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  const out = doc.createElement("div");
  cleanNode(root, out, doc);
  return out.innerHTML;
}

/** Renderiza a descrição fiel ao escrito (formatação e links preservados). */
export function RichContentView({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  if (!html) return null;
  // Texto puro (notas antigas): escapa por padrão do React e preserva \n.
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    return <span className={`block whitespace-pre-wrap ${className}`}>{html}</span>;
  }
  return (
    <span
      className={`rich-content block ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}
    />
  );
}

const TOOLS: Array<{ cmd: string; text: string; title: string; cls: string }> = [
  { cmd: "bold", text: "B", title: "Negrito", cls: "font-bold" },
  { cmd: "italic", text: "I", title: "Itálico", cls: "italic font-serif" },
  { cmd: "underline", text: "U", title: "Sublinhado", cls: "underline" },
  { cmd: "strikeThrough", text: "S", title: "Riscado", cls: "line-through" },
];

/** Editor inline com toolbar de formatação (contentEditable). */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Escreva aqui…",
  ariaLabel = "Descrição da anotação",
  minHeight = "min-h-[84px]",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  minHeight?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  /** Último HTML emitido por este editor — evita resetar o cursor. */
  const lastEmitted = useRef(value);
  const initialized = useRef(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Conteúdo inicial (mount).
  useEffect(() => {
    const el = ref.current;
    if (!el || initialized.current) return;
    initialized.current = true;
    el.innerHTML = value;
    lastEmitted.current = value;
    setIsEmpty(!el.textContent?.trim());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mudança externa (ex.: trocar de anotação enquanto o editor está aberto).
  useEffect(() => {
    const el = ref.current;
    if (!el || !initialized.current) return;
    if (value !== lastEmitted.current) {
      el.innerHTML = value;
      lastEmitted.current = value;
      setIsEmpty(!el.textContent?.trim());
    }
  }, [value]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    const next = sanitizeRichHtml(el.innerHTML);
    lastEmitted.current = next;
    setIsEmpty(!el.textContent?.trim());
    onChange(next);
  };

  const exec = (cmd: string, arg?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(cmd, false, arg);
    } catch {
      // execCommand não suportado neste ambiente — segue sem quebrar.
    }
    emit();
  };

  const insertLink = () => {
    let url = "";
    try {
      url = window.prompt("URL do link") ?? "";
    } catch {
      url = "";
    }
    url = url.trim();
    if (!url) return;
    if (!/^(https?:\/\/|mailto:)/i.test(url)) url = `https://${url}`;
    exec("createLink", url);
  };

  return (
    <div className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
      <div
        role="toolbar"
        aria-label="Formatação do texto"
        className="flex flex-wrap items-center gap-1 border-b border-outline-variant/50 bg-surface-container-low px-2 py-1"
      >
        {TOOLS.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            aria-label={t.title}
            // Mantém a seleção do texto ao clicar no botão.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd)}
            className={
              "h-7 w-7 rounded text-xs text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-ring-brand " +
              t.cls
            }
          >
            {t.text}
          </button>
        ))}
        <button
          type="button"
          title="Lista com marcadores"
          aria-label="Lista com marcadores"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          className="h-7 rounded px-2 text-xs text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-ring-brand"
        >
          • Lista
        </button>
        <span className="mx-1 h-4 w-px bg-outline-variant/60" aria-hidden="true" />
        <button
          type="button"
          title="Inserir link"
          aria-label="Inserir link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="h-7 rounded px-2 text-xs text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface focus-ring-brand"
        >
          Link
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emit}
        className={
          "rich-editor whitespace-pre-wrap px-3 py-2 text-sm leading-relaxed text-on-surface focus:outline-none " +
          minHeight +
          (isEmpty ? " is-empty" : "")
        }
      />
    </div>
  );
}

/**
 * Descrição da anotação dentro do card: clique abre a edição inline com
 * toolbar; "Concluir" salva no store. Links continuam clicáveis.
 */
export function NoteContent({
  note,
  onEditingChange,
}: {
  note: Note;
  /** Avisa o card quando a edição abre/fecha (ex.: desativar o drag). */
  onEditingChange?: (editing: boolean) => void;
}) {
  const { updateNote } = useNotes();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);

  const startEditing = () => {
    setDraft(note.content);
    setEditing(true);
    onEditingChange?.(true);
  };

  const stopEditing = (save: boolean) => {
    if (save && draft !== note.content) {
      updateNote(note.id, { content: draft });
    }
    setEditing(false);
    onEditingChange?.(false);
  };

  if (editing) {
    return (
      <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          ariaLabel={`Descrição de ${note.title}`}
          placeholder="Escreva a descrição da anotação…"
          minHeight="min-h-[72px]"
        />
        <div className="mt-1.5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => stopEditing(false)}
            className="rounded px-2 py-1 text-[11px] font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => stopEditing(true)}
            className="rounded bg-brand px-2.5 py-1 text-[11px] font-semibold text-on-brand transition hover:bg-brand-strong"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  if (!note.content) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          startEditing();
        }}
        className="mt-1.5 w-full rounded border border-dashed border-outline-variant/50 px-2 py-1.5 text-left text-xs text-on-surface-variant/70 transition hover:border-brand/50 hover:text-brand-glow"
      >
        Escrever descrição…
      </button>
    );
  }

  const blocked = note.status === "blocked";
  return (
    <div
      title="Clique para editar a descrição"
      onClick={(e) => {
        // Links continuam clicáveis: cliques em <a> não abrem a edição.
        if ((e.target as HTMLElement).closest("a")) return;
        startEditing();
      }}
      className={
        "mt-1.5 cursor-text text-xs leading-relaxed " +
        (blocked
          ? "rounded border border-error/40 bg-error/10 p-2 text-red-300"
          : "text-on-surface-variant")
      }
    >
      {blocked && <span className="font-semibold text-red-200">Bloqueio:</span>}{" "}
      <RichContentView html={note.content} />
    </div>
  );
}
