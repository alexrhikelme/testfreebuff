import { chromium } from "@playwright/test";
import path from "node:path";

/**
 * Gera o relatório em PDF a partir de `relatorio-testes.html`.
 *
 * 1. Renderiza `evidencia-pipeline.html` e salva como PNG (evidência).
 * 2. Abre o relatório e imprime em A4, com as cores de fundo preservadas.
 *
 * Uso: `bun relatorios/gerar-relatorio.ts`
 */
const DIR = import.meta.dir;
const EVIDENCIA_HTML = path.join(DIR, "evidencia-pipeline.html");
const EVIDENCIA_PNG = path.join(DIR, "evidencia-pipeline.png");
const RELATORIO_HTML = path.join(DIR, "relatorio-testes.html");
const RELATORIO_PDF = path.join(DIR, "relatorio-testes-automatizados.pdf");

const browser = await chromium.launch();

const painel = await browser.newPage({
  viewport: { width: 1000, height: 470 },
  deviceScaleFactor: 2,
});
await painel.goto(`file://${EVIDENCIA_HTML}`);
await painel.screenshot({ path: EVIDENCIA_PNG, fullPage: true });
await painel.close();

const pagina = await browser.newPage();
await pagina.goto(`file://${RELATORIO_HTML}`, { waitUntil: "load" });
await pagina.pdf({
  path: RELATORIO_PDF,
  format: "A4",
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();

console.log(`PNG: ${EVIDENCIA_PNG}`);
console.log(`PDF: ${RELATORIO_PDF}`);
