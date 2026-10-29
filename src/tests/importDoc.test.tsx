import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { DocumentsPageView } from "../features/documents";
import {
  buildDocFromText,
  parseHtml,
  parseMarkdown,
  supportedExtension,
  unsupportedMessage,
} from "../features/documents/import";

/**
 * Importação de documentos — o usuário busca um arquivo na máquina (botão
 * "Importar") ou arrasta e solta sobre a página, e o conteúdo vira um
 * documento do workspace com título, seções e checklist.
 */

describe("parseMarkdown (.md)", () => {
  it("separa título, seções, listas e checklist", () => {
    const md = [
      "# Plano da Sprint 5",
      "",
      "Intro com **negrito** e [link](https://unicap.br/site).",
      "",
      "## Tarefas",
      "- item um",
      "- item dois",
      "",
      "## Checklist",
      "- [x] revisar contrato",
      "- [ ] testar fluxo",
    ].join("\n");

    const parsed = parseMarkdown(md);

    expect(parsed.title).toBe("Plano da Sprint 5");
    expect(parsed.sections[0].text).toContain("<b>negrito</b>");
    expect(parsed.sections[0].text).toContain(
      '<a href="https://unicap.br/site">link</a>'
    );
    expect(
      parsed.sections.some(
        (s) => s.heading === "Tarefas" && s.text.includes("<li>item um</li>")
      )
    ).toBe(true);
    expect(parsed.checklist).toEqual([
      { label: "revisar contrato", checked: true },
      { label: "testar fluxo", checked: false },
    ]);
  });

  it("não vira âncora quando o link é inseguro", () => {
    const parsed = parseMarkdown("[clique aqui](javascript:alert(1))");
    const text = parsed.sections.map((s) => s.text).join(" ");
    expect(text).not.toContain("<a");
    expect(text).toContain("clique aqui");
  });
});

describe("parseHtml (.html/.doc)", () => {
  const html = `<html><head><title>Doc antigo</title></head><body>
    <h1>Relatório do Lab</h1>
    <p>Texto com <b>negrito</b>, <span>tag removida</span> e
      <a href="https://unicap.br">link</a> além de
      <a href="javascript:alert(1)">link quebrado</a>.</p>
    <script>alert('x')</script>
    <h2>Próximos passos</h2>
    <ul><li>primeiro</li><li>segundo</li></ul>
  </body></html>`;

  it("prefere o h1 como título e transforma h2 em cabeçalho de seção", () => {
    const parsed = parseHtml(html);

    expect(parsed.title).toBe("Relatório do Lab");
    expect(parsed.sections.some((s) => s.heading === "Próximos passos")).toBe(
      true
    );
  });

  it("mantém a formatação permitida e remove scripts, tags e links inseguros", () => {
    const parsed = parseHtml(html);
    const body = parsed.sections.map((s) => s.text).join(" ");

    expect(body).toContain("<b>negrito</b>");
    expect(body).toContain('<a href="https://unicap.br">link</a>');
    expect(body).toContain("<li>primeiro</li>");
    expect(body).not.toContain("<span>");
    expect(body).not.toContain("alert");
    expect(body).not.toContain("javascript:");
  });
});

describe("buildDocFromText", () => {
  it("usa o nome do arquivo quando o conteúdo não tem título", () => {
    const doc = buildDocFromText(
      "Primeiro parágrafo.\n\nSegundo parágrafo.",
      "notas da reuniao.txt",
      "Ana Costa"
    );

    expect(doc.title).toBe("notas da reuniao");
    expect(doc.author).toBe("Ana Costa");
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].text).toBe("Primeiro parágrafo.");
    expect(doc.editedLabel).toContain("Importado agora");
  });

  it("recusa arquivo vazio com mensagem clara", () => {
    expect(() => buildDocFromText("   \n  ", "vazio.md", "Ana")).toThrow(
      /vazio/
    );
  });

  it("sabe quais extensões aceita e explica as recusadas", () => {
    expect(supportedExtension("plano.md")).toBe(".md");
    expect(supportedExtension("PLANO.MD")).toBe(".md");
    expect(supportedExtension("relatorio.docx")).toBeNull();
    expect(supportedExtension("sem-extensao")).toBeNull();

    const message = unsupportedMessage("relatorio.docx");
    expect(message).toContain(".docx");
    expect(message).toContain(".md");
  });
});

describe("Tela Minhas Anotações — importar arquivo", () => {
  it("traz um arquivo da máquina pelo seletor e abre o documento", async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <DocumentsPageView />
        </ToastProvider>
      </MemoryRouter>
    );

    const file = new File(
      ["# Guia de coleta\n\nPasso a passo do experimento A."],
      "guia.md",
      { type: "text/markdown" }
    );
    const input = screen.getByLabelText(
      "Importar arquivo do computador"
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() =>
      expect(
        screen.getAllByText("Guia de coleta").length
      ).toBeGreaterThan(0)
    );
    expect(screen.getByText(/importado de guia\.md/)).toBeInTheDocument();
  });

  it("avisa quando o formato do arquivo não pode ser lido", async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <DocumentsPageView />
        </ToastProvider>
      </MemoryRouter>
    );

    const file = new File(["binário"], "contrato.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    fireEvent.change(
      screen.getByLabelText("Importar arquivo do computador"),
      { target: { files: [file] } }
    );

    await waitFor(() =>
      expect(screen.getByText(/Não foi possível ler \.docx/)).toBeInTheDocument()
    );
  });
});
