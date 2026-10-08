import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../shared/components/Toast";
import { TrashProvider, TrashPageView } from "../features/trash";
import { TemplatesPageView } from "../features/templates";
import { DocumentsPageView } from "../features/documents";
import { NotesProvider } from "../features/notes";
import { LabProvider, TeamPageView } from "../features/dashboards";
import DashboardOverviewPage from "../app/pages/DashboardOverviewPage";

/**
 * Sprint 11 — testes direcionados das 4 janelas novas (Equipe & Parceiros,
 * Lixeira, Templates, Minhas Anotações) e dos atalhos do dashboard.
 */

describe("Lixeira (janela)", () => {
  function renderTrash() {
    return render(
      <ToastProvider>
        <TrashProvider>
          <TrashPageView />
        </TrashProvider>
      </ToastProvider>
    );
  }

  it("renderiza contagens e os 6 itens excluídos", () => {
    renderTrash();
    expect(
      screen.getByRole("heading", { name: "Lixeira" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Todos/ }).textContent).toContain("6");
    expect(screen.getByRole("button", { name: /Projetos/ }).textContent).toContain("3");
    expect(screen.getByRole("button", { name: /Documentos/ }).textContent).toContain("3");
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(
      screen.getByText("App Realidade Aumentada Museu UNICAP")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Briefing Técnico - Integração SSO Unicap")
    ).toBeInTheDocument();
  });

  it("filtra por Projetos e por Documentos", async () => {
    const user = userEvent.setup();
    renderTrash();

    await user.click(screen.getByRole("button", { name: /Projetos/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.queryByText("Briefing Técnico - Integração SSO Unicap")
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Documentos/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.queryByText("App Realidade Aumentada Museu UNICAP")
    ).not.toBeInTheDocument();
  });

  it("busca por título na lixeira", async () => {
    const user = userEvent.setup();
    renderTrash();

    await user.type(screen.getByLabelText("Buscar na lixeira"), "hackathon");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(
      screen.getByText("Portal de Inscrições Hackathon 2024")
    ).toBeInTheDocument();
  });

  it("restaura um item (remove da lixeira com toast)", async () => {
    const user = userEvent.setup();
    renderTrash();

    const before = screen.getAllByRole("listitem").length;
    await user.click(screen.getAllByRole("button", { name: "Restaurar" })[0]);

    expect(screen.getAllByRole("listitem")).toHaveLength(before - 1);
    expect(
      screen.queryByText("App Realidade Aumentada Museu UNICAP")
    ).not.toBeInTheDocument();
    expect(screen.getByText(/restaurado/)).toBeInTheDocument();
  });
});

describe("Templates (janela)", () => {
  function renderTemplates() {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <NotesProvider>
            <TemplatesPageView />
          </NotesProvider>
        </ToastProvider>
      </MemoryRouter>
    );
  }

  it("renderiza os 6 modelos do catálogo", () => {
    renderTemplates();
    expect(
      screen.getByRole("heading", { name: "Templates" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sprint Board Completo", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "PRD Técnico & Arquitetura", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Guia de Tokens & Componentes", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Game Design Document (GDD)", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Pesquisa & Priorização RICE", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Retrospectiva & Revisão", level: 2 })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Usar modelo/ })).toHaveLength(6);
  });

  it("filtra por categoria na aba Gestão & Scrum", async () => {
    const user = userEvent.setup();
    renderTemplates();

    await user.click(screen.getByRole("button", { name: "Gestão & Scrum" }));
    expect(
      screen.getByRole("heading", { name: "Sprint Board Completo", level: 2 })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Game Design Document (GDD)", level: 2 })
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Usar modelo/ })).toHaveLength(2);
  });

  it("busca template por texto", async () => {
    const user = userEvent.setup();
    renderTemplates();

    await user.type(screen.getByLabelText("Buscar template"), "GDD");
    expect(screen.getAllByRole("button", { name: /Usar modelo/ })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Game Design Document (GDD)", level: 2 })
    ).toBeInTheDocument();
  });

  it("“Usar modelo” cria a anotação e mostra toast", async () => {
    const user = userEvent.setup();
    renderTemplates();

    await user.click(screen.getAllByRole("button", { name: /Usar modelo/ })[0]);
    expect(screen.getByText(/aplicado/)).toBeInTheDocument();
  });
});

describe("Minhas Anotações (janela)", () => {
  function renderDocs() {
    return render(
      <ToastProvider>
        <DocumentsPageView />
      </ToastProvider>
    );
  }

  it("renderiza a lista de documentos recentes e o painel do PRD", () => {
    renderDocs();
    expect(
      screen.getByRole("heading", { name: "Minhas Anotações" })
    ).toBeInTheDocument();
    const aside = screen.getByText("Documentos Recentes").closest("aside")!;
    expect(within(aside).getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("heading", {
        name: "PRD - Integração do Sistema Acadêmico UNICAP",
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByText(/Editado ontem às 16:45/)).toBeInTheDocument();
  });

  it("checklist do PRD começa com 2 itens marcados e riscados", () => {
    renderDocs();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(4);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).not.toBeChecked();
    expect(
      screen.getByText("Homologação da conexão com LDAP Católica").className
    ).toContain("line-through");
    expect(
      screen.getByText("Implementar rate limiting de 100 req/min por estudante").className
    ).not.toContain("line-through");
  });

  it("marca e desmarca uma tarefa do checklist", async () => {
    const user = userEvent.setup();
    renderDocs();

    const third = screen.getAllByRole("checkbox")[2];
    await user.click(third);
    expect(third).toBeChecked();

    await user.click(third);
    expect(third).not.toBeChecked();
  });

  it("troca o documento selecionado na lista", async () => {
    const user = userEvent.setup();
    renderDocs();

    await user.click(screen.getByRole("button", { name: /Ata Sprint Planning 42/ }));
    expect(
      screen.getByRole("heading", { name: "Ata Sprint Planning 42", level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("compartilha o documento selecionado com toast", async () => {
    const user = userEvent.setup();
    renderDocs();

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));
    expect(screen.getByText(/compartilhado com a equipe/)).toBeInTheDocument();
  });
});

describe("Equipe & Parceiros (janela)", () => {
  function renderTeam() {
    return render(
      <ToastProvider>
        <LabProvider>
          <TeamPageView />
        </LabProvider>
      </ToastProvider>
    );
  }

  it("renderiza as 4 equipes e a tabela de membros", () => {
    renderTeam();
    expect(
      screen.getByRole("heading", { name: "Equipe & Parceiros" })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /membros/ })).toHaveLength(4);
    expect(screen.getByText("Beatriz Albuquerque")).toBeInTheDocument();
    expect(screen.getByText("Rodrigo Mendes da Fonte")).toBeInTheDocument();
    // Membro real vindo do LabProvider aparece mesclado na tabela:
    expect(screen.getByText("Ana Costa")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Convidar Membro" })
    ).toBeInTheDocument();
  });

  it("busca por nome ou e-mail", async () => {
    const user = userEvent.setup();
    renderTeam();

    await user.type(
      screen.getByLabelText("Buscar membro por nome ou e-mail"),
      "rodrigo"
    );
    expect(screen.getByText("Rodrigo Mendes da Fonte")).toBeInTheDocument();
    expect(screen.queryByText("Beatriz Albuquerque")).not.toBeInTheDocument();
    expect(screen.queryByText("Ana Costa")).not.toBeInTheDocument();
  });

  it("filtra a tabela ao clicar no card da equipe", async () => {
    const user = userEvent.setup();
    renderTeam();

    await user.click(screen.getByRole("button", { name: /Design UI\/UX/ }));
    expect(screen.getByText("Beatriz Albuquerque")).toBeInTheDocument();
    expect(screen.queryByText("Larissa Valença")).not.toBeInTheDocument();
  });
});

describe("Dashboard — atalhos para as janelas novas", () => {
  it("exibe botões de acesso rápido com as rotas corretas", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <NotesProvider>
            <LabProvider>
              <DashboardOverviewPage />
            </LabProvider>
          </NotesProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    const expected: Array<[string, string]> = [
      ["Minhas Anotações", "/app/documents"],
      ["Equipe & Parceiros", "/app/team"],
      ["Templates", "/app/templates"],
      ["Lixeira", "/app/trash"],
    ];

    for (const [label, href] of expected) {
      const link = screen.getByRole("link", { name: new RegExp(label) });
      expect(link).toHaveAttribute("href", href);
    }
  });
});
