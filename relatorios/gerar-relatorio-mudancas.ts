import { chromium } from "@playwright/test";
import path from "node:path";

/**
 * Gera o PDF do relatório de mudanças de 09/11/2026 a partir do HTML.
 *
 * Uso: `bun relatorios/gerar-relatorio-mudancas.ts`
 */
const DIR = import.meta.dir;
const HTML = path.join(DIR, "relatorio-mudancas-2026-11-09.html");
const PDF = path.join(DIR, "relatorio-mudancas-2026-11-09.pdf");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
await page.goto(`file://${HTML}`, { waitUntil: "load" });
await page.emulateMedia({ media: "print" });

await page.pdf({
  path: PDF,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `
    <div style="width:100%;padding:0 14mm;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:7px;color:#7a8a84;display:flex;justify-content:space-between;letter-spacing:0.04em;">
      <span>Lab Notes · Dashboards · Relatório de mudanças · 09/11/2026</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
  margin: { top: "12mm", bottom: "15mm", left: "14mm", right: "14mm" },
});

await browser.close();

console.log(`PDF: ${PDF}`);
