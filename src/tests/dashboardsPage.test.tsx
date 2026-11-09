import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { NotesProvider } from "../features/notes";
import { LabProvider, DashboardsPageView } from "../features/dashboards";

/**
 * Cobertura da janela de Dashboards (DashboardsPageView), que não tinha
 * nenhum teste: cards, vínculo/desvínculo de notas, criação, renomeação e
 * exclusão com confirmação, nos escopos de espaço de trabalho e de projeto.
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

/** Sobe do título do card até o <article> que o contém. */
function cardOf(name: string): HTMLElement {
  const card = screen.getByText(name).closest("article");
  if (!card) throw new Error(`card "${name}" não encontrado`);
  return card as HTMLElement;
}

function dashboardCardCount(): number {
  return screen.getAllByRole("article").length;
}

describe("Dashboards — lista de cards", () => {
  it("lista os 5 dashboards com contagem de notas e membros", () => {
    wrap(<DashboardsPageView />);

    expect(screen.getByRole("heading", { name: "Dashboards" })).toBeInTheDocument();
    expect(dashboardCardCount()).toBe(5);

    const experimento = cardOf("Experimento A — Coleta");
    expect(within(experimento).getByText("1 notas")).toBeInTheDocument();
    expect(within(experimento).getByText("Ana Costa · Administrador")).toBeInTheDocument();
    expect(within(experimento).getByText("Bruno Lima · Editor")).toBeInTheDocument();
    // Nota com prazo vencido e status não concluído → selo de atraso.
    expect(within(experimento).getByText("1 atrasada")).toBeInTheDocument();

    const analises = cardOf("Análises e Relatórios");
    expect(within(analises).getByText("Carla Dias · Visualizador")).toBeInTheDocument();

    // Dashboard sem membros convidados.
    const lancamento = cardOf("Q3 Product Launch");
    expect(within(lancamento).getByText("Sem membros ainda")).toBeInTheDocument();
    expect(within(lancamento).getByText("0 notas")).toBeInTheDocument();

    // Nota sem dashboard é sinalizada no rodapé do escopo de trabalho.
    expect(
      screen.getByText(/1 anotação fora de qualquer dashboard/)
    ).toBeInTheDocument();
  });

  it("abre o card, vincula uma nota e remove o vínculo", async () => {
    const user = userEvent.setup();
    wrap(<DashboardsPageView />);

    // No escopo de trabalho o card começa fechado: "Ver detalhes".
    await user.click(screen.getByRole("button", { name: /Experimento A — Coleta/ }));

    const card = cardOf("Experimento A — Coleta");
    const seletor = within(card).getByRole("combobox", {
      name: "Adicionar anotação ao dashboard",
    });
    await user.selectOptions(seletor, screen.getByRole("option", { name: "Pedir reposição de reagentes" }));

    expect(within(card).getByText("2 notas")).toBeInTheDocument();
    expect(within(card).getByText("Pedir reposição de reagentes")).toBeInTheDocument();
    // A nota deixou de estar "fora de qualquer dashboard".
    expect(screen.queryByText(/fora de qualquer dashboard/)).not.toBeInTheDocument();

    const linha = within(card)
      .getByText("Pedir reposição de reagentes")
      .closest("li") as HTMLElement;
    await user.click(within(linha).getByRole("button", { name: "remover" }));

    expect(within(card).getByText("1 notas")).toBeInTheDocument();
    // A nota volta para a lista de disponíveis (select) do dashboard.
    const linhas = within(card).queryAllByRole("listitem");
    expect(linhas.some((li) => li.textContent?.includes("Pedir reposição"))).toBe(false);
  });

  it("cria um dashboard novo e exige o nome", async () => {
    const user = userEvent.setup();
    wrap(<DashboardsPageView />);

    await user.click(screen.getByRole("button", { name: "Novo dashboard" }));
    expect(screen.getByText("Novo dashboard", { selector: "h2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar" }));
    expect(screen.getByText("O nome é obrigatório.")).toBeInTheDocument();
    expect(dashboardCardCount()).toBe(5);

    const nome = screen.getByPlaceholderText("Ex: Experimento B — Testes");
    await user.type(nome, "Experimento C — Validação");
    await user.type(
      screen.getByPlaceholderText("Do que se trata este agrupamento?"),
      "Rodada de validação do método."
    );
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(dashboardCardCount()).toBe(6);
    const criado = cardOf("Experimento C — Validação");
    expect(
      within(criado).getByText("Rodada de validação do método.")
    ).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Ex: Experimento B — Testes")
    ).not.toBeInTheDocument();
  });

  it("renomeia e exclui um dashboard com confirmação", async () => {
    const user = userEvent.setup();
    wrap(<DashboardsPageView projectId="dash-seed-2" />);

    // No escopo de projeto o card já vem aberto.
    const card = cardOf("Análises e Relatórios");
    await user.click(within(card).getByRole("button", { name: "Renomear" }));

    expect(screen.getByText("Renomear dashboard", { selector: "h2" })).toBeInTheDocument();
    const nome = screen.getByPlaceholderText("Ex: Experimento B — Testes");
    await user.clear(nome);
    await user.type(nome, "Análises 2027");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("Análises 2027")).toBeInTheDocument();

    const renomeado = cardOf("Análises 2027");
    await user.click(within(renomeado).getByRole("button", { name: "Excluir" }));

    const dialog = screen.getByRole("dialog", { name: "Excluir dashboard?" });
    expect(dialog.textContent).toContain("Análises 2027");
    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      screen.getByText("Nenhum dashboard ainda. Crie o primeiro para organizar suas notas.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Análises 2027")).not.toBeInTheDocument();
  });

  it("cancelar a exclusão mantém o dashboard", async () => {
    const user = userEvent.setup();
    wrap(<DashboardsPageView projectId="dash-design" />);

    const card = cardOf("Design System 2.0");
    await user.click(within(card).getByRole("button", { name: "Excluir" }));
    const dialog = screen.getByRole("dialog", { name: "Excluir dashboard?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Design System 2.0")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Dashboards — escopo de projeto", () => {
  it("mostra apenas o dashboard do projeto e esconde a criação", () => {
    wrap(<DashboardsPageView projectId="dash-q3" />);

    expect(dashboardCardCount()).toBe(1);
    expect(
      screen.getByText(/Dashboard do projeto “Q3 Product Launch”/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Novo dashboard" })
    ).not.toBeInTheDocument();
    // Sempre aberto e sem notas vinculadas.
    expect(screen.getByText("0 notas")).toBeInTheDocument();
    expect(
      screen.queryByText(/fora de qualquer dashboard/)
    ).not.toBeInTheDocument();
  });
});
