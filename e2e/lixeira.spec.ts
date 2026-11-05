import { expect, test } from "@playwright/test";
import { entrar, PROJETO_ID } from "./apoio";

/**
 * Lixeira: contagens por tipo, filtro por categoria, busca por título e
 * restauração de item com toast de confirmação.
 */
const LIXEIRA = `/app/p/${PROJETO_ID}/trash`;

test.describe("Lixeira", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, LIXEIRA);
    await expect(page.getByRole("heading", { name: "Lixeira", level: 1 })).toBeVisible();
  });

  test("renderiza contagens e os 6 itens excluídos", async ({ page }) => {
    const main = page.getByRole("main");

    await expect(main.getByRole("button", { name: /Todos/ })).toContainText("6");
    await expect(main.getByRole("button", { name: /Projetos/ })).toContainText("3");
    await expect(main.getByRole("button", { name: /Documentos/ })).toContainText("3");
    await expect(main.getByRole("listitem")).toHaveCount(6);
    await expect(
      main.getByText("App Realidade Aumentada Museu UNICAP")
    ).toBeVisible();
    await expect(
      main.getByText("Briefing Técnico - Integração SSO Unicap")
    ).toBeVisible();
  });

  test("filtra por Projetos e por Documentos", async ({ page }) => {
    const main = page.getByRole("main");

    await main.getByRole("button", { name: /Projetos/ }).click();
    await expect(main.getByRole("listitem")).toHaveCount(3);
    await expect(
      main.getByText("Briefing Técnico - Integração SSO Unicap")
    ).toHaveCount(0);

    await main.getByRole("button", { name: /Documentos/ }).click();
    await expect(main.getByRole("listitem")).toHaveCount(3);
    await expect(
      main.getByText("App Realidade Aumentada Museu UNICAP")
    ).toHaveCount(0);
  });

  test("busca por título na lixeira", async ({ page }) => {
    const main = page.getByRole("main");

    await main.getByLabel("Buscar na lixeira").fill("hackathon");
    await expect(main.getByRole("listitem")).toHaveCount(1);
    await expect(
      main.getByText("Portal de Inscrições Hackathon 2024")
    ).toBeVisible();
  });

  test("restaura um item (remove da lixeira com toast)", async ({ page }) => {
    const main = page.getByRole("main");
    await expect(main.getByRole("listitem")).toHaveCount(6);

    await main
      .getByRole("button", { name: "Restaurar", exact: true })
      .first()
      .click();

    await expect(main.getByRole("listitem")).toHaveCount(5);
    await expect(
      main.getByText("App Realidade Aumentada Museu UNICAP")
    ).toHaveCount(0);
    await expect(page.getByText(/restaurado/)).toBeVisible();
  });
});
