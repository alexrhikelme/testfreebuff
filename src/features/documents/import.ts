/**
 * Importação de documentos — traz um arquivo da máquina para o workspace.
 * Funções puras, sem dependências externas:
 * - .md/.markdown → Markdown (títulos, listas, checklist, negrito, links);
 * - .html/.htm/.doc → HTML sanitizado (só tags permitidas, links seguros);
 * - .txt/.text/.log/.csv → texto puro preservando parágrafos e quebras.
 * Formatos binários (.docx, .pdf) não têm leitura determinística aqui e são
 * recusados com uma mensagem explicando o que aceitamos.
 */
import type { WorkspaceDoc, DocSection, DocCheckItem } from "./data";

const SUPPORTED_EXTENSIONS = [
  ".md",
  ".markdown",
  ".txt",
  ".text",
  ".log",
  ".csv",
  ".html",
  ".htm",
  ".doc",
];

/** Extensão válida (minúsculas, com ponto) ou null se o arquivo não serve. */
export function supportedExtension(fileName: string): string | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const ext = match ? `.${match[1].toLowerCase()}` : "";
  return SUPPORTED_EXTENSIONS.includes(ext) ? ext : null;
}

/** Explica o recusa mostrando os formatos que o app consegue ler. */
export function unsupportedMessage(fileName: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const label = ext ? `.${ext[1].toLowerCase()}` : "este formato";
  return `Não foi possível ler ${label}. Formatos aceitos: ${SUPPORTED_EXTENSIONS.join(
    ", "
  )}. Para .docx ou .pdf, exporte o arquivo como .md, .txt ou .html.`;
}

/* --------------------------------------------------------------------- */
/* Texto e HTML seguros                                                    */
/* --------------------------------------------------------------------- */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/gi, "&");
}

/**
 * Saída é HTML: só &nbsp; e &amp; são resolvidos. &lt;, &gt; e entidades
 * numéricas ficam como estão — renderizam como texto e nunca como marcação.
 */
function decodeEntitiesHtml(value: string): string {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&");
}

/** Só links de verdade entram no documento (bloqueia javascript: etc.). */
function safeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(href.trim());
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, ""));
}

/** **negrito**, *itálico*, ~~risco~~ e [texto](link) → HTML de verdade. */
function inlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  out = out.replace(/(^|[^*\w])\*([^*\n]+)\*/g, "$1<i>$2</i>");
  out = out.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_m, label: string, href: string) =>
      safeHref(href) ? `<a href="${escapeHtml(href)}">${label}</a>` : label
  );
  return out;
}

/** Tags de formatação que sobrevivem à importação (sempre sem atributos). */
const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "strike",
  "code",
  "br",
  "ul",
  "ol",
  "li",
]);

const TAG_PATTERN = /<(\/?)([a-z][a-z0-9]*)(\s[^>]*)?>/gi;

/**
 * Mantém apenas as tags de formatação permitidas (sem atributos) e âncoras
 * com href seguro; o resto vira texto — texto importado nunca injeta script.
 */
function sanitizeInline(html: string): string {
  const anchors: string[] = [];
  const allowed: string[] = [];

  // 1. Âncoras: href validado e conteúdo interno higienizado.
  let out = html.replace(
    /<a\b([^>]*)>([\s\S]*?)<\/a>/gi,
    (_m, attrs: string, inner: string) => {
      const hrefMatch = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
      const href = (hrefMatch?.[1] ?? hrefMatch?.[2] ?? "").trim();
      const cleanInner = inner.replace(TAG_PATTERN, (_t, slash: string, tag: string) => {
        const name = tag.toLowerCase();
        return ALLOWED_TAGS.has(name) ? `<${slash}${name}>` : "";
      });
      anchors.push(
        safeHref(href) ? `<a href="${escapeHtml(href)}">${cleanInner}</a>` : cleanInner
      );
      return `\u0000A${anchors.length - 1}\u0000`;
    }
  );

  // 2. Tags permitidas viram marcadores (atributos descartados); o resto some.
  out = out.replace(TAG_PATTERN, (_m, slash: string, tag: string) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return "";
    allowed.push(`<${slash}${name}>`);
    return `\u0000T${allowed.length - 1}\u0000`;
  });
  // 3. Qualquer resto que pareça marcação vira texto literal.
  out = out.replace(/</g, "&lt;");
  // 4. Devolve a marcação permitida e as âncoras validadas.
  out = out.replace(/\u0000T(\d+)\u0000/g, (_m, index: string) => allowed[Number(index)] ?? "");
  out = out.replace(/\u0000A(\d+)\u0000/g, (_m, index: string) => anchors[Number(index)] ?? "");

  return decodeEntitiesHtml(out)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ParsedDoc = {
  title?: string;
  sections: DocSection[];
  checklist: DocCheckItem[];
};

/* --------------------------------------------------------------------- */
/* Parsers por formato                                                     */
/* --------------------------------------------------------------------- */

