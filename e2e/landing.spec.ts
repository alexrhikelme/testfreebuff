import { expect, test } from "@playwright/test";

/**
 * Landing pública (rota /): proposta do produto e caminhos para
 * autenticação e demonstração.
 */
test.describe("Landing page", () => {
  test("apresenta a proposta e aponta para /auth e /app", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Anotações, projetos e dashboards em um só lugar"
    );

    await expect(page.getByRole("link", { name: "Começar agora" })).toHaveAttribute(
      "href",
      "/auth"
    );
    await expect(
      page.getByRole("link", { name: "Ver demonstração" })
    ).toHaveAttribute("href", "/app");
    await expect(
      page.getByRole("link", { name: "Entrar" }).first()
    ).toHaveAttribute("href", "/auth");
  });

  test("mostra os diferenciais do produto", async ({ page }) => {
    await page.goto("/");

    for (const titulo of [
      "Anotações estruturadas",
      "Dashboards colaborativos",
      "Visualizações flexíveis",
    ]) {
      await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
    }
  });

  test("'Ver demonstração' sem sessão leva para a autenticação", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver demonstração" }).click();

    await expect(page).toHaveURL(/\/auth$/);
    await expect(
      page.getByRole("heading", { name: "Acesse sua conta" })
    ).toBeVisible();
  });
});
