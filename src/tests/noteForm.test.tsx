import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { NotesProvider, NotesPageView } from "../features/notes";
import { LabProvider } from "../features/dashboards";

/**
 * Cobertura do formulário de nota (NoteFormModal), dos cards do Kanban
 * (NoteCard/DeadlineBadges) e da visão "Lista / Tabela" (NotesListView),
 * todos sem execução nos testes anteriores.
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

async function abrirFormulario() {
  const user = userEvent.setup();
  wrap(<NotesPageView />);
  await user.click(screen.getByRole("button", { name: "Nova Anotação" }));
  const dialog = screen.getByRole("dialog", { name: "Nova anotação" });
  return { user, dialog };
}

describe("Nova anotação — formulário", () => {
  it("exige o título antes de salvar", async () => {
    const { user, dialog } = await abrirFormulario();

    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(within(dialog).getByText("O título é obrigatório.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nova anotação" })).toBeInTheDocument();
  });

  it("cria a nota com status, responsável, tags e período", async () => {
    const { user, dialog } = await abrirFormulario();

    await user.type(
      within(dialog).getByPlaceholderText("Ex: Calibrar pipetas"),
      "Validar formulário de nota"
    );
    await user.type(within(dialog).getByPlaceholderText("Quem vai fazer?"), "Ana Costa");
    await user.type(within(dialog).getByPlaceholderText("Separadas por vírgula"), "teste, formulário");

    const [status, dashboard] = within(dialog).getAllByRole("combobox");
    await user.selectOptions(status, "completed");
    await user.selectOptions(dashboard, "dash-seed-2");

    const [inicio, prazo] = Array.from(
      dialog.querySelectorAll('input[type="date"]')
    ) as HTMLInputElement[];
    fireEvent.change(inicio, { target: { value: "2026-10-01" } });
    fireEvent.change(prazo, { target: { value: "2026-10-20" } });
    expect(within(dialog).queryByText(/depois do prazo/)).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));
    expect(screen.queryByRole("dialog", { name: "Nova anotação" })).not.toBeInTheDocument();

    // A nota aparece na grade com os dados informados.
    await user.click(screen.getByRole("tab", { name: "Grade de Cards" }));
    expect(
      screen.getByRole("heading", { name: "Validar formulário de nota" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("teste").length).toBeGreaterThan(0);
    expect(screen.getAllByText("formulário").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluída").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ana Costa").length).toBeGreaterThan(0);
  });

  it("valida o período: início sem prazo e início depois do prazo", async () => {
    const { user, dialog } = await abrirFormulario();

    await user.type(
      within(dialog).getByPlaceholderText("Ex: Calibrar pipetas"),
      "Nota com período inválido"
    );
    const [inicio, prazo] = Array.from(
      dialog.querySelectorAll('input[type="date"]')
    ) as HTMLInputElement[];

    fireEvent.change(inicio, { target: { value: "2026-10-01" } });
    expect(
      within(dialog).getByText("Informe o prazo se houver data de início.")
    ).toBeInTheDocument();

    fireEvent.change(prazo, { target: { value: "2026-09-01" } });
    expect(
      within(dialog).getByText("A data de início não pode ser depois do prazo.")
    ).toBeInTheDocument();

    // Corrigir o prazo limpa o erro e permite salvar.
    fireEvent.change(prazo, { target: { value: "2026-10-30" } });
    expect(
      within(dialog).queryByText("A data de início não pode ser depois do prazo.")
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fecha com ESC e pelo botão de fechar", async () => {
    const { user } = await abrirFormulario();

    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("dialog", { name: "Nova anotação" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova Anotação" }));
    await user.click(screen.getByTitle("Fechar"));
    expect(
      screen.queryByRole("dialog", { name: "Nova anotação" })
    ).not.toBeInTheDocument();
  });
});

describe("Cards do Kanban — edição e prazos", () => {
  it("edita uma nota existente com os campos preenchidos", async () => {
    const user = userEvent.setup();
    wrap(<NotesPageView />);

    await user.click(screen.getByRole("tab", { name: "Grade de Cards" }));
    expect(
      screen.getByRole("heading", { name: "Coletar amostras do experimento A" })
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]);
    const dialog = screen.getByRole("dialog", { name: "Editar anotação" });
    const titulo = within(dialog).getByPlaceholderText(
      "Ex: Calibrar pipetas"
    ) as HTMLInputElement;
    expect(titulo.value).toBe("Coletar amostras do experimento A");

    await user.clear(titulo);
    await user.type(titulo, "Coleta revisada");
    await user.click(within(dialog).getByRole("button", { name: "Salvar" }));

    expect(screen.getByRole("heading", { name: "Coleta revisada" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Coletar amostras do experimento A" })
    ).not.toBeInTheDocument();
  });

  it("mostra o selo de atraso nos cards com prazo vencido", async () => {
    const user = userEvent.setup();
    wrap(<NotesPageView />);

    await user.click(screen.getByRole("tab", { name: "Grade de Cards" }));
    const card = screen
      .getByRole("heading", { name: "Coletar amostras do experimento A" })
      .closest("article") as HTMLElement;
    // Nota em andamento com prazo no passado → "Atrasado (dd/mm)".
    expect(within(card).getByText(/^Atrasado \(/)).toBeInTheDocument();
  });
});

describe("Visão Lista / Tabela", () => {
  it("renderiza a tabela com as notas e alterna o status inline", async () => {
    const user = userEvent.setup();
    wrap(<NotesPageView />);

    await user.click(screen.getByRole("tab", { name: "Lista / Tabela" }));

    for (const header of ["Título", "Status", "Responsável", "Período", "Tags", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    // Cabeçalho + as 3 notas de exemplo.
    expect(screen.getAllByRole("row")).toHaveLength(4);

    const linha = screen
      .getByText("Revisar resultados da análise B")
      .closest("tr") as HTMLElement;
    const seletor = within(linha).getByRole("combobox", {
      name: "Mudar status",
    }) as HTMLSelectElement;
    await user.selectOptions(seletor, "completed");
    expect(seletor.value).toBe("completed");
    expect(within(linha).getAllByText("Concluída").length).toBeGreaterThan(0);
  });

  it("exclui pela linha, mostra o toast e desfaz a exclusão", async () => {
    const user = userEvent.setup();
    wrap(<NotesPageView />);

    await user.click(screen.getByRole("tab", { name: "Lista / Tabela" }));
    const linha = screen
      .getByText("Pedir reposição de reagentes")
      .closest("tr") as HTMLElement;
    await user.click(within(linha).getByRole("button", { name: "Excluir" }));

    const dialog = screen.getByRole("dialog", { name: "Excluir anotação?" });
    expect(dialog.textContent).toContain("Pedir reposição de reagentes");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByText("Pedir reposição de reagentes")).not.toBeInTheDocument();
    expect(screen.getByText("Anotação excluída.")).toBeInTheDocument();

    // Sprint 10 (H3): desfazer recria a nota com os mesmos dados.
    await user.click(screen.getByRole("button", { name: "Desfazer" }));
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getByText("Pedir reposição de reagentes")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando a busca não encontra nada", async () => {
    const user = userEvent.setup();
    wrap(<NotesPageView />);

    await user.click(screen.getByRole("tab", { name: "Lista / Tabela" }));
    await user.type(screen.getByLabelText("Buscar cartões ou notas"), "zzz-inexistente");

    expect(
      screen.getByText("Nenhuma anotação corresponde aos filtros atuais.")
    ).toBeInTheDocument();
  });
});
