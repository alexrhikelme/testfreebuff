import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../shared/components/Toast";
import { DocumentsPageView } from "../features/documents";

/**
 * "Minhas Anotações" — persistência ao trocar de janela e renomear o título
 * dentro da própria janela em que a anotação é escrita.
 */

function renderDocs() {
  return render(
    <ToastProvider>
      <DocumentsPageView />
    </ToastProvider>
  );
}

describe("Minhas Anotações — persistência e título", () => {
  it("renomeia o título na janela da anotação e mantém após remontar", async () => {
    const user = userEvent.setup();
    const first = renderDocs();

    expect(
      screen.getByRole("heading", {
        name: "PRD - Integração do Sistema Acadêmico UNICAP",
        level: 2,
      })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Renomear" }));
    const input = screen.getByLabelText("Título da anotação");
    await user.clear(input);
    await user.type(input, "PRD revisado do SSO UNICAP{Enter}");

    expect(
      screen.getByRole("heading", {
        name: "PRD revisado do SSO UNICAP",
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Título atualizado.")).toBeInTheDocument();

    // Simula trocar de janela: o componente é desmontado e montado de novo.
    first.unmount();
    renderDocs();

    expect(
      screen.getByRole("heading", {
        name: "PRD revisado do SSO UNICAP",
        level: 2,
      })
    ).toBeInTheDocument();
    // A lista lateral também reflete o novo nome.
    expect(screen.getAllByText("PRD revisado do SSO UNICAP").length).toBeGreaterThan(0);
  });

  it("mantém anotação criada, checklist e seleção ao trocar de janela", async () => {
    const user = userEvent.setup();
    const first = renderDocs();

    await user.click(screen.getAllByRole("checkbox")[2]);
    await user.click(screen.getByRole("button", { name: /Nova Anotação/ }));
    expect(screen.getByRole("heading", { name: "Nova Anotação", level: 2 })).toBeInTheDocument();

    first.unmount();
    renderDocs();

    // A anotação criada continua na lista e selecionada.
    expect(screen.getByRole("heading", { name: "Nova Anotação", level: 2 })).toBeInTheDocument();
    // 4 documentos de exemplo + a anotação criada.
    const aside = screen.getByText("Documentos Recentes").closest("aside")!;
    expect(aside.querySelectorAll("li")).toHaveLength(5);
  });

  it("persiste o checklist marcado do documento de exemplo", async () => {
    const user = userEvent.setup();
    const first = renderDocs();

    const third = screen.getAllByRole("checkbox")[2];
    await user.click(third);
    expect(third).toBeChecked();

    first.unmount();
    renderDocs();

    const persisted = screen.getAllByRole("checkbox")[2];
    expect(persisted).toBeChecked();
    expect(
      screen.getByText("Implementar rate limiting de 100 req/min por estudante").className
    ).toContain("line-through");
  });
});
