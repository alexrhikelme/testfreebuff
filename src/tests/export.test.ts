import { describe, it, expect } from "vitest";
import {
  buildMarkdown,
  buildDocHtml,
  buildPdf,
  exportFilename,
} from "../features/documents/export";
import { SEED_DOCS, type WorkspaceDoc } from "../features/documents/data";

/**
 * Pente fino (item 10) — exportação de documentos para .md, .doc e .pdf,
 * gerada por funções puras (sem dependências externas).
 */

const PRD = SEED_DOCS[0];

/** Documento sintético com formatação rica, entidades e caracteres especiais. */
const RICH_DOC: WorkspaceDoc = {
  id: "doc-rich",
  kind: "nota",
  title: 'Notas <com> & "aspas"',
  dateLabel: "Hoje",
  author: "Ana Costa & Cia",
  editedLabel: "Editado hoje às 09:00",
  sections: [
    {
      text: 'Parágrafo <b>negrito</b> e <i>itálico</i> com <a href="https://unicap.br">link</a> e <span>tag removida</span>.',
    },
    {
      heading: "Seção 1",
      text: "Primeira linha<br>Segunda linha<br>• item com acentuação: ação, êxito",
    },
  ],
  checklist: [
    { label: "Item concluído & revisado", checked: true },
    { label: "Item pendente", checked: false },
  ],
};

describe("buildMarkdown (.md)", () => {
  it("gera título, autoria e seções com cabeçalhos", () => {
    const md = buildMarkdown(PRD);

    expect(md.startsWith(`# ${PRD.title}`)).toBe(true);
    expect(md).toContain(`*${PRD.author} — ${PRD.editedLabel}*`);
    expect(md).toContain("## 1. Visão Geral & Escopo");
    expect(md).toContain("## 2. Próximos Passos (Sprint 42)");
  });

  it("converte HTML simples em markdown legível", () => {
    const md = buildMarkdown(RICH_DOC);

    expect(md).toContain("**negrito**");
    expect(md).toContain("*itálico*");
    expect(md).toContain("[link](https://unicap.br)");
    expect(md).toContain("Parágrafo");
    // Tags sem formatação não devem sobrar no texto.
    expect(md).not.toContain("<span>");
    expect(md).not.toContain("<b>");
    // <br> vira quebra de linha.
    expect(md).toContain("Primeira linha\nSegunda linha");
    // Entidades HTML são decodificadas.
    expect(md).toContain('"aspas"');
  });

  it("renderiza a checklist com [x] e [ ]", () => {
    const md = buildMarkdown(RICH_DOC);

    expect(md).toContain("## Checklist");
    expect(md).toContain("- [x] Item concluído & revisado");
    expect(md).toContain("- [ ] Item pendente");
  });

  it("omite a seção Checklist quando não existe", () => {
    const semChecklist: WorkspaceDoc = { ...PRD, checklist: undefined };
    expect(buildMarkdown(semChecklist)).not.toContain("## Checklist");
  });
});

describe("buildDocHtml (.doc compatível com Word)", () => {
  it("declara os namespaces do Office e o título escapado", () => {
    const html = buildDocHtml(RICH_DOC);

    expect(html).toContain("urn:schemas-microsoft-com:office:word");
    expect(html).toContain("<title>Notas &lt;com&gt; &amp; &quot;aspas&quot;</title>");
    expect(html).toContain("<h1>Notas &lt;com&gt; &amp; &quot;aspas&quot;</h1>");
  });

  it("escapa o cabeçalho de autoria", () => {
    const html = buildDocHtml(RICH_DOC);
    expect(html).toContain("<i>Ana Costa &amp; Cia — Editado hoje às 09:00</i>");
  });

  it("preserva formatação permitida e remove tags desconhecidas", () => {
    const html = buildDocHtml(RICH_DOC);

    expect(html).toContain("<b>negrito</b>");
    expect(html).toContain('<a href="https://unicap.br">link</a>');
    expect(html).not.toContain("<span>");
    expect(html).not.toContain("tag removida</span>");
  });

  it("gera a checklist como itens de lista", () => {
    const html = buildDocHtml(RICH_DOC);
    expect(html).toContain("<h2>Checklist</h2><ul>");
    expect(html).toContain("<li>[x] Item concluído &amp; revisado</li>");
    expect(html).toContain("<li>[ ] Item pendente</li>");
  });
});

