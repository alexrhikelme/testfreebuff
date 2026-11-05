import { expect, type Page } from "@playwright/test";

/** Projeto semente usado pela maioria das telas. */
export const PROJETO_ID = "dash-q3";

/**
 * Abre `destino` e conclui o login do modo local.
 *
 * Sem sessão, o roteador manda para /auth preservando o destino em
 * `location.state.from`; depois do login o app volta para a rota pedida.
 */
export async function entrar(page: Page, destino = "/app"): Promise<void> {
  await page.goto(destino);
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" })
  ).toBeVisible();

  await page.getByPlaceholder("ana@unicap.br").fill("ana@lab.local");
  await page.getByPlaceholder("••••••••").fill("senha123");
  await page.locator('button[type="submit"]').click();

  await expect(page).toHaveURL(new RegExp(`${escapeRegExp(destino)}$`), {
    timeout: 10_000,
  });
}

/**
 * Cria uma anotação pelo modal do Kanban.
 *
 * No protótipo local o projeto começa sem anotações, e o quadro só é
 * renderizado quando existe pelo menos uma — por isso este passo é
 * pré-requisito das asserções sobre colunas/sprints.
 */
export async function criarNota(page: Page, titulo: string): Promise<void> {
  await page.getByRole("button", { name: "Nova Anotação" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova anotação" });
  await dialog.getByPlaceholder("Ex: Calibrar pipetas").fill(titulo);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("heading", { name: titulo })).toBeVisible();
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}
