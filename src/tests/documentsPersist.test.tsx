import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "../shared/components/Toast";
import { DocumentsPageView } from "../features/documents";
import { TrashProvider, TrashPageView } from "../features/trash";

/**
 * "Minhas Anotações" — persistência ao trocar de janela e renomear o título
 * dentro da própria janela em que a anotação é escrita.
 */

function renderDocs() {
  return render(
    <ToastProvider>
      <TrashProvider>
        <DocumentsPageView />
      </TrashProvider>
    </ToastProvider>
  );
}

/** Minhas Anotações + Lixeira no mesmo provider: exclusão move entre as telas. */
function renderDocsWithTrash() {
  return render(
    <ToastProvider>
      <TrashProvider>
        <DocumentsPageView />
        <TrashPageView />
      </TrashProvider>
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

  it("exclui a anotação selecionada, libera espaço na lista e envia para a Lixeira", async () => {
    const user = userEvent.setup();
    renderDocsWithTrash();

    const recentes = screen.getByText("Documentos Recentes").closest("aside")!;
    expect(within(recentes).getAllByRole("listitem")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    const dialog = screen.getByRole("dialog", { name: "Excluir anotação?" });
    await user.click(
      within(dialog).getByRole("button", { name: "Mover para a Lixeira" })
    );

    // Saiu de Minhas Anotações e o espaço foi liberado na lista.
    expect(within(recentes).getAllByRole("listitem")).toHaveLength(3);
    expect(
      screen.queryByRole("heading", {
        name: "PRD - Integração do Sistema Acadêmico UNICAP",
        level: 2,
      })
    ).not.toBeInTheDocument();
    // A próxima anotação passa a ficar aberta.
    expect(
      screen.getByRole("heading", { name: "Ata Sprint Planning 42", level: 2 })
    ).toBeInTheDocument();

    // E aparece na Lixeira, pronta para exclusão definitiva.
    const lixeira = screen.getByRole("heading", { name: "Lixeira" }).parentElement!
      .parentElement!;
    expect(
      within(lixeira).getByText("PRD - Integração do Sistema Acadêmico UNICAP")
    ).toBeInTheDocument();
    expect(screen.getByText(/movida para a Lixeira/)).toBeInTheDocument();
  });

  it("Restaurar na Lixeira devolve a anotação para Minhas Anotações", async () => {
    const user = userEvent.setup();
    const first = renderDocsWithTrash();
    const title = "PRD - Integração do Sistema Acadêmico UNICAP";

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    await user.click(screen.getByRole("button", { name: "Mover para a Lixeira" }));

    // O botão Restaurar da Lixeira devolve a anotação à origem.
    const linha = within(screen.getByText("Lixeira").parentElement!.parentElement!).getByText(title).closest("li")!;
    await user.click(within(linha).getByRole("button", { name: "Restaurar" }));

    expect(within(linha).queryByText(title)).not.toBeInTheDocument();
    expect(screen.getByText(/devolvida para Minhas Anotações/)).toBeInTheDocument();

    // Ao reabrir a janela, a anotação voltou na posição original e selecionada.
    first.unmount();
    renderDocs();
    const recentes = screen.getByText("Documentos Recentes").closest("aside")!;
    expect(within(recentes).getAllByRole("listitem")).toHaveLength(4);
    expect(
      screen.getByRole("heading", { name: title, level: 2 })
    ).toBeInTheDocument();
  });

  it("cancelar a confirmação mantém a anotação", async () => {
    const user = userEvent.setup();
    renderDocsWithTrash();

    await user.click(screen.getByRole("button", { name: "Excluir documento" }));
    const dialog = screen.getByRole("dialog", { name: "Excluir anotação?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "PRD - Integração do Sistema Acadêmico UNICAP",
        level: 2,
      })
    ).toBeInTheDocument();
  });

  it("excluir todas as anotações deixa a tela vazia e isso persiste", async () => {
    const user = userEvent.setup();
    const first = renderDocs();

    const total = 4;
    for (let i = 0; i < total; i++) {
      await user.click(screen.getByRole("button", { name: "Excluir documento" }));
      await user.click(screen.getByRole("button", { name: "Mover para a Lixeira" }));
    }

    expect(screen.getByText("Nenhum documento selecionado.")).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma anotação. Crie uma nova ou importe um arquivo.")
    ).toBeInTheDocument();

    // Remontar não devolve as anotações de exemplo excluídas.
    first.unmount();
    renderDocs();
    expect(
      screen.getByText("Nenhuma anotação. Crie uma nova ou importe um arquivo.")
    ).toBeInTheDocument();
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