/** Markdown: "# Título" vira título, "## Seção" vira cabeçalho de seção. */
export function parseMarkdown(raw: string): ParsedDoc {
  const blocks = raw.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/);
  const sections: DocSection[] = [];
  const checklist: DocCheckItem[] = [];
  let title: string | undefined;

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n");
    let heading: string | undefined;
    let body = lines;

    const headingMatch = /^#{1,6}\s+(.*)$/.exec(lines[0]);
    if (headingMatch) {
      const level = lines[0].indexOf(" ");
      const value = headingMatch[1].trim();
      if (level === 1 && !title) title = value;
      else heading = value;
      body = lines.slice(1);
    }

    const paragraphs: string[] = [];
    const listItems: string[] = [];
    let ordered = false;
    for (const line of body) {
      const check = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(line);
      if (check) {
        checklist.push({
          label: check[2].trim(),
          checked: check[1].toLowerCase() === "x",
        });
        continue;
      }
      const item = /^\s*(?:[-*]|\d+[.)])\s+(.*)$/.exec(line);
      if (item) {
        ordered = ordered || /^\s*\d+[.)]/.test(line);
        listItems.push(`<li>${inlineMarkdown(item[1])}</li>`);
        continue;
      }
      if (line.trim()) paragraphs.push(inlineMarkdown(line.trim()));
    }

    let text = "";
    if (listItems.length > 0) {
      text = `<${ordered ? "ol" : "ul"}>${listItems.join("")}</${ordered ? "ol" : "ul"}>`;
    }
    if (paragraphs.length > 0) {
      const joined = paragraphs.join("<br>");
      text = text ? `${text}<br>${joined}` : joined;
    }

    if (text || heading) sections.push({ ...(heading ? { heading } : {}), text });
  }

  return { title, sections, checklist };
}

/** HTML (.html/.htm/.doc): títulos viram seções, resto é sanitizado. */
export function parseHtml(raw: string): ParsedDoc {
  const withoutNoise = raw
    .replace(/\r\n?/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  let headTitle: string | undefined;
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(withoutNoise);
  if (titleMatch) {
    const value = stripTags(titleMatch[1]).trim();
    if (value) headTitle = value;
  }
  let title: string | undefined;

  // Cada h1..h6 vira um bloco próprio marcado (\u0000 H <n> \u0000).
  const marked = withoutNoise.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\s*\1\s*>/gi,
    (_m, level: string, inner: string) =>
      `\n\n\u0000H${level}\u0000${stripTags(inner).trim()}\n\n`
  );
  const blocks = marked
    .replace(/<\/(p|div|section|article|blockquote|figure|table|tr|ul|ol|dl)\s*>/gi, "\n\n")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .split(/\n[ \t]*\n/);

  const sections: DocSection[] = [];
  const checklist: DocCheckItem[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const marker = /^\u0000H(\d)\u0000([\s\S]*)$/.exec(trimmed);
    if (marker) {
      const level = Number(marker[1]);
      const value = marker[2].trim();
      if (level === 1 && !title) title = value;
      else if (value) sections.push({ heading: value, text: "" });
      continue;
    }

    const clean = sanitizeInline(trimmed);
    if (clean) sections.push({ text: clean });
  }

  return { title: title ?? headTitle, sections, checklist };
}

/** Texto puro (.txt/.log/.csv): parágrafos separados por linha em branco. */
export function parsePlainText(raw: string): ParsedDoc {
  const blocks = raw.replace(/\r\n?/g, "\n").split(/\n[ \t]*\n/);
  const sections: DocSection[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    sections.push({
      text: trimmed
        .split("\n")
        .map((line) => escapeHtml(line))
        .join("<br>"),
    });
  }
  return { sections, checklist: [] };
}

/** Nome do arquivo vira título quando o conteúdo não tem título próprio. */
function titleFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  const clean = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return clean || "Documento importado";
}

/** Converte o texto de um arquivo em documento do workspace. */
export function buildDocFromText(
  raw: string,
  fileName: string,
  author: string
): WorkspaceDoc {
  if (!raw.trim()) throw new Error("O arquivo está vazio.");
  const ext = supportedExtension(fileName) ?? "";
  const parsed =
    ext === ".html" || ext === ".htm" || ext === ".doc"
      ? parseHtml(raw)
      : ext === ".md" || ext === ".markdown"
        ? parseMarkdown(raw)
        : parsePlainText(raw);

  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  return {
    id: `doc-imp-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    kind: "nota",
    title: parsed.title?.trim() || titleFromFilename(fileName),
    dateLabel: "Agora",
    author,
    editedLabel: `Importado agora às ${hh}:${mm}`,
    sections: parsed.sections.length > 0 ? parsed.sections : [{ text: "" }],
    ...(parsed.checklist.length > 0 ? { checklist: parsed.checklist } : {}),
  };
}

/** Lê um arquivo do seletor/arraste e devolve o documento importado. */
export async function importFile(
  file: File,
  author: string
): Promise<WorkspaceDoc> {
  if (!supportedExtension(file.name)) throw new Error(unsupportedMessage(file.name));
  const raw = await file.text();
  return buildDocFromText(raw, file.name, author);
}
