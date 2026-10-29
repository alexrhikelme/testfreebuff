import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { NotesProvider, useNotes, NotesBoardView } from "../features/notes";
import { LabProvider } from "../features/dashboards";
import { NotificationsBell } from "../features/notes/NotificationsBell";
import { DocumentsPageView } from "../features/documents";

/**
 * Pente fino — itens 7, 8 e 3/10:
 * - sino de notificações com janelinha de eventos recentes;
 * - colunas do Kanban com títulos "Sprint 1…4" editáveis;
 * - Minhas Anotações editáveis com toolbar rica + exportação md/doc/pdf.
 */

function wrap(ui: ReactNode) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <NotesProvider>
          <LabProvider>{ui}</LabProvider>
        </NotesProvider>
      </ToastProvider>
    </MemoryRouter>
  );
}

/** Cria uma nota para gerar atividade e expõe o sino. */
function BellHarness() {
  const { createNote } = useNotes();
  return (
    <>
      <button type="button" onClick={() => createNote({ title: "Nota da notificação" })}>
        criar
      </button>
      <NotificationsBell />
    </>
  );
}

describe("Notificações — janelinha de eventos recentes (item 7)", () => {
  it("abre a janela com a atividade recente e fecha com ESC", async () => {
    const user = userEvent.setup();
    wrap(<BellHarness />);

    // Sem eventos: estado vazio explicativo.
    await user.click(screen.getByRole("button", { name: "Notificações" }));
    expect(screen.getByRole("dialog", { name: "Notificações" })).toBeInTheDocument();
    expect(screen.getByText(/Nenhuma notificação ainda/)).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Notificações" })).not.toBeInTheDocument();

    // Gera atividade (criação de nota) e reabre: o evento aparece.
    await user.click(screen.getByRole("button", { name: "criar" }));
    await user.click(screen.getByRole("button", { name: "Notificações" }));
    const dialog = screen.getByRole("dialog", { name: "Notificações" });
    expect(dialog.textContent).toContain("criou");
    expect(dialog.textContent).toContain("Nota da notificação");
  });

  it("fecha ao clicar fora da janela", async () => {
    const user = userEvent.setup();
    wrap(<BellHarness />);
    await user.click(screen.getByRole("button", { name: "Notificações" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
});

describe("Kanban — títulos Sprint e renomeação (item 8)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  function renderBoard() {
    return wrap(
      <NotesBoardView notes={[]} onEdit={() => {}} onDelete={() => {}} />
    );
  }

  it("as colunas começam como Sprint 1…4 (não mais “Não iniciada” etc.)", () => {
    renderBoard();
    for (const title of ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]) {
      expect(
        screen.getByRole("button", { name: new RegExp(`^${title}`) })
      ).toBeInTheDocument();
    }
    expect(screen.queryByText("Não iniciada")).not.toBeInTheDocument();
    expect(screen.queryByText("Em andamento")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Coluna Sprint 1" })).toBeDefined();
  });

  it("renomeia a coluna pelo título e persiste no localStorage", async () => {
    const user = userEvent.setup();
    renderBoard();

    await user.click(screen.getByRole("button", { name: /^Sprint 1/ }));
    const input = screen.getByLabelText("Renomear coluna Sprint 1");
    await user.clear(input);
    await user.type(input, "Planejamento{Enter}");

    expect(screen.getByRole("button", { name: /^Planejamento/ })).toBeInTheDocument();
    const saved = JSON.parse(
      window.localStorage.getItem("kanban-column-titles") ?? "{}"
    );
    expect(saved.not_started).toBe("Planejamento");
  });
});

describe("Minhas Anotações — edição rica e exportação (itens 3 e 10)", () => {
  const origCreate = URL.createObjectURL;
  const origRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    // jsdom não implementa blobs: mockamos a criação da URL.
    URL.createObjectURL = vi.fn(() => "blob:export-test");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    URL.createObjectURL = origCreate;
    URL.revokeObjectURL = origRevoke;
    vi.restoreAllMocks();
  });

  it("a seção do documento é editável com toolbar de formatação", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <DocumentsPageView />
        </ToastProvider>
      </MemoryRouter>
    );

    // Clique na descrição abre o editor (toolbar presente).
    await user.click(screen.getAllByTitle("Clique para editar a anotação")[0]);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    for (const name of ["Negrito", "Itálico", "Sublinhado", "Riscado"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    // Simula conteúdo formatado e salva.
    const box = screen.getByRole("textbox");
    box.innerHTML = "<b>parágrafo reformulado</b>";
    fireEvent.input(box);
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(screen.getByText("parágrafo reformulado").tagName).toBe("B");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/Anotação salva/)).toBeInTheDocument();
  });

  it("menu Exportar oferece Markdown, Word e PDF e exporta com toast", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <DocumentsPageView />
        </ToastProvider>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Exportar/ }));
    const menu = screen.getByRole("menu", { name: "Formatos de exportação" });
    for (const fmt of ["Markdown (.md)", "Word (.doc)", "PDF (.pdf)"]) {
      expect(within(menu).getByRole("menuitem", { name: fmt })).toBeInTheDocument();
    }

    await user.click(within(menu).getByRole("menuitem", { name: "Markdown (.md)" }));
    expect(screen.getByText(/exportado \(\.md\)/)).toBeInTheDocument();
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    // O menu fecha após exportar.
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