describe("buildPdf (PDF 1.4 mínimo)", () => {
  it("abre com o cabeçalho e fecha com %%EOF", () => {
    const pdf = buildPdf(PRD);
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  it("monta catálogo, páginas, fontes Helvetica e trailer", () => {
    const pdf = buildPdf(PRD);

    expect(pdf).toContain("<< /Type /Catalog /Pages 2 0 R >>");
    expect(pdf).toContain("/BaseFont /Helvetica /Encoding /WinAnsiEncoding");
    expect(pdf).toContain("/BaseFont /Helvetica-Bold");
    expect(pdf).toContain("/MediaBox [0 0 595 842]");
    expect(pdf).toContain("trailer");
    expect(pdf).toContain("/Root 1 0 R");
    expect(pdf).toContain("startxref");
  });

  it("offsets da xref apontam exatamente para o início de cada objeto", () => {
    const pdf = buildPdf(PRD);
    const xrefIndex = pdf.indexOf("xref\n");
    expect(xrefIndex).toBeGreaterThan(-1);

    const entries = pdf.slice(xrefIndex).split("\n");
    const size = Number(entries[1].split(" ")[1]); // "0 N"
    expect(size).toBeGreaterThan(5);

    // Primeira linha é a entrada fantasma (0000000000 65535 f).
    for (let i = 1; i < size; i++) {
      const line = entries[2 + i];
      expect(line).toMatch(/^\d{10} \d{5} n $/);
      const offset = Number(line.slice(0, 10));
      expect(pdf.slice(offset).startsWith(`${i} 0 obj`)).toBe(true);
    }
  });

  it("pagina automaticamente documentos longos", () => {
    const longo: WorkspaceDoc = {
      ...PRD,
      sections: Array.from({ length: 30 }, (_, i) => ({
        heading: `Seção ${i + 1}`,
        text: `Conteúdo repetido da seção ${i + 1} para forçar mais de uma página no arquivo PDF gerado.`,
      })),
    };

    const pdf = buildPdf(longo);
    const count = Number(pdf.match(/\/Count (\d+)/)?.[1] ?? 0);
    expect(count).toBeGreaterThan(1);
    // Cada página tem par de objetos (página + conteúdo) além dos 4 iniciais.
    expect(pdf.match(/<< \/Type \/Page /g)).toHaveLength(count);
    // xref continua consistente com o novo tamanho.
    const size = Number(pdf.split("xref\n")[1].split("\n")[0].split(" ")[1]);
    expect(size).toBe(4 + count * 2 + 1);
  });

  it("escapa parênteses e converte texto fora do Latin-1 em ?", () => {
    const tricky: WorkspaceDoc = {
      ...PRD,
      sections: [{ text: "Função (v1) e símbolo ★ no texto" }],
    };

    const pdf = buildPdf(tricky);
    const streams = pdf.split("stream\n").slice(1).join("\n");

    expect(streams).toContain("\\(v1\\)");
    expect(streams).not.toContain("★");
    expect(streams).toContain("?");
    // Todo o arquivo é Latin-1: nenhum código acima de 255.
    for (const ch of pdf) {
      expect(ch.charCodeAt(0)).toBeLessThanOrEqual(255);
    }
  });
});

describe("exportFilename (nome seguro do arquivo)", () => {
  it("remove acentos, espaços e símbolos", () => {
    expect(exportFilename("Diretrizes de Marca Combogó!", "md")).toBe(
      "diretrizes-de-marca-combogo.md"
    );
  });

  it("colapsa separadores repetidos e remove extremidades", () => {
    expect(exportFilename("  ///  Ata   da   Reunião  /// ", "doc")).toBe(
      "ata-da-reuniao.doc"
    );
  });

  it("usa 'documento' quando nada sobra do título", () => {
    expect(exportFilename("###", "pdf")).toBe("documento.pdf");
  });

  it("limita o nome a 60 caracteres", () => {
    const nome = exportFilename("a".repeat(200), "md");
    expect(nome).toBe(`${"a".repeat(60)}.md`);
  });
});
