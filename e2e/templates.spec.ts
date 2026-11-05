import { expect, test } from "@playwright/test";
import { entrar, PROJETO_ID } from "./apoio";

/**
 * Templates: catálogo completo, filtro por categoria, busca por texto e
 * criação de anotação a partir de um modelo.
 */
const TEMPLATES = `/app/p/${PROJETO_ID}/templates`;

const MODELOS = [
  "Sprint Board Completo",
  "PRD Técnico & Arquitetura",
  "Guia de Tokens & Componentes",
  "Game Design Document (GDD)",
  "Pesquisa & Priorização RICE",
  "Retrospectiva & Revisão",
];

test.describe("Templates", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, TEMPLATES);
    await expect(page.getByRole("heading", { name: "Templates", level: 1 })).toBeVisible();
  });

  test("renderiza os 6 modelos do catálogo", async ({ page }) => {
    for (const modelo of MODELOS) {
      await expect(
        page.getByRole("heading", { name: modelo, level: 2 })
      ).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /Usar modelo/ })).toHaveCount(6);
  });

  test("filtra por categoria na aba Gestão & Scrum", async ({ page }) => {
    await page.getByRole("button", { name: "Gestão & Scrum" }).click();

    await expect(
      page.getByRole("heading", { name: "Sprint Board Completo", level: 2 })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Game Design Document (GDD)", level: 2 })
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Usar modelo/ })).toHaveCount(2);
  });

  test("busca template por texto", async ({ page }) => {
    await page.getByLabel("Buscar template").fill("GDD");

    await expect(page.getByRole("button", { name: /Usar modelo/ })).toHaveCount(1);
    await expect(
      page.getByRole("heading", { name: "Game Design Document (GDD)", level: 2 })
    ).toBeVisible();
  });

  test("'Usar modelo' cria a anotação e mostra toast", async ({ page }) => {
    await page.getByRole("button", { name: /Usar modelo/ }).first().click();
    await expect(page.getByText(/aplicado/)).toBeVisible();
  });
});
