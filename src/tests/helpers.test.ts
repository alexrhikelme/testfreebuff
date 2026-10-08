import { describe, it, expect } from "vitest";
import { formatRelativeTime, isRecentlyUpdated } from "../features/notes/relativeTime";
import { sortNotesForColumn, STATUS_LABEL, STATUS_ORDER } from "../features/notes/NoteStatusChip";
import type { Note } from "../features/notes/types";

const NOW = new Date("2026-09-17T12:00:00");

describe("formatRelativeTime", () => {
  it("retorna agora mesmo para menos de 1 minuto", () => {
    expect(formatRelativeTime("2026-09-17T11:59:40", NOW)).toBe("agora mesmo");
  });

  it("formata minutos", () => {
    expect(formatRelativeTime("2026-09-17T11:45:00", NOW)).toBe("há 15 min");
  });

  it("formata horas", () => {
    expect(formatRelativeTime("2026-09-17T09:00:00", NOW)).toBe("há 3h");
  });

  it("formata dias no plural", () => {
    expect(formatRelativeTime("2026-09-14T12:00:00", NOW)).toBe("há 3 dias");
  });

  it("formata meses", () => {
    expect(formatRelativeTime("2026-06-10T12:00:00", NOW)).toBe("há 3 meses");
  });

  it("retorna vazio para data inválida", () => {
    expect(formatRelativeTime("invalido", NOW)).toBe("");
  });
});

describe("isRecentlyUpdated", () => {
  it("considera recente dentro da janela de 12s", () => {
    expect(isRecentlyUpdated("2026-09-17T11:59:55", NOW)).toBe(true);
  });

  it("não considera recente fora da janela", () => {
    expect(isRecentlyUpdated("2026-09-17T11:00:00", NOW)).toBe(false);
  });

  it("não considera recente datas futuras", () => {
    expect(isRecentlyUpdated("2026-09-17T13:00:00", NOW)).toBe(false);
  });
});

describe("STATUS helpers", () => {
  it("tem 4 status na ordem esperada", () => {
    expect(STATUS_ORDER).toEqual([
      "not_started",
      "in_progress",
      "completed",
      "blocked",
    ]);
  });

  it("tem rótulo pt-BR para cada status", () => {
    for (const s of STATUS_ORDER) {
      expect(STATUS_LABEL[s]).toBeTruthy();
    }
  });
});

const mkNote = (id: string, over: Partial<Note> = {}): Note => ({
  id,
  title: `Nota ${id}`,
  content: "",
  status: "in_progress",
  tags: [],
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
  ...over,
});

describe("sortNotesForColumn (ordenação do Kanban)", () => {
  it("ordena pelo mapa de posições", () => {
    const notes = [mkNote("a"), mkNote("b"), mkNote("c")];
    const sorted = sortNotesForColumn(notes, { c: 0, a: 1, b: 2 });
    expect(sorted.map((n) => n.id)).toEqual(["c", "a", "b"]);
  });

  it("coloca notas sem posição no fim, estáveis por updatedAt desc", () => {
    const notes = [
      mkNote("sem1", { updatedAt: "2026-09-02T10:00:00Z" }),
      mkNote("pos", { updatedAt: "2026-09-01T10:00:00Z" }),
      mkNote("sem2", { updatedAt: "2026-09-03T10:00:00Z" }),
    ];
    const sorted = sortNotesForColumn(notes, { pos: 0 });
    expect(sorted.map((n) => n.id)).toEqual(["pos", "sem2", "sem1"]);
  });

  it("não muta o array original", () => {
    const notes = [mkNote("a"), mkNote("b")];
    sortNotesForColumn(notes, { b: 0 });
    expect(notes.map((n) => n.id)).toEqual(["a", "b"]);
  });
});
