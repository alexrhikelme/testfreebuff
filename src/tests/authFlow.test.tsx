import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/App";

/**
 * Fluxo de entrada do produto: landing → autenticação → área logada.
 *
 * Cobre as três regras do roteador:
 * - a landing guia o usuário para /auth e para a demonstração (/app);
 * - rota protegida sem sessão leva a /auth e, após o login, VOLTA para o
 *   destino original (returnTo preservado);
 * - validações do formulário antes de autenticar.
 */

/** Abre o App em `pathname` (modo local, sessão deslogada). */
async function openAt(pathname: string) {
  window.history.replaceState({}, "", pathname);
  const user = userEvent.setup();
  render(<App />);
  return user;
}

function submitButton(label: "Entrar" | "Criar conta") {
  // Aba e botão de submit compartilham o rótulo: o último é o submit.
  return screen.getAllByRole("button", { name: label }).at(-1)!;
}

describe("Landing page (pública)", () => {
  it("apresenta a proposta e aponta para /auth e /app", async () => {
    await openAt("/");

    const heading = await screen.findByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(
      /Anotações, projetos e dashboards em um só lugar/
    );

    expect(
      screen.getByRole("link", { name: "Começar agora" })
    ).toHaveAttribute("href", "/auth");
    expect(
      screen.getByRole("link", { name: "Ver demonstração" })
    ).toHaveAttribute("href", "/app");
    expect(
      screen.getAllByRole("link", { name: /Entrar/ })[0]
    ).toHaveAttribute("href", "/auth");
  });

  it("mostra os diferenciais do produto", async () => {
    await openAt("/");
    expect(
      await screen.findByRole("heading", { name: "Anotações estruturadas" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Dashboards colaborativos" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Visualizações flexíveis" })
    ).toBeInTheDocument();
  });

  it("'Ver demonstração' sem sessão leva para a autenticação", async () => {
    const user = await openAt("/");

    await user.click(await screen.findByRole("link", { name: "Ver demonstração" }));

    await screen.findByRole("heading", { name: "Acesse sua conta", level: 1 });
    expect(window.location.pathname).toBe("/auth");
  });
});

describe("Rota protegida e returnTo", () => {
  it("rota profunda sem sessão cai no /auth", async () => {
    await openAt("/app/p/dash-q3/notes");

    await screen.findByRole("heading", {
      name: "Acesse sua conta",
      level: 1,
    });
    expect(window.location.pathname).toBe("/auth");
  });

  it("após o login o usuário volta para a rota que tentava abrir", async () => {
    const user = await openAt("/app/p/dash-q3/notes");
    await screen.findByRole("heading", { name: "Acesse sua conta", level: 1 });

    await user.type(
      await screen.findByPlaceholderText("ana@unicap.br"),
      "ana@lab.local"
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
    await user.click(submitButton("Entrar"));

    // O login local simula 300 ms de latência antes de navegar.
    await screen.findByRole("heading", { name: "Kanban", level: 1 }, { timeout: 3000 });
    expect(window.location.pathname).toBe("/app/p/dash-q3/notes");
  });
});

describe("Validações do formulário de acesso", () => {
  it("exige e-mail, senha e nome (criação) antes de autenticar", async () => {
    const user = await openAt("/auth");
    await screen.findByPlaceholderText("ana@unicap.br");

    // 1) sem e-mail.
    await user.click(submitButton("Entrar"));
    await screen.findByText("Informe o e-mail.");

    // 2) com e-mail, sem senha.
    await user.type(
      screen.getByPlaceholderText("ana@unicap.br"),
      "ana@lab.local"
    );
    await user.click(submitButton("Entrar"));
    await screen.findByText("Informe a senha.");

    // 3) aba Criar conta, sem nome.
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    await user.click(submitButton("Criar conta"));
    await screen.findByText("Informe seu nome.");

    // 4) senha curta na criação.
    await user.type(screen.getByPlaceholderText("Ana Costa"), "Ana Costa");
    await user.type(screen.getByPlaceholderText("••••••••"), "1234567");
    await user.click(submitButton("Criar conta"));
    await screen.findByText("A senha deve ter pelo menos 8 caracteres.");
  });

  it("mostra a dica de demonstração (dados simulados no navegador)", async () => {
    await openAt("/auth");
    expect(
      await screen.findByText(/entre com qualquer e-mail e senha/)
    ).toBeInTheDocument();
  });
});
