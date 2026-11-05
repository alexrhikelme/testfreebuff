import { expect, test } from "@playwright/test";
import { criarNota, entrar, PROJETO_ID } from "./apoio";

/**
 * Montagem de sprints no Kanban: o quadro não para nas 4 colunas base —
 * o usuário cria, renomeia e exclui sprints, e a configuração sobrevive a
 * um recarregamento da página (guardada no navegador).
 *
 * O projeto começa sem anotações no protótipo local e o quadro só aparece
 * quando existe alguma, então cada teste cria uma nota primeiro.
 */
const NOTAS = `/app/p/${PROJETO_ID}/notes`;

test.describe("Kanban — sprints", () => {
  test.beforeEach(async ({ page }) => {
    await entrar(page, NOTAS);
    await expect(
      page.getByRole("heading", { name: "Kanban", level: 1 })
    ).toBeVisible();
  });

  test("começa com as 4 colunas base e cria um sprint além delas", async ({
    page,
  }) => {
    await criarNota(page, "Calibrar pipetas");

    for (const titulo of ["Sprint 1", "Sprint 2", "Sprint 3", "Sprint 4"]) {
      await expect(
        page.getByRole("region", { name: `Coluna ${titulo}` })
      ).toBeVisible();
    }
    await expect(
      page.getByRole("region", { name: "Coluna Sprint 5" })
    ).toHaveCount(0);

    await page.getByRole("button", { name: /Nova sprint/ }).click();

    const input = page.getByLabel("Renomear coluna Sprint 5");
    await input.fill("Sprint 5 — Entrega");
    await input.press("Enter");

    await expect(
      page.getByRole("region", { name: "Coluna Sprint 5 — Entrega" })
    ).toBeVisible();
  });

  test("a sprint criada sobrevive ao recarregamento da página", async ({
    page,
  }) => {
    await criarNota(page, "Primeira nota");
    await page.getByRole("button", { name: /Nova sprint/ }).click();
    const input = page.getByLabel("Renomear coluna Sprint 5");
    await input.fill("Sprint de homologação");
    await input.press("Enter");
    await expect(
      page.getByRole("region", { name: "Coluna Sprint de homologação" })
    ).toBeVisible();

    // A sessão local é em memória: recarregar exige entrar de novo. A
    // configuração das sprints vem do localStorage e deve continuar lá.
    await entrar(page, NOTAS);
    await criarNota(page, "Nota depois do recarregamento");
    await expect(
      page.getByRole("region", { name: "Coluna Sprint de homologação" })
    ).toBeVisible();
  });

  test("excluir o sprint pede confirmação e remove a coluna", async ({
    page,
  }) => {
    await criarNota(page, "Nota do sprint descartável");
    await page.getByRole("button", { name: /Nova sprint/ }).click();
    const input = page.getByLabel("Renomear coluna Sprint 5");
    await input.fill("Sprint descartável");
    await input.press("Enter");

    await page
      .getByRole("button", { name: "Excluir sprint Sprint descartável" })
      .click();

    const dialog = page.getByRole("dialog", { name: "Excluir sprint?" });
    await expect(dialog).toContainText("nenhuma é apagada");
    await dialog.getByRole("button", { name: "Excluir" }).click();

    await expect(
      page.getByRole("region", { name: "Coluna Sprint descartável" })
    ).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Coluna Sprint 1" })
    ).toBeVisible();
  });
});
