import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/App";

/**
 * Sprint 11 (correção) — navegação do shell: cada botão da sidebar do
 * canto superior esquerdo deve levar à página respectiva sob /app.
 *
 * O teste monta o App real (rotas + auth local) e percorre os 7 links.
 */

const SIDEBAR_CASES: Array<{ label: string; href: string; heading: string }> = [
  { label: "Quadro de Notas", href: "/app/notes", heading: "Anotações" },
  { label: "Dashboards", href: "/app/dashboards", heading: "Dashboards" },
  { label: "Minhas Anotações", href: "/app/documents", heading: "Minhas Anotações" },
  { label: "Equipe & Parceiros", href: "/app/team", heading: "Equipe & Parceiros" },
  { label: "Templates", href: "/app/templates", heading: "Templates" },
  { label: "Lixeira", href: "/app/trash", heading: "Lixeira" },
  { label: "Visão geral", href: "/app", heading: "Visão geral" },
];

/** Abre o App em `pathname` e conclui o login simulado do modo local. */
async function openAppAt(pathname: string) {
  window.history.replaceState({}, "", pathname);
  const user = userEvent.setup();
  render(<App />);

  const email = await screen.findByPlaceholderText("ana@unicap.br");
  await user.type(email, "ana@lab.local");
  await user.type(screen.getByPlaceholderText("••••••••"), "senha123");
  // Aba "Entrar" + botão de submit (mesmo rótulo): o último é o submit.
  const submit = screen.getAllByRole("button", { name: "Entrar" }).at(-1)!;
  await user.click(submit);
  return user;
}

describe("Navegação da sidebar do AppShellPage", () => {
  it("após entrar, a Visão geral abre em /app", async () => {
    await openAppAt("/app");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });
    expect(window.location.pathname).toBe("/app");
  });

  it("cada botão da sidebar leva para a página respectiva", async () => {
    const user = await openAppAt("/app");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });

    for (const c of SIDEBAR_CASES) {
      await user.click(screen.getByRole("link", { name: c.label }));
      await screen.findByRole("heading", { name: c.heading, level: 1 });
      expect(window.location.pathname).toBe(c.href);
    }
  });
});
