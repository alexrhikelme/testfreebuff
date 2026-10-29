import { describe, it, expect } from "vitest";
import { TEMPLATES, TAB_LABEL, type TemplateTab } from "../features/templates";

/**
 * Sprint 11/“pente fino” — catálogo de Templates resumido: descrições e
 * corpos curtos para leitura rápida, com as 4 abas cobertas.
 */

const TABS = Object.keys(TAB_LABEL) as TemplateTab[];

const ICONS = new Set(["board", "file", "palette", "gamepad", "users", "check"]);

describe("Catálogo de templates", () => {
  it("tem os 6 modelos com ids únicos", () => {
    expect(TEMPLATES).toHaveLength(6);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
  });

  it("usa apenas abas válidas e cobre as 4 abas do catálogo", () => {
    for (const t of TEMPLATES) {
      expect(TABS).toContain(t.tab);
    }
    for (const tab of TABS) {
      expect(TEMPLATES.some((t) => t.tab === tab)).toBe(true);
    }
  });

  it("TAB_LABEL nomeia todas as abas usadas", () => {
    expect(Object.keys(TAB_LABEL).sort()).toEqual(
      [...new Set(TEMPLATES.map((t) => t.tab))].sort()
    );
    expect(TAB_LABEL.gestao).toBe("Gestão & Scrum");
    expect(TAB_LABEL.documentos).toBe("Documentos & PRD");
    expect(TAB_LABEL.design).toBe("Design & UX");
    expect(TAB_LABEL.jogos).toBe("Jogos & VR");
  });

  it("cada modelo tem título, categoria, autor, corpo e ícone válidos", () => {
    for (const t of TEMPLATES) {
      expect(t.title.trim().length).toBeGreaterThan(0);
      expect(t.categoryLabel.trim().length).toBeGreaterThan(0);
      expect(t.author.trim().length).toBeGreaterThan(0);
      expect(t.body.trim().length).toBeGreaterThan(0);
      expect(ICONS.has(t.icon)).toBe(true);
    }
  });

  it("descrições ficam resumidas (uma frase curta)", () => {
    for (const t of TEMPLATES) {
      expect(t.description.length).toBeLessThanOrEqual(90);
      expect(t.description.endsWith(".")).toBe(true);
    }
  });

  it("corpos ficam resumidos (até 4 linhas curtas)", () => {
    for (const t of TEMPLATES) {
      const lines = t.body.split("\n");
      expect(lines.length).toBeLessThanOrEqual(4);
      for (const line of lines) {
        expect(line.length).toBeLessThanOrEqual(120);
      }
    }
  });
});
