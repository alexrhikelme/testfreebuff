import { expect, test } from "@playwright/test";
import { entrar, PROJETO_ID } from "./apoio";

/**
 * Navegação do shell: a sidebar é dirigida por projetos e cada seção vive
 * dentro do projeto, sob /app/p/:projectId/*.
 */
const SECOES: Array<{ label: string; caminho: string; titulo: string }> = [
  { label: "Quadro de Notas", caminho: "notes", titulo: "Kanban" },
  { label: "Minhas Anotações", caminho: "documents", titulo: "Minhas Anotações" },
  { label: "Equipe & Parceiros", caminho: "team", titulo: "Equipe & Parceiros" },
  { label: "Templates", caminho: "templates", titulo: "Templates" },
  { label: "Lixeira", caminho: "trash", titulo: "Lixeira" },
  { label: "Visão geral", caminho: "", titulo: "Visão geral" },
];

test.describe("Navegação da sidebar", () => {
  test("após entrar, a Visão geral abre em /app", async ({ page }) => {
    await entrar(page, "/app");

    await expect(page.getByRole("heading", { name: "Visão geral", level: 1 })).toBeVisible();
    await expect(page).toHaveURL(/\/app$/);
  });

  test("a sidebar lista o projeto com as seções aninhadas", async ({ page }) => {
    await entrar(page, "/app");
    await expect(page.getByRole("heading", { name: "Visão geral", level: 1 })).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Q3 Product Launch", exact: true })
    ).toHaveAttribute("href", `/app/p/${PROJETO_ID}`);

    for (const secao of SECOES) {
      const href = secao.caminho
        ? `/app/p/${PROJETO_ID}/${secao.caminho}`
        : `/app/p/${PROJETO_ID}`;
      // `exact` evita casar com os atalhos do dashboard, que repetem o nome.
      await expect(
        page.getByRole("link", { name: secao.label, exact: true })
      ).toHaveAttribute("href", href);
    }
  });

  test("'Projetos ativos' abre a página com todos os projetos", async ({
    page,
  }) => {
    await entrar(page, "/app");
    await page.getByRole("link", { name: "Projetos ativos" }).click();

    await expect(
      page.getByRole("heading", { name: "Projetos ativos", level: 1 })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/app\/projects$/);

    const tiles = page.getByRole("link", { name: /^Abrir projeto / });
    await expect(tiles).toHaveCount(5);
    await expect(tiles.first()).toHaveAttribute("href", `/app/p/${PROJETO_ID}`);
  });

  test("cada seção do projeto leva para a página respectiva", async ({
    page,
  }) => {
    await entrar(page, "/app");
    await expect(page.getByRole("heading", { name: "Visão geral", level: 1 })).toBeVisible();

    for (const secao of SECOES) {
      await page.getByRole("link", { name: secao.label, exact: true }).click();
      await expect(
        page.getByRole("heading", { name: secao.titulo, level: 1 })
      ).toBeVisible();
      const esperado = secao.caminho
        ? `/app/p/${PROJETO_ID}/${secao.caminho}$`
        : `/app/p/${PROJETO_ID}$`;
      await expect(page).toHaveURL(new RegExp(esperado));
    }
  });
});
