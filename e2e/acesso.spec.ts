import { expect, test } from "@playwright/test";
import { entrar, PROJETO_ID } from "./apoio";

/**
 * Fluxo de entrada: rota protegida → /auth → volta para o destino original,
 * além das validações do formulário antes de autenticar.
 */
test.describe("Rota protegida e returnTo", () => {
  test("rota profunda sem sessão cai no /auth", async ({ page }) => {
    await page.goto(`/app/p/${PROJETO_ID}/notes`);

    await expect(
      page.getByRole("heading", { name: "Acesse sua conta" })
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("após o login o usuário volta para a rota que tentava abrir", async ({
    page,
  }) => {
    await entrar(page, `/app/p/${PROJETO_ID}/notes`);

    await expect(page.getByRole("heading", { name: "Kanban", level: 1 })).toBeVisible();
    await expect(page).toHaveURL(
      new RegExp(`/app/p/${PROJETO_ID}/notes$`)
    );
  });
});

test.describe("Validações do formulário de acesso", () => {
  test("exige e-mail, senha e nome (criação) antes de autenticar", async ({
    page,
  }) => {
    await page.goto("/auth");
    const submit = page.locator('button[type="submit"]');

    // 1) sem e-mail.
    await submit.click();
    await expect(page.getByText("Informe o e-mail.")).toBeVisible();

    // 2) com e-mail, sem senha.
    await page.getByPlaceholder("ana@unicap.br").fill("ana@unicap.br");
    await submit.click();
    await expect(page.getByText("Informe a senha.")).toBeVisible();

    // 3) aba Criar conta, sem nome.
    await page.getByRole("button", { name: "Criar conta" }).click();
    await submit.click();
    await expect(page.getByText("Informe seu nome.")).toBeVisible();

    // 4) senha curta na criação.
    await page.getByPlaceholder("Ana Costa").fill("Ana Costa");
    await page.getByPlaceholder("••••••••").fill("1234567");
    await submit.click();
    await expect(
      page.getByText("A senha deve ter pelo menos 8 caracteres.")
    ).toBeVisible();
  });

  test("divulga a conta de teste dos desenvolvedores", async ({ page }) => {
    await page.goto("/auth");
    await expect(
      page.getByText(/Conta de teste dos desenvolvedores/)
    ).toBeVisible();
    await expect(page.getByText(/ana@unicap\.br/)).toBeVisible();
    await expect(page.getByText(/Senha1234/)).toBeVisible();
  });

  test("credenciais inválidas mostram erro e não autenticam", async ({ page }) => {
    await page.goto("/auth");
    await page.getByPlaceholder("ana@unicap.br").fill("ana@unicap.br");
    await page.getByPlaceholder("••••••••").fill("senha-errada");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
  });
});
