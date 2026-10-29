import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../app/App";

/**
 * Navegação do shell — a sidebar é dirigida por PROJETOS: cada projeto
 * expande e revela as seções principais dentro dele, todas sob
 * /app/p/:projectId/*. O antigo grupo "Principal" separado não existe mais.
 *
 * O teste monta o App real (rotas + auth local) e percorre as 6 seções
 * dentro do projeto padrão (Q3 Product Launch).
 */

const PROJECT_ID = "dash-q3";

const SIDEBAR_CASES: Array<{ label: string; href: string; heading: string }> = [
  { label: "Quadro de Notas", href: `/app/p/${PROJECT_ID}/notes`, heading: "Kanban" },
  { label: "Minhas Anotações", href: `/app/p/${PROJECT_ID}/documents`, heading: "Minhas Anotações" },
  { label: "Equipe & Parceiros", href: `/app/p/${PROJECT_ID}/team`, heading: "Equipe & Parceiros" },
  { label: "Templates", href: `/app/p/${PROJECT_ID}/templates`, heading: "Templates" },
  { label: "Lixeira", href: `/app/p/${PROJECT_ID}/trash`, heading: "Lixeira" },
  { label: "Visão geral", href: `/app/p/${PROJECT_ID}`, heading: "Visão geral" },
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

  it("a sidebar lista projetos com as seções principais aninhadas dentro", async () => {
    await openAppAt("/app");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });

    // Projeto é um link de primeira classe em /app/p/:id.
    const project = screen.getByRole("link", { name: "Q3 Product Launch" });
    expect(project).toHaveAttribute("href", `/app/p/${PROJECT_ID}`);

    // Cada seção principal vive DENTRO do projeto, não num grupo separado.
    for (const c of SIDEBAR_CASES) {
      const link = screen.getByRole("link", { name: c.label });
      expect(link.getAttribute("href")).toBe(c.href);
      expect(link.getAttribute("href")).toMatch(
        new RegExp(`^/app/p/${PROJECT_ID}`)
      );
    }

    // O rótulo do antigo grupo "Principal" separado não existe mais.
    expect(screen.queryByText("Principal")).not.toBeInTheDocument();
  });

  it("\"Projetos ativos\" abre a página com todos os projetos em retângulos clicáveis", async () => {
    const user = await openAppAt("/app");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });

    await user.click(screen.getByRole("link", { name: "Projetos ativos" }));
    await screen.findByRole("heading", { name: "Projetos ativos", level: 1 });
    expect(window.location.pathname).toBe("/app/projects");

    // Todos os 5 projetos semente aparecem, com o nome dentro de um
    // retângulo (link) que deixa claro que o item é clicável.
    const tiles = screen.getAllByRole("link", { name: /^Abrir projeto / });
    expect(tiles).toHaveLength(5);
    expect(tiles[0]).toHaveAttribute("href", `/app/p/${PROJECT_ID}`);
    expect(tiles[0].className).toContain("rounded-lg");
  });

  it("cada seção do projeto leva para a página respectiva", async () => {
    const user = await openAppAt("/app");
    await screen.findByRole("heading", { name: "Visão geral", level: 1 });

    for (const c of SIDEBAR_CASES) {
      await user.click(screen.getByRole("link", { name: c.label }));
      await screen.findByRole("heading", { name: c.heading, level: 1 });
      expect(window.location.pathname).toBe(c.href);
    }
  });
});
