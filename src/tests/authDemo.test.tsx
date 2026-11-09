import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/App";
import { DEMO_ACCOUNT } from "../shared/auth/localAccounts";

/**
 * Sprint 11 (P1) — Acesso com a conta de demonstração e reflexo do papel na
 * interface: admin entra com todos os registros; contas novas (viewer)
 * entram no modo leitura, espelhando as permissões do backend.
 */

async function openAt(pathname: string) {
  window.history.replaceState({}, "", pathname);
  const user = userEvent.setup();
  render(<App />);
  return user;
}

function submitButton(label: "Entrar" | "Criar conta") {
  return screen.getAllByRole("button", { name: label }).at(-1)!;
}

/** Cria uma conta viewer e conclui o login voltando para `pathname`. */
async function entrarComoViewer(pathname: string, email: string) {
  const user = await openAt(pathname);
  await screen.findByRole("heading", { name: "Acesse sua conta", level: 1 });
  await user.click(screen.getByRole("button", { name: "Criar conta" }));
  await user.type(screen.getByPlaceholderText("Ana Costa"), "Nova Pessoa");
  await user.type(screen.getByPlaceholderText("ana@unicap.br"), email);
  await user.type(screen.getByPlaceholderText("••••••••"), "Senha1234");
  await user.click(submitButton("Criar conta"));
  await screen.findByRole(
    "heading",
    { name: "Kanban", level: 1 },
    { timeout: 3000 }
  );
  return user;
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Acesso com a conta de demonstração", () => {
  it("o botão de demonstração entra direto com a conta admin", async () => {
    const user = await openAt("/auth");

    await user.click(
      screen.getByRole("button", { name: "Entrar com a conta de demonstração" })
    );

    await screen.findByRole(
      "heading",
      { name: "Visão geral", level: 1 },
      { timeout: 3000 }
    );
    expect(window.location.pathname).toBe("/app");
  });

  it("as credenciais documentadas funcionam no formulário", async () => {
    const user = await openAt("/auth");

    await user.type(
      screen.getByPlaceholderText("ana@unicap.br"),
      DEMO_ACCOUNT.email
    );
    await user.type(
      screen.getByPlaceholderText("••••••••"),
      DEMO_ACCOUNT.password
    );
    await user.click(submitButton("Entrar"));

    await screen.findByRole(
      "heading",
      { name: "Visão geral", level: 1 },
      { timeout: 3000 }
    );
  });

  it("senha errada mostra erro e mantém o usuário no /auth", async () => {
    const user = await openAt("/auth");

    await user.type(screen.getByPlaceholderText("ana@unicap.br"), DEMO_ACCOUNT.email);
    await user.type(screen.getByPlaceholderText("••••••••"), "senha-errada");
    await user.click(submitButton("Entrar"));

    expect(
      await screen.findByText("E-mail ou senha incorretos.")
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth");
  });

  it("não permite cadastrar um e-mail já registrado", async () => {
    const user = await openAt("/auth");
    await user.click(screen.getByRole("button", { name: "Criar conta" }));

    await user.type(screen.getByPlaceholderText("Ana Costa"), "Ana Duplicada");
    await user.type(
      screen.getByPlaceholderText("ana@unicap.br"),
      DEMO_ACCOUNT.email
    );
    await user.type(
      screen.getByPlaceholderText("••••••••"),
      DEMO_ACCOUNT.password
    );
    await user.click(submitButton("Criar conta"));

    expect(
      await screen.findByText("Já existe uma conta com este e-mail.")
    ).toBeInTheDocument();
  });
});

describe("Conta nova (viewer) entra em modo leitura", () => {
  it("mostra o aviso e esconde as ações de escrita nas anotações", async () => {
    // dash-seed-1 tem uma nota semeada, então há card para inspecionar.
    await entrarComoViewer("/app/p/dash-seed-1/notes", "nova@unicap.br");

    expect(screen.getByText(/Modo leitura \(viewer\)/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nova Anotação" })
    ).toBeDisabled();

    // Colunas do quadro continuam visíveis, mas sem criar/editar.
    expect(
      screen.queryByRole("button", { name: /Adicionar nota em/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova sprint" })).not.toBeInTheDocument();
  });

  it("na visão em grade, cards não têm Editar/Excluir", async () => {
    const user = await entrarComoViewer("/app/p/dash-seed-1/notes", "viewer@unicap.br");
    await user.click(screen.getByRole("tab", { name: "Grade de Cards" }));

    expect(screen.getByText("Coletar amostras do experimento A")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });
});
