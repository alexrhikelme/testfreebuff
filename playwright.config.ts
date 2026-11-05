import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta (e2e) com Playwright.
 *
 * A suíte sobe o app Vite em uma porta isolada (5199) com `--mode test`,
 * o que força o protótipo em memória (`getBackendMode() === "local"`) —
 * exatamente o mesmo modo usado pelo Vitest. Assim os testes não dependem
 * de backend, credenciais nem de `VITE_CONVEX_URL`.
 *
 * Para rodar contra um servidor já no ar (por exemplo o preview gerenciado
 * do Freebuff), basta definir `E2E_BASE_URL`; nesse caso o webServer é
 * desligado e nenhuma porta é ocupada.
 */
const PORT = 5199;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: BASE_URL,
    locale: "pt-BR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `bunx vite --mode test --port ${PORT} --strictPort --host 127.0.0.1`,
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
        stdout: "ignore",
        stderr: "pipe",
      },
});
