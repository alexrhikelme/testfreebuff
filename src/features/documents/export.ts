/**
 * Pente fino (item 10) — exportação de anotações/documentos para arquivo.
 * Sem dependências externas: geradores puros de .md, .doc (HTML compatível
 * com Word) e .pdf (PDF 1.4 mínimo, Helvetica/WinAnsi, multi-página).
 */
import type { WorkspaceDoc } from "./data";

/** Converte o HTML simples do conteúdo em texto/markdown legível. */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<u>(.*?)<\/u>/gi, "_$1_")
    .replace(/<s>(.*?)<\/s>/gi, "~~$1~~")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Markdown (.md) — título, autor, seções e checklist. */
export function buildMarkdown(doc: WorkspaceDoc): string {
  const out: string[] = [`# ${doc.title}`, ""];
  out.push(`*${doc.author} — ${doc.editedLabel}*`, "");
  for (const s of doc.sections) {
    if (s.heading) out.push(`## ${s.heading}`);
    out.push(htmlToText(s.text), "");
  }
  if (doc.checklist?.length) {
    out.push("## Checklist", "");
    for (const item of doc.checklist) {
      out.push(`- [${item.checked ? "x" : " "}] ${item.label}`);
    }
    out.push("");
  }
  return out.join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Word (.doc) — HTML com metadados do Office (abre no Word/Writer). */
export function buildDocHtml(doc: WorkspaceDoc): string {
  const parts: string[] = [];
  parts.push(
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">'
  );
  parts.push("<head><meta charset=\"utf-8\">");
  parts.push(`<title>${escapeHtml(doc.title)}</title></head><body>`);
  parts.push(`<h1>${escapeHtml(doc.title)}</h1>`);
  parts.push(
    `<p><i>${escapeHtml(doc.author)} — ${escapeHtml(doc.editedLabel)}</i></p>`
  );
  for (const s of doc.sections) {
    if (s.heading) parts.push(`<h2>${escapeHtml(s.heading)}</h2>`);
    // Preserva a formatação rica existente (negrito, listas, links…).
    parts.push(`<p>${s.text.replace(/<(?!\/?(b|strong|i|em|u|s|strike|br|ul|ol|li|a)\b)[^>]*>/gi, "")}</p>`);
  }
  if (doc.checklist?.length) {
    parts.push("<h2>Checklist</h2><ul>");
    for (const item of doc.checklist) {
      parts.push(
        `<li>[${item.checked ? "x" : " "}] ${escapeHtml(item.label)}</li>`
      );
    }
    parts.push("</ul>");
  }
  parts.push("</body></html>");
  return parts.join("\n");
}

/* ------------------------------- PDF ---------------------------------- */

type PdfLine = { text: string; font: "F1" | "F2"; size: number; leading: number };

/** Mapeia caracteres comuns para WinAnsi (acentos portugueses caem no Latin-1). */
function toWinAnsi(text: string): string {
  const map: Record<string, string> = {
    "\u2018": "\u0091",
    "\u2019": "\u0092",
    "\u201C": "\u0093",
    "\u201D": "\u0094",
    "\u2013": "\u0096",
    "\u2014": "\u0097",
    "\u2026": "\u0085",
    "\u2022": "\u0095",
  };
  let out = "";
  for (const ch of text) {
    if (ch in map) {
      out += map[ch];
      continue;
    }
    const code = ch.charCodeAt(0);
    out += code <= 255 ? ch : "?";
  }
  return out;
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Quebra linhas por largura aproximada (chars), respeitando palavras. */
function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    let line = "";
    for (const word of raw.split(/\s+/).filter(Boolean)) {
      if (line === "") line = word;
      else if ((line + " " + word).length <= maxChars) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

function buildPdfLines(doc: WorkspaceDoc): PdfLine[] {
  const lines: PdfLine[] = [];
  lines.push({ text: doc.title, font: "F2", size: 18, leading: 26 });
  lines.push({
    text: `${doc.author} — ${doc.editedLabel}`,
    font: "F1",
    size: 10,
    leading: 18,
  });
  lines.push({ text: "", font: "F1", size: 10, leading: 10 });
  for (const s of doc.sections) {
    if (s.heading) {
      lines.push({ text: "", font: "F1", size: 10, leading: 8 });
      lines.push({ text: s.heading, font: "F2", size: 13, leading: 20 });
    }
    const text = htmlToText(s.text);
    for (const l of wrapText(text, 92)) {
      lines.push({ text: l, font: "F1", size: 11, leading: 15 });
    }
    lines.push({ text: "", font: "F1", size: 10, leading: 8 });
  }
  if (doc.checklist?.length) {
    lines.push({ text: "Checklist", font: "F2", size: 13, leading: 20 });
    for (const item of doc.checklist) {
      const mark = item.checked ? "[x]" : "[ ]";
      for (const l of wrapText(`${mark} ${item.label}`, 92)) {
        lines.push({ text: l, font: "F1", size: 11, leading: 15 });
      }
    }
  }
  return lines;
}

/**
 * PDF 1.4 mínimo e válido: catálogo, páginas, fontes Helvetica (WinAnsi),
 * streams de conteúdo com posicionamento absoluto e xref completo.
 * Todo o arquivo é montado como string Latin-1 (≤255), então o índice da
 * string é o offset em bytes — necessário para a tabela xref.
 */
export function buildPdf(doc: WorkspaceDoc): string {
  const allLines = buildPdfLines(doc);
  const TOP = 792;
  const BOTTOM = 60;

  // Paginação: desce o cursor e abre página nova ao cruzar a margem.
  type Placed = { text: string; font: string; size: number; y: number };
  const pages: Placed[][] = [];
  let current: Placed[] = [];
  let y = TOP;
  for (const line of allLines) {
    y -= line.leading;
    if (y < BOTTOM && current.length > 0) {
      pages.push(current);
      current = [];
      y = TOP - line.leading;
    }
    current.push({
      text: line.text,
      font: line.font,
      size: line.size,
      y: Math.max(y, BOTTOM),
    });
  }
  if (current.length > 0) pages.push(current);
  if (pages.length === 0) pages.push([]);

  const pageCount = pages.length;
  const firstPageObj = 5;
  // Objetos: 1 catálogo, 2 páginas, 3/4 fontes, depois (página, conteúdo).
  const objCount = 4 + pageCount * 2;

  const contentOf = (page: Placed[]): string => {
    const parts: string[] = [];
    for (const l of page) {
      if (!l.text) continue;
      parts.push(
        `BT /${l.font} ${l.size} Tf 50 ${l.y.toFixed(2)} Td (${pdfEscape(
          toWinAnsi(l.text)
        )}) Tj ET`
      );
    }
    return parts.join("\n");
  };

  const offsets: number[] = [];
  let out = "%PDF-1.4\n";

  const pushObj = (num: number, body: string) => {
    offsets[num] = out.length;
    out += `${num} 0 obj\n${body}\nendobj\n`;
  };

  pushObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  const kids = pages
    .map((_, i) => `${firstPageObj + i * 2} 0 R`)
    .join(" ");
  pushObj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);
  pushObj(
    3,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  );
  pushObj(
    4,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );

  pages.forEach((page, i) => {
    const pageNum = firstPageObj + i * 2;
    const contentNum = pageNum + 1;
    pushObj(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    const stream = contentOf(page);
    pushObj(contentNum, `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  const xrefOffset = out.length;
  out += `xref\n0 ${objCount + 1}\n`;
  out += "0000000000 65535 f \n";
  for (let i = 1; i <= objCount; i++) {
    out += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\n`;
  out += `startxref\n${xrefOffset}\n%%EOF\n`;
  return out;
}

/**
 * Baixa um arquivo gerado no cliente (Blob + clique programático).
 * PDFs são binários Latin-1 (offsets do xref dependem disso) → Uint8Array;
 * os demais são UTF-8 (HTML/Markdown com acentos).
 */
export function downloadFile(
  filename: string,
  content: string,
  mime: string,
  opts: { latin1?: boolean } = {}
): void {
  let blob: Blob;
  if (opts.latin1) {
    const bytes = new Uint8Array(content.length);
    for (let i = 0; i < content.length; i++) {
      bytes[i] = content.charCodeAt(i) & 0xff;
    }
    blob = new Blob([bytes], { type: mime });
  } else {
    blob = new Blob([content], { type: mime });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Nome de arquivo seguro a partir do título do documento. */
export function exportFilename(title: string, ext: string): string {
  const slug =
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "documento";
  return `${slug}.${ext}`;
}
