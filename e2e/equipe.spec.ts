import { expect, test } from "@playwright/test";
import { entrar, PROJETO_ID } from "./apoio";

/**
 * Equipe & Parceiros.
 *
 * O nível workspace (/app/team) mostra as 4 equipes e a tabela completa de
 * membros; dentro de um projeto a mesma tela só lista os membros daquele
 * projeto (vazio no protótipo local), exercitado no último teste.
 */
const EQUIPE = "/app/team";

test.describe("Equipe & Parceiros (workspace)", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, EQUIPE);
    await expect(
      page.getByRole("heading", { name: "Equipe & Parceiros", level: 1 })
    ).toBeVisible();
  });

  test("renderiza as 4 equipes e a tabela de membros", async ({ page }) => {
    const main = page.getByRole("main");

    await expect(main.getByRole("button", { name: /membros/ })).toHaveCount(4);
    await expect(main.getByText("Beatriz Albuquerque").first()).toBeVisible();
    await expect(main.getByText("Rodrigo Mendes da Fonte").first()).toBeVisible();
    await expect(main.getByText("Ana Costa").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Convidar Membro" })
    ).toBeVisible();
  });

  test("busca por nome ou e-mail", async ({ page }) => {
    const main = page.getByRole("main");
    await main.getByLabel("Buscar membro por nome ou e-mail").fill("rodrigo");

    await expect(main.getByText("Rodrigo Mendes da Fonte").first()).toBeVisible();
    await expect(main.getByText("Beatriz Albuquerque")).toHaveCount(0);
    await expect(main.getByText("Ana Costa")).toHaveCount(0);
  });

  test("filtra a tabela ao clicar no card da equipe", async ({ page }) => {
    const main = page.getByRole("main");
    await main.getByRole("button", { name: /Design UI\/UX/ }).click();

    await expect(main.getByText("Beatriz Albuquerque").first()).toBeVisible();
    await expect(main.getByText("Larissa Valença")).toHaveCount(0);
  });
});

test.describe("Equipe & Parceiros (escopo de projeto)", () => {
  test("lista apenas os membros do projeto, com o convite disponível", async ({
    page,
  }) => {
    await entrar(page, `/app/p/${PROJETO_ID}/team`);
    const main = page.getByRole("main");

    await expect(
      main.getByRole("heading", { name: "Equipe & Parceiros", level: 1 })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Convidar Membro" })
    ).toBeVisible();
    await expect(
      main.getByRole("searchbox", { name: "Buscar membro por nome ou e-mail" })
    ).toBeVisible();
  });
});
