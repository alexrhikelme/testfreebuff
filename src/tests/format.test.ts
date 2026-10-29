import { describe, it, expect } from "vitest";
import {
  formatDayMonth,
  formatPeriodShort,
  hashString,
  noteCode,
  initialsOf,
  avatarClasses,
  tagClasses,
  formatDate,
} from "../features/notes/format";

/**
 * Helpers puros de formatação dos cartões: datas curtas, período, código
 * da nota, iniciais e cores determinísticas (avatar/tag).
 */

describe("formatDayMonth", () => {
  it("formata dia e mês curto", () => {
    expect(formatDayMonth("2026-10-28")).toBe("28 Out");
    expect(formatDayMonth("2026-01-05")).toBe("5 Jan");
    expect(formatDayMonth("2026-12-31")).toBe("31 Dez");
  });

  it("devolve a entrada quando não é data ISO válida", () => {
    expect(formatDayMonth("abc")).toBe("abc");
    expect(formatDayMonth("2026-13")).toBe("2026-13");
  });
});

describe("formatPeriodShort", () => {
  it("mostra o intervalo completo com início e prazo", () => {
    expect(formatPeriodShort("2026-10-20", "2026-10-25")).toBe("20 Out – 25 Out");
  });

  it("mostra só o prazo quando não há início", () => {
    expect(formatPeriodShort(undefined, "2026-10-25")).toBe("25 Out");
  });

  it("mostra só o início quando não há prazo", () => {
    expect(formatPeriodShort("2026-10-20", undefined)).toBe("Início 20 Out");
  });

  it("mostra 'Sem prazo' sem datas", () => {
    expect(formatPeriodShort()).toBe("Sem prazo");
    expect(formatPeriodShort(undefined, undefined)).toBe("Sem prazo");
  });
});

describe("hashString / noteCode", () => {
  it("hash é determinístico, não negativo e varia com a entrada", () => {
    expect(hashString("dash-q3")).toBe(hashString("dash-q3"));
    expect(hashString("dash-q3")).not.toBe(hashString("dash-sprint42"));
    expect(hashString("qualquer coisa")).toBeGreaterThanOrEqual(0);
    expect(hashString("")).toBe(0);
  });

  it("noteCode gera código estável no formato #SPR-nnn", () => {
    const code = noteCode("note-abc");
    expect(code).toBe(noteCode("note-abc"));
    expect(code).toMatch(/^#SPR-\d{3}$/);
    expect(Number(code.slice(5))).toBeGreaterThanOrEqual(100);
    expect(Number(code.slice(5))).toBeLessThanOrEqual(999);
  });

  it("ids diferentes geram códigos estáveis (mesmo que iguais)", () => {
    // Regra do domínio: o código é derivado do id — não precisa ser único.
    expect(noteCode("a")).toMatch(/^#SPR-\d{3}$/);
    expect(noteCode("b")).toMatch(/^#SPR-\d{3}$/);
  });
});

describe("initialsOf", () => {
  it("usa inicial do primeiro e do último nome", () => {
    expect(initialsOf("Ana Costa")).toBe("AC");
    expect(initialsOf("João da Silva")).toBe("JS");
  });

  it("usa as duas primeiras letras com um nome só", () => {
    expect(initialsOf("Beatriz")).toBe("BE");
    expect(initialsOf("ana")).toBe("AN");
  });

  it("ignora espaços extras", () => {
    expect(initialsOf("  Carlos   Eduardo  ")).toBe("CE");
  });

  it("retorna '?' sem nome", () => {
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("   ")).toBe("?");
  });
});

describe("avatarClasses / tagClasses", () => {
  it("são determinísticos por nome/etiqueta", () => {
    expect(avatarClasses("Ana Costa")).toBe(avatarClasses("Ana Costa"));
    expect(avatarClasses("Ana Costa")).not.toBe(avatarClasses("Bruno Lima"));
    expect(tagClasses("pesquisa")).toBe(tagClasses("pesquisa"));
  });

  it("sempre retornam classes do tema", () => {
    for (const name of ["Ana", "Bruno Lima", "", "???"]) {
      expect(avatarClasses(name)).toMatch(/bg-\S+/);
    }
    expect(tagClasses("urgente")).toMatch(/bg-\S+/);
  });
});

describe("formatDate", () => {
  it("formata ISO como data curta pt-BR", () => {
    const iso = new Date(2026, 9, 28).toISOString(); // 28 Out 2026 (local)
    expect(formatDate(iso)).toBe("28/10/2026");
  });

  it("devolve o valor cru quando a data é inválida", () => {
    expect(formatDate("nao-e-data")).toBe("nao-e-data");
  });
});
